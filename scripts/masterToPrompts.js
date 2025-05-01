// Requires: npm install openai dotenv
import { config } from 'dotenv';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';

config(); // Load .env

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generatePrompt() {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1', // or 'gpt-4.1' if supported
      temperature: 0.55,
      top_p: 0.7,
      max_tokens: 18000,
      messages: [
        {
          role: 'system',
          content: `
Objective
Create a prompt which can be used to generate a summary. The summary should be clear, engaging and fully written of the specified book.

Requirements:

1. Length & Readability:
	•	Target 22,000–25,000 characters (including spaces).
	•	Use simple, natural, human language — easy to understand for a wide audience.
	•	Avoid jargon or complex vocabulary unless absolutely necessary to explain a key concept or idea. If a simpler word can convey the meaning, prefer the simpler option. If specific jargon is critical for understanding, include it naturally with clear context. Avoid an academic tone or overly poetic expressions.
	•	Important: Divide the summary chapter-wise based on the original structure. Adjust chapter length dynamically — expand important chapters if needed, condense minor ones naturally. Keep the range of 8 - 12 chapters. If topic doesn't require expansion then keep chapters low or if there are too many details, then select the upper range

2. Originality & Clarity:
	•	Do not copy original phrases or chapter titles; rephrase everything.
	•	Preserve the logical flow of concepts as in the original book.
  •	Avoid using the author's name in the summary.
  •	Avoid using the word - "The book" in summary. Instead, reference it to the summary like, "In this summary"

3. Content Coverage:
	•	Cover all key ideas, insights, principles, methods, techniques and takeaways.
	•	Generalize real examples or stories from the book to explain concepts.
	•	Make sure the summary is standalone — valuable even without reading the full book.
	•	Vary sentence structure — use pronouns naturally to avoid repetition (e.g., he, she, they).

4. Tone & Style:
  •	Aim for a natural, engaging summary
	•	Write in a friendly, reflective, and guiding tone.
	•	Avoid addressing the reader directly; Use a combination of second-person and  third-person voice. Also, avoid phrases like "reader" to whenever possible and try to personalise with the reader
	•	Humanize the narration to make it engaging and flowing.

5. Summary Layout:
    • Hook & Relevance: Open with why the book matters today—maybe a bold question or promise of benefits—but only if it fits naturally.
    • Narrative Sections: Cover each core idea in its own mini-section, but don’t feel forced to label or chunk them rigidly.
    • Anecdotes & Examples: Bring concepts to life with vivid stories or historical figures. Use dialogue or sensory details if they add color. Do not mention it directly like "here is an anecdote to explain in detail" 
    • Actionable Advice: Where the book gives clear techniques, capture them in 2–4 concise bullets—else weave tips into the prose.
    • Quotes: Slip in one or two memorable quotations to reinforce authenticity when it feels seamless.
    • Warmth & Engagement: Keep a friendly, empathetic voice.
    •	Adjust structure wherever it makes the narrative smoother.

6. Genre-tone:
    {
          Tones: [
          {
            name: "Storytelling",
            tone: "Immersive Storytelling"
            
          }
        ]
    }

7. Intro & Conclusion
• Write a short Introduction (~500–700 characters): Set reader expectations. Briefly explain what they will learn and the importance of the book.
Write a short Conclusion (~500–700 characters): Recap the major insights. Reflect on the overall message practically and positively. 
  `,
        },
        {
          role: 'user',
          content: `

Objective
Create a prompt which can be used to generate a summary. The summary should be clear, engaging and fully written of the specified book. Use the "Storytelling" tone provided in the meta of genre-tone

### Title
**Rich Dad, Poor Dad by robert kiyosaki**
`,
        },
      ],
    });

    const result = completion.choices[0].message.content;

    const outputPath = path.join(process.cwd(), 'prompt.txt');
    fs.writeFileSync(outputPath, result, 'utf-8');

    console.log(`✅ Summary saved to: ${outputPath}`);
  } catch (err) {
    console.error('❌ Error generating summary:', err);
  }
}

generatePrompt();