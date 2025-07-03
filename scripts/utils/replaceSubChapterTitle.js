const fs = require('fs');
const path = require('path');

function fixNestedChapters(text) {
  const lines = text.split('\n');
  const fixedLines = [];

  const chapterRegex = /^##\s+Chapter\s+(\d+)\b(.*)$/i;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(chapterRegex);

    if (match) {
      // Check if this line is part of a sequence of consecutive "Chapter" lines
      const chapterBlock = [];
      let j = i;

      // Look ahead to collect the entire "consecutive chapter block"
      while (j < lines.length) {
        const lookahead = lines[j];
        const lookaheadMatch = lookahead.match(chapterRegex);
        if (lookaheadMatch) {
          chapterBlock.push(lookaheadMatch[2].trim().replace(/\*\*/g, ''));
          j++;
        } else if (lines[j].trim() === '') {
          j++; // skip empty lines
        } else {
          break; // stop at first real content
        }
      }

      // If we found 2+ chapter lines together, treat them all as points
      if (chapterBlock.length >= 2) {
        chapterBlock.forEach((title, index) => {
          fixedLines.push(`**${index + 1} ${title}**`);
        });
        i = j;
        continue;
      } else {
        // It's just a single real chapter
        const title = match[2].trim().replace(/\*\*/g, '');
        fixedLines.push(`## Chapter ${match[1]} ${title}`);
        i++;
      }
    } else {
      fixedLines.push(line);
      i++;
    }
  }

  return fixedLines.join('\n');
}

// === Directory processing ===
const targetDir = path.resolve(__dirname, '../FinalAllSummaries'); // Your folder

fs.readdirSync(targetDir).forEach((file) => {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.md' || ext === '.txt') {
    const filePath = path.join(targetDir, file);
    const originalContent = fs.readFileSync(filePath, 'utf-8');
    const fixedContent = fixNestedChapters(originalContent);
    fs.writeFileSync(filePath, fixedContent, 'utf-8');
    console.log(`✅ Updated: ${file}`);
  }
});