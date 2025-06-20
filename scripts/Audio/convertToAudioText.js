import { AzureOpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: '2024-02-15-preview'
});

export async function convertTextToAudioOptimized(chunk, sectionType = 'chapter', options = {}) {
  const systemPrompt = getAudioOptimizationPrompt(sectionType, options);

  const response = await client.chat.completions.create({
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT_ID, // GPT-4 or GPT-4o
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: chunk }
    ],
    temperature: 0.5,
    max_tokens: 10000,
  });

  return response.choices[0].message.content.trim();
}

/**
 * Generate section-specific audio optimization prompts
 * @param {string} sectionType - Type of section (introduction, chapter, conclusion)
 * @param {Object} options - Additional options for customization
 * @returns {string} Optimized system prompt
 */
function getAudioOptimizationPrompt(sectionType) {
  const basePrompt = `You're a voice script editor. Rewrite the given summary text for audio narration. 
  Keep it warm, flowing, and easy to listen to. Do not use meta phrases like “this chapter discusses. Maintain the length of the input as same length of output, do not make it too much lengthy.`;

  const sectionNotes = {
    introduction: `Intro: Keep it clean and light. No need to add attention hooks.`,
    chapter: `Chapter: Follow the flow and structure closely. Make small adjustments only when needed.`,
    conclusion: `Conclusion: End clearly and smoothly, but don't insert summaries or wrap-up phrases.`,
  };

  return `${basePrompt}\n\n${sectionNotes[sectionType] || sectionNotes.chapter}`;
};