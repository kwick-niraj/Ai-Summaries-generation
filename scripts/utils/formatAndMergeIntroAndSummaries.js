const fs = require('fs');
const path = require('path');

// === CONFIGURATION ===
const summaryDir = './Final Summaries'; // Folder with original summaries
const introDir = './Intro'; // Folder with intro files
const outputDir = './FinalAllSummaries'; // Output folder for final cleaned summary

const noChapterFoundBookId = [], noIntroductionFound = []


// === Ensure output directory exists ===
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// === Helper functions ===

// Remove unwanted paragraphs
function cleanParagraphs(content) {
  return content
    .split('\n\n')
    .filter(para => {
      const trimmed = para.trim();
      return !(
        trimmed.startsWith('End of Part 1') ||
        trimmed.startsWith('In the end,') ||
        trimmed.startsWith('The journey continues in the next half,')
      );
    })
    .join('\n\n');
}


// Normalize chapter headings
function normalizeChapters(content) {
  const lines = content.split('\n');
  const newLines = [];

  const chapterRegex1 = /^##\s*(\d+)\.\s*(.+)$/;  // ## 1. Something
  const chapterRegex2 = /^###\s*(\d+)\.\s*(.+)$/; // ### 1. Something
  const chapterRegex3 = /^##\s*Chapter\s+(\d+):?\s*(.+)$/i; // ## Chapter X: Something
  const chapterRegex4 = /^###\s*Chapter\s+(\d+):?\s*(.+)$/i; // ### Chapter X: Something
  const chapterRegex5 = /^(\d+)\.\s*(.+)$/;        // 1. Something (standalone line)
  const chapterRegex6 = /^Chapter\s+(\d+):?\s*(.+)$/i; // Chapter X: Something (standalone line)
  const chapterRegex7 = /^##\s*Section\s+(\d+):?\s*(.+)$/i;  // ## Section X
  const chapterRegex8 = /^###\s*Section\s+(\d+):?\s*(.+)$/i; // ### Section X
  const chapterRegex9 = /^#\s*Section\s+(\d+):?\s*(.+)$/i;   // # Section X
  const chapterRegex10 = /^\*\*\s*Section\s+(\d+):?\s*(.+)\*\*$/i; // **Section X**
  const chapterRegex11 = /^\*\*\s*Chapter\s+(\d+):?\s*(.+)\*\*$/i;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // ### Chapter X: Something → ## Chapter X Something
    const match4 = line.match(chapterRegex4);
    if (match4) {
      const chapterNumber = match4[1];
      const chapterTitle = match4[2];
      newLines.push(`## Chapter ${chapterNumber} ${chapterTitle}`);
      continue;
    }

    // ## Chapter X: Something
    const match3 = line.match(chapterRegex3);
    if (match3) {
      const chapterNumber = match3[1];
      const chapterTitle = match3[2];
      newLines.push(`## Chapter ${chapterNumber} ${chapterTitle}`);
      continue;
    }

    // ### X. Something → ## Chapter X Something
    const match2 = line.match(chapterRegex2);
    if (match2) {
      const chapterNumber = match2[1];
      const chapterTitle = match2[2];
      newLines.push(`## Chapter ${chapterNumber} ${chapterTitle}`);
      continue;
    }

    // ## X. Something
    const match1 = line.match(chapterRegex1);
    if (match1) {
      const chapterNumber = match1[1];
      const chapterTitle = match1[2];
      newLines.push(`## Chapter ${chapterNumber} ${chapterTitle}`);
      continue;
    }

    // 1. Something (only if previous line empty)
    const match5 = line.match(chapterRegex5);
    if (match5 && i > 0 && lines[i - 1].trim() === '') {
      const chapterNumber = match5[1];
      const chapterTitle = match5[2];
      newLines.push(`## Chapter ${chapterNumber} ${chapterTitle}`);
      continue;
    }

    // Chapter X: Something (only if previous line empty)
    const match6 = line.match(chapterRegex6);
    if (match6 && i > 0 && lines[i - 1].trim() === '') {
      const chapterNumber = match6[1];
      const chapterTitle = match6[2];
      newLines.push(`## Chapter ${chapterNumber} ${chapterTitle}`);
      continue;
    }

    // ## Section X: Something
    const match7 = line.match(chapterRegex7);
    if (match7) {
      const chapterNumber = match7[1];
      const chapterTitle = match7[2];
      newLines.push(`## Chapter ${chapterNumber} ${chapterTitle}`);
      continue;
    }

    // ### Section X: Something
    const match8 = line.match(chapterRegex8);
    if (match8) {
      const chapterNumber = match8[1];
      const chapterTitle = match8[2];
      newLines.push(`## Chapter ${chapterNumber} ${chapterTitle}`);
      continue;
    }

    // # Section X: Something
    const match9 = line.match(chapterRegex9);
    if (match9) {
      const chapterNumber = match9[1];
      const chapterTitle = match9[2];
      newLines.push(`## Chapter ${chapterNumber} ${chapterTitle}`);
      continue;
    }

    // **Section X: Something**
    const match10 = line.match(chapterRegex10);
    if (match10) {
      const chapterNumber = match10[1];
      const chapterTitle = match10[2];
      newLines.push(`## Chapter ${chapterNumber} ${chapterTitle}`);
      continue;
    }

    // **Chapter X: Something**
    const match11 = line.match(chapterRegex11);
    if (match11) {
      const chapterNumber = match11[1];
      const chapterTitle = match11[2];
      newLines.push(`## Chapter ${chapterNumber} ${chapterTitle}`);
      continue;
    }

    // Normal line → keep as is
    newLines.push(lines[i]);
  }

  return newLines.join('\n');
}
// Remove everything before first chapter
function removeBeforeFirstChapter(content, file) {
  const chapterStartRegex = /^(##\s+Chapter\s+\d+)/im;
  const match = content.match(chapterStartRegex);

  if (!match) {
    console.warn(`⚠️ No Chapter found. ${file}`);
    noChapterFoundBookId.push(file);
    return content;
  }

  const index = content.indexOf(match[0]);
  return content.substring(index);
}

// Main process
fs.readdirSync(summaryDir).forEach(file => {
  const summaryFilePath = path.join(summaryDir, file);
  const introFilePath = path.join(introDir, file);

  if (fs.statSync(summaryFilePath).isFile()) {
    let summaryContent = fs.readFileSync(summaryFilePath, 'utf-8');

    // Step 1a: Clean paragraphs
    summaryContent = cleanParagraphs(summaryContent);

    // Step 1b: Normalize chapters
    summaryContent = normalizeChapters(summaryContent);

    // Step 1c: Remove everything before first chapter
    summaryContent = removeBeforeFirstChapter(summaryContent, file);

    // Step 2: Prepend Introduction
    let introContent = '';
    if (fs.existsSync(introFilePath)) {
      introContent = fs.readFileSync(introFilePath, 'utf-8').trim() + '\n\n';
    } else {
      console.warn(`⚠️ No matching Intro found for: ${file}`);
      noIntroductionFound.push(file);
    }

    const finalContent = introContent + summaryContent.trim();

    // Save to output folder
    const outputFilePath = path.join(outputDir, file);
    fs.writeFileSync(outputFilePath, finalContent, 'utf-8');

    console.log(`✅ Processed and saved → ${outputFilePath}`);
  }
});

console.log('noChapterFoundBookId', noChapterFoundBookId, '\n noIntroductionFound', noIntroductionFound);

console.log('🎉 All summaries processed.');