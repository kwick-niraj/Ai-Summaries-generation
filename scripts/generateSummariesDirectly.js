// Requires: npm install openai dotenv
import { config } from 'dotenv';
import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { generateUserPrompt } from './generateUserPrompts.js'

config(); // Load .env

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const metaOfBook = {
  
    "title": "Rich Dad Poor Dad",
    "author": "Robert T. Kiyosaki",
    "publication_date": "1997",
    "edition_analyzed": "Most recent standard edition",
    "genre": [
      "Personal Finance",
      "Self-Help",
      "Business"
    ],
    "target_audience": [
      "Young adults and adults",
      "Individuals seeking financial education",
      "Aspiring entrepreneurs",
      "Those interested in wealth-building and personal development"
    ],
    "core_themes": [
      "Financial literacy",
      "The difference between assets and liabilities",
      "The importance of financial education",
      "Mindset differences between the wealthy and the poor",
      "Breaking free from the 'rat race'",
      "Entrepreneurship versus traditional employment"
    ],
    "primary_purpose": "To challenge conventional beliefs about money, advocate for financial education, and provide foundational principles for building wealth.",
    "structure_format": {
      "narrative_style": "Conversational, anecdotal",
      "organization": "Core lessons presented as chapters, contrasting two father figures ('Rich Dad' and 'Poor Dad')",
      "features": [
        "Personal stories",
        "Simple, accessible language",
        "Actionable mindset principles"
      ]
    },
    "key_concepts_lessons": [
      "The rich don't work for money: focus on acquiring assets rather than earning a salary.",
      "Understanding the difference between assets and liabilities is crucial for financial success.",
      "Mind your own business: build and own income-generating assets.",
      "The wealthy use corporations and tax laws to their advantage.",
      "Financial education and risk-taking open up opportunities to invent money.",
      "Value learning and skill development over job security."
    ],
    "style_tone": [
    ],
    "notable_features": [
      "Repetitive reinforcement of core principles",
      "Exercises and reflection questions for readers",
      "Focuses on mindset rather than specific investment advice"
    ],
    "cultural_historical_context": "Published during a period of economic growth in the late 1990s, the book resonated with a growing audience interested in entrepreneurship and financial independence.",
    "reception_impact": [
      "Bestseller status; over 32 million copies sold worldwide",
      "Spawned a series of follow-up books, seminars, and a financial education brand",
      "Celebrated for its simple, motivational message; criticized for oversimplification and lack of concrete financial guidance"
    ],
    "comparable_titles": [
      "The Millionaire Next Door by Thomas J. Stanley & William D. Danko",
      "Think and Grow Rich by Napoleon Hill",
      "The Total Money Makeover by Dave Ramsey"
    ]
  
}

const toneAndStructure =  {
  "structure_type": "story_wisdom",
  "description": "Narrative-style walkthrough using emotional, reflective storytelling to explain key ideas.",
  "structure": "Structure the summary as a flowing narrative that uses emotionally engaging storytelling to deliver key insights. Use broad, relatable scenarios to illustrate each key idea. You may use generalized, non-specific archetypes (e.g., “a manager,” “a shy student”), but avoid creating named characters or detailed fictional backstories. Include clear, paraphrased examples or everyday situations to support key concepts and make them more relatable. When the original book includes personal journeys or character-driven learning (e.g., through mentors, parents, or contrasting figures), anchor the narrative around an unnamed persona (e.g., 'a young boy', 'an early-career professional') and refer to other figures using relational roles (e.g., 'a mentor', 'a friend's father') instead of names. Avoid full retellings or fictional anecdotes. Use natural, third-person narration and keep the tone reflective, warm, and human."
};
const isFirstHalf = true
const userPrompt = generateUserPrompt(metaOfBook, toneAndStructure, isFirstHalf)

console.log('user prompt', userPrompt)

async function generatePrompt() {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1', // or 'gpt-4.1' if supported
      temperature: 0.5,
      top_p: 0,
      max_tokens: 25000,
      messages: [
        {
          role: 'system',
          content: `You are an expert nonfiction book summarizer.
      `

      // Your task is to generate a flowing, deeply paraphrased, chapter-wise summary of the book described in the user prompt.
        
      // Please follow these strict instructions:
      
      // • Structure the summary into 7–9 thematic chapters. Do NOT list original chapter numbers or names. Create your own concise, clear section titles.
      
      // • NOT use “you”, “the reader”, or reference the author by name.
      
      // • Integrate bullet points ONLY when describing clear actionable tools, not general ideas. Avoid bulleting in every chapter unless needed.
      
      // • Use natural transitions to ensure smooth flow across sections. The summary should feel like a continuous guided narrative.
      
      // • Paraphrase deeply — do not copy from the original text. Avoid jargon and academic tone.
      
      // • Add a short Introduction (~800–1000 characters) to set the book’s context and purpose. Add a short Conclusion (~800–1000 characters) to reflect on the message.
      
      // • Your summary must be between 22,000 and 25,000 characters long. Do not stop early.

      // • Structure it into 8–9 sections (including Introduction and Conclusion).

      // • Do not conclude until all sections are complete. If you reach a natural ending too soon, expand the remaining sections proportionally.  
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
    });

    const result = completion.choices[0].message.content;

    const outputPath = path.join(process.cwd(), './summaries-output.txt');
    fs.writeFileSync(outputPath, result, 'utf-8');

    console.log(`✅ Summary saved to: ${outputPath}`);
  } catch (err) {
    console.error('❌ Error generating summary:', err);
  }
}

generatePrompt();
