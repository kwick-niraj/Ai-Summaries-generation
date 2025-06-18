import { AzureOpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: '2024-02-15-preview'
});

export async function convertTextToAudioOptimized(chunk) {
  const systemPrompt = `You're a voice script editor. Rewrite the given summary text for audio narration. 
Keep it warm, flowing, and easy to listen to. Do not use meta phrases like “this chapter discusses.”`;

  const response = await client.chat.completions.create({
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT_ID, // GPT-4 or GPT-4o
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: chunk }
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  return response.choices[0].message.content.trim();
}