import fs from 'fs';

export function readMarkdownAndSplit(filePath, maxLength = 2000) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n');
  const chunks = [];
  let current = '';

  for (let line of lines) {
    if ((current + '\n' + line).length > maxLength) {
      chunks.push(current.trim());
      current = '';
    }
    current += line + '\n';
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}