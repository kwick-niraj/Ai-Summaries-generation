export function prepareAudioSAML(textChunk, isChapterStart = false) {
  const escapeXml = (str) =>
    str.replace(/&/g, '&amp;')
       .replace(/</g, '&lt;')
       .replace(/>/g, '&gt;')
       .replace(/"/g, '&quot;')
       .replace(/'/g, '&apos;');

  // Optional pause between chapters
  const pause = isChapterStart ? '<break time="500ms"/>' : '';

  // Example: Light rewrite for natural speech (basic cleanup)
  const cleanedText = textChunk
    .replace(/[\n\r]+/g, ' ')          // collapse newlines
    .replace(/\s{2,}/g, ' ')           // collapse extra spaces
    .replace(/([.?!])\s*(?=[A-Z])/g, '$1 ') // spacing after punctuation
    .replace(/e\.g\./g, 'for example')
    .replace(/i\.e\./g, 'that is');

  const escaped = escapeXml(cleanedText.trim());

  return `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="http://www.w3.org/2001/mstts"
       xml:lang="en-US">
  <voice name="en-US-JennyNeural">
    <mstts:express-as style="narration-professional">
      ${pause}
      ${escaped}
    </mstts:express-as>
  </voice>
</speak>`.trim();
};

export function splitIntoAudioChunks(fullText, limit = 2000) {
  const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > limit) {
      chunks.push(current.trim());
      current = '';
    }
    current += sentence + ' ';
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

export default {
  prepareAudioSAML,
  splitIntoAudioChunks
}