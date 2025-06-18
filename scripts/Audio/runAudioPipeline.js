import { readMarkdownAndSplit } from './utils/convertMarkdownToChunks.js';
import { convertTextToAudioOptimized } from './convertToAudioText.js';
import { generateOpenAITTS } from './generateTTS.js';

const bookId = '12';
const markdownPath = `./FinalAllSummaries/${bookId}.md`;
const outputDir = `./Audio/output/${bookId}`;

const chunks = readMarkdownAndSplit(markdownPath, 2000);

for (let i = 0; i < chunks.length; i++) {
  const originalChunk = chunks[i];
  const audioReadyText = await convertTextToAudioOptimized(originalChunk);

  const outputPath = `${outputDir}/ch${i + 1}.mp3`;
  await generateOpenAITTS({
    text: audioReadyText,
    outputPath,
    voice: 'nova' // or shimmer, alloy, etc.
  });
}