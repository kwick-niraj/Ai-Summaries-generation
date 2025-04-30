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
  "Title": "How to Talk to Anyone: 92 Little Tricks for Big Success in Relationships",
  "Author": "Leil Lowndes",
  "Publication Date": "2003",
  "Edition Analyzed": "Most recent standard edition",
  "Genre": [
    "Self-Help",
    "Communication",
    "Personal Development"
  ],
  "Target Audience": [
    "Young adults and adults",
    "Professionals seeking to improve social skills",
    "Individuals interested in networking",
    "Anyone wishing to build confidence in social situations"
  ],
  "Core Themes": [
    "Effective communication",
    "Building rapport and likability",
    "Social confidence",
    "Non-verbal communication",
    "Relationship-building in personal and professional life"
  ],
  "Primary Purpose": "To provide practical, actionable tips for improving social interactions, making a positive impression, and building meaningful relationships in both personal and professional settings.",
  "Structure & Format": {
    "Organization": "Divided into 92 short, standalone chapters—each presenting one specific tip or technique.",
    "Style": "Conversational, anecdotal, and direct.",
    "Features": [
      "Real-life examples",
      "Step-by-step strategies",
      "Memorable names for techniques"
    ]
  },
  "Key Concepts / Lessons": [
    "First impressions matter—master your body language and smile.",
    "Use small talk strategically to build rapport.",
    "Mirror others' communication styles to foster connection.",
    "Remember and use people’s names effectively.",
    "Ask open-ended questions to keep conversations flowing.",
    "Subtly compliment and show genuine interest.",
    "Handle awkward silences and social anxiety gracefully.",
    "Techniques for networking and making lasting professional contacts."
  ],
  "Style & Tone": [
    "Friendly",
    "Encouraging",
    "Accessible"
  ],
  "Notable Features": [
    "Easy-to-implement tips",
    "Memorable technique names (e.g., 'Sticky Eyes,' 'The Big-Baby Pivot')",
    "Focus on both verbal and non-verbal communication"
  ],
  "Cultural/Historical Context": "Published in the early 2000s, responding to growing demand for personal development and networking skills in a rapidly changing, interconnected world.",
  "Reception & Impact": [
    "Consistently popular among readers seeking practical communication advice.",
    "Praised for its straightforward, actionable tips.",
    "Criticized by some for being formulaic or oversimplified."
  ],
  "Comparable Titles": [
    "How to Win Friends and Influence People by Dale Carnegie",
    "The Fine Art of Small Talk by Debra Fine",
    "Crucial Conversations by Kerry Patterson et al."
  ]
};

const toneAndStructure = {
  "structure_type": "story_wisdom",
  "description": "Narrative-style walkthrough using emotional, reflective storytelling to explain key ideas.",
  "structure": "Structure the summary as a flowing narrative that uses emotionally engaging storytelling to deliver key insights. Use broad, relatable scenarios to illustrate each key idea. You may use generalized, non-specific archetypes (e.g., 'a manager', 'a shy student'), but avoid creating named characters or detailed fictional backstories. Include clear, paraphrased examples or everyday situations to support key concepts and make them more relatable. Avoid full retellings or fictional anecdotes. Use natural, third-person narration and keep the tone reflective, warm, and human."
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
        
        Your task is to generate a flowing, deeply paraphrased, chapter-wise summary of the book described in the user prompt.
        
        Please follow these strict instructions:
        
        • Structure the summary into 7–9 thematic chapters. Do NOT list original chapter numbers or names. Create your own concise, clear section titles.
        
        • Write in a neutral, third-person tone. Do NOT use “you”, “the reader”, or reference the author by name.
        
        • Integrate bullet points ONLY when describing clear actionable tools, not general ideas. Avoid bulleting in every chapter unless needed.
        
        • Use natural transitions to ensure smooth flow across sections. The summary should feel like a continuous guided narrative.
        
        • Paraphrase deeply — do not copy from the original text. Avoid jargon and academic tone.
        
        • Add a short Introduction (~800–1000 characters) to set the book’s context and purpose. Add a short Conclusion (~800–1000 characters) to reflect on the message.
        
        • Your summary must be between 22,000 and 25,000 characters long. Do not stop early.

        • Structure it into 8–9 sections (including Introduction and Conclusion).

        • Do not conclude until all sections are complete. If you reach a natural ending too soon, expand the remaining sections proportionally.        `
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
