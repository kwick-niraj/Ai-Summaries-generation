// utils/format-intro.js

function cleanIntroText(text) {
  if (!text) return '';

  let cleaned = text;

  // Remove any leading "Introduction" / "What you will get" headings (case-insensitive)
  cleaned = cleaned.replace(/^#+\s*Introduction\s*/i, '');
  cleaned = cleaned.replace(/^#+\s*What you will get out of this book\s*/i, '');
  cleaned = cleaned.replace(/^#+\s*What you will learn\s*/i, '');

  // Remove redundant "Here is..." lines
  cleaned = cleaned.replace(/Here is.*?:/gi, '');

  // Normalize blank lines (max 2 newlines)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim overall
  cleaned = cleaned.trim();

  return cleaned;
}

export default {
  cleanIntroText,
};