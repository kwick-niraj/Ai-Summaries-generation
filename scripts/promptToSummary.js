// Requires: npm install openai dotenv
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';

config(); // Load .env

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateSummaryFromPrompt() {
  try {
    // Read the prompt from file
    const promptPath = path.join(process.cwd(), 'prompt.txt');
    const userPrompt = fs.readFileSync(promptPath, 'utf-8');

    // Generate the summary using GPT
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1', // or 'gpt-4.1'
      temperature: 0,
      top_p: 0.5,
      max_tokens: 25000,
      messages: [
        {
          role: 'system',
          content: `You are an expert nonfiction book summarizer. Your task is to generate a longform, well-structured, humanized summary following all instructions provided. Generate the summary of at least 22,000 to 25,000 of characters.`,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const result = completion.choices[0].message.content;

    // Write the generated summary to a new file
    const outputPath = path.join(process.cwd(), 'summary_output.txt');
    fs.writeFileSync(outputPath, result, 'utf-8');

    console.log(`✅ Summary saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating summary:', error);
  }
}

generateSummaryFromPrompt();