import fs from 'fs';
import path from 'path';

// Function to clean trailing unwanted lines
function cleanSummaryText(summaryText) {
  const lines = summaryText.trim().split('\n');
  const chapterPattern = /^(##\s*\d+\.\s|[*]*\s*Chapter\s+\d+:)/i;  // Matches ## 1. or **Chapter 1:

  let startIndex = -1;
  let lastChapterIndex = -1;

  // Find the index of the first and last chapter lines
  lines.forEach((line, index) => {
    if (chapterPattern.test(line.trim())) {
      if (startIndex === -1) startIndex = index;
      lastChapterIndex = index;
    }
  });

  // If no chapters found, return everything
  if (startIndex === -1 || lastChapterIndex === -1) {
    return lines.join('\n').trim();
  }

  // Trim top: Start from the first chapter
  let cleanedLines = lines.slice(startIndex, lastChapterIndex + 1);

  // Add any following lines that do NOT match dashes or AI notes
  for (let i = lastChapterIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!/^(-{3,}|[*_]*here is|note:|certainly|due to platform constraints|in the next part|this half will|the following section|summary continues|the next section will)/i.test(line)) {
      cleanedLines.push(line);
    } else {
      // Skip AI generation lines or markdown separators
      break;
    }
  }

  return cleanedLines.join('\n').trim();
}

function formatChapterHeaders(summaryText) {
  // Regex to match lines like **Chapter 2: Title**
  const chapterRegex = /^\*\*Chapter\s+(\d+):\s+(.+?)\*\*/gm;

  // Replace them with Markdown ## headers
  return summaryText.replace(chapterRegex, (match, chapterNumber, chapterTitle) => {
    return `## Chapter ${chapterNumber}: ${chapterTitle}`;
  });
}

export default {
  cleanSummaryText,
  formatChapterHeaders
}