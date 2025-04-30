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
  "title": "The 1% Rule: How to Fall in Love with the Process and Achieve Your Wildest Dreams",
  "author": "Tommy Baker",
  "publication_date": "2018",
  "edition_analyzed": "Most recent standard edition",
  "genre": [
    "Self-Help",
    "Personal Development",
    "Productivity"
  ],
  "target_audience": [
    "Entrepreneurs",
    "Professionals seeking personal growth",
    "Individuals interested in goal achievement",
    "Readers of motivational and productivity literature"
  ],
  "core_themes": [
    "Consistent, incremental progress",
    "Focusing on process over outcome",
    "Overcoming overwhelm and procrastination",
    "Building sustainable habits",
    "Long-term vision and persistence"
  ],
  "primary_purpose": "To encourage readers to pursue their goals through small, daily improvements, emphasizing the power of the process over the pursuit of perfection or instant results.",
  "structure_format": {
    "narrative_style": "Conversational, motivational",
    "organization": "Thematic chapters with actionable steps and exercises",
    "features": [
      "Step-by-step frameworks",
      "Personal anecdotes",
      "Practical exercises"
    ]
  },
  "key_concepts_lessons": [
    "Pursuing 1% daily improvement leads to significant long-term results.",
    "Focusing on the process helps avoid overwhelm and builds momentum.",
    "Clarity of vision is essential, but action is what creates change.",
    "Sustainable success comes from consistency, not intensity.",
    "Small wins compound over time, creating exponential growth.",
    "Cultivating patience and embracing discomfort are key to progress."
  ],
  "style_tone": [
    "Inspirational",
    "Practical",
    "Encouraging"
  ],
  "notable_features": [
    "Emphasis on actionable daily steps",
    "Exercises to clarify vision and track progress",
    "Focus on mindset shifts for long-term achievement"
  ],
  "cultural_historical_context": "Emerging from the late-2010s trend toward process-oriented self-improvement, the book responds to the culture of instant gratification and the popularity of productivity hacks.",
  "reception_impact": [
    "Well-received in personal development circles",
    "Praised for its actionable advice and motivational style",
    "Referenced in productivity and coaching communities"
  ],
  "comparable_titles": [
    "Atomic Habits by James Clear",
    "The Slight Edge by Jeff Olson",
    "The Compound Effect by Darren Hardy"
  ]
}

const toneAndStructure =  {
  "structure_type": "framework_stepwise",
  "description": "Sequential summary of principles, rules, or habits using a clear, logical structure.",
  "structure": "Summarize the book using a structured, principle-by-principle flow. Each chapter should cover one or more related steps, ideas, or habits. Begin with a clear theme, then explain the concept using metaphors or simplified explanations. Maintain a logical order and use a calm, instructive tone written in third person."
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
