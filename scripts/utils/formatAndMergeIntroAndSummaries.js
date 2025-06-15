const fs = require('fs');
const path = require('path');

// === CONFIGURATION ===
const summaryDir = './Final Summaries';
const introDir = './Intro';
const outputDir = './FinalAllSummaries';

const noChapterFoundBookId = [];
const noIntroductionFound = [];
const endOfPartMatched = [];

// === Ensure output directory exists ===
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// === Helper: Normalize chapter headings
function normalizeChapters(content) {
  const lines = content.split('\n');
  const newLines = [];

  const regexList = [
    [/^##\s*(\d+)\.\s*(.+)$/, '## Chapter $1 $2'],
    [/^###\s*(\d+)\.\s*(.+)$/, '## Chapter $1 $2'],
    [/^##\s*Chapter\s+(\d+):?\s*(.+)$/i, '## Chapter $1 $2'],
    [/^###\s*Chapter\s+(\d+):?\s*(.+)$/i, '## Chapter $1 $2'],
    [/^(\d+)\.\s*(.+)$/, '## Chapter $1 $2'],
    [/^Chapter\s+(\d+):?\s*(.+)$/i, '## Chapter $1 $2'],
    [/^##\s*Section\s+(\d+):?\s*(.+)$/i, '## Chapter $1 $2'],
    [/^###\s*Section\s+(\d+):?\s*(.+)$/i, '## Chapter $1 $2'],
    [/^#\s*Section\s+(\d+):?\s*(.+)$/i, '## Chapter $1 $2'],
    [/^\*\*\s*Section\s+(\d+):?\s*(.+)\*\*$/i, '## Chapter $1 $2'],
    [/^\*\*\s*Chapter\s+(\d+):?\s*(.+)\*\*$/i, '## Chapter $1 $2']
  ];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    let matched = false;

    for (const [regex, replacement] of regexList) {
      const match = line.match(regex);
      if (match) {
        newLines.push(line.replace(regex, replacement));
        matched = true;
        break;
      }
    }

    if (!matched) newLines.push(lines[i]);
  }

  return newLines.join('\n');
}

// === Remove everything before first chapter
function removeBeforeFirstChapter(content, file) {
  const chapterStartRegex = /^##\s+Chapter\s+\d+/im;
  const match = content.match(chapterStartRegex);

  if (!match) {
    console.warn(`⚠️ No Chapter found. ${file}`);
    noChapterFoundBookId.push(file);
    return content;
  }

  const index = content.indexOf(match[0]);
  return content.substring(index);
}

// === Final cleaner: remove 'end of part' and trailing filler paragraphs
function removeEndingParagraphs(content, file) {
  const paragraphs = content.split('\n\n');
  const finalParagraphs = [];

  const endOfPartStrictRegex = /^\s*[*\[]*\s*End of\s+(Part\s+1|Part\s+One|First\s+Half|Part)[\]*]*\.?\s*$/i;
  const looseContinuation = /^\s*(This summary|This completes|This half|\(Chapters\s+\d+)/i;
  const trailingFillerRegex = /^(-{3,}|[*_]*here is|note:|certainly|due to platform constraints|in the next part|this half will|summary continues|the next section will)$/i;

  // New unwanted paragraph starters
  const unwantedParagraphStarters = [
    'In the end,',
    'The journey continues in the next half,'
  ];

  let matched = false;
  let skipNext = false;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim();

    if (skipNext) {
      skipNext = false;
      matched = true;
      continue;
    }

    if (endOfPartStrictRegex.test(para)) {
      const nextPara = paragraphs[i + 1] ? paragraphs[i + 1].trim() : '';
      if (looseContinuation.test(nextPara)) {
        skipNext = true;
      }
      matched = true;
      continue;
    }

    if (/End of\s+(Part\s+1|Part\s+One|First\s+Half|Part)/i.test(para)) {
      matched = true;
      continue;
    }

    if (trailingFillerRegex.test(para)) {
      matched = true;
      continue;
    }

    if (unwantedParagraphStarters.some((prefix) => para.startsWith(prefix))) {
      matched = true;
      continue;
    }

    finalParagraphs.push(para);
  };

  if (matched) {
    endOfPartMatched.push(file);
  }

  return finalParagraphs.join('\n\n').trim();
}
// === MAIN PROCESS ===
fs.readdirSync(summaryDir).forEach(file => {
  const summaryFilePath = path.join(summaryDir, file);
  const introFilePath = path.join(introDir, file);

  if (fs.statSync(summaryFilePath).isFile()) {
    let summaryContent = fs.readFileSync(summaryFilePath, 'utf-8');

    // Step 1: Normalize chapters
    summaryContent = normalizeChapters(summaryContent);

    // Step 2: Trim everything before the first chapter
    summaryContent = removeBeforeFirstChapter(summaryContent, file);

    // Step 3: Remove unwanted trailing and "end of part" paragraphs
    summaryContent = removeEndingParagraphs(summaryContent, file);

    // Step 4: Prepend Introduction
    let introContent = '';
    if (fs.existsSync(introFilePath)) {
      introContent = fs.readFileSync(introFilePath, 'utf-8').trim() + '\n\n';
    } else {
      console.warn(`⚠️ No matching Intro found for: ${file}`);
      noIntroductionFound.push(file);
    }

    const finalContent = introContent + summaryContent.trim();

    // Step 5: Save cleaned result
    const outputFilePath = path.join(outputDir, file);
    fs.writeFileSync(outputFilePath, finalContent, 'utf-8');
    console.log(`✅ Processed and saved → ${outputFilePath}`);
  }
});

// === LOGGING ===
console.log('\n📋 Summary Cleanup Report');
console.log('🚫 Skipped (no chapters):', noChapterFoundBookId.length);
console.log('📄 No intro found:', noIntroductionFound.length);
console.log('🧹 End-of-part paragraphs removed from:', endOfPartMatched.length);
if (endOfPartMatched.length > 0) {
  console.log('noIntroductionFound', noIntroductionFound, '\n noChapterFoundBookId', noChapterFoundBookId)
  // console.log('➡️ Files cleaned:', endOfPartMatched.join(', '));
}