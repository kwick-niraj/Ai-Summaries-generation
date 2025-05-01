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
  "title": "The Power of Your Subconscious Mind",
  "author": "Dr. Joseph Murphy",
  "publication_date": "1963",
  "edition_analyzed": "Most recent standard edition",
  "genre": [
    "Self-Help",
    "Personal Development",
    "Psychology",
    "Spirituality"
  ],
  "target_audience": [
    "Adults seeking personal growth",
    "Individuals interested in the mind-body connection",
    "Readers exploring self-improvement and positive thinking",
    "People interested in the power of belief and suggestion"
  ],
  "core_themes": [
    "The influence of the subconscious mind on behavior and outcomes",
    "The power of positive thinking and affirmations",
    "Visualization and mental imagery",
    "Healing and self-improvement through belief",
    "Overcoming negative thoughts and limiting beliefs"
  ],
  "primary_purpose": "To teach readers how to harness the power of their subconscious mind to achieve personal goals, improve well-being, and create positive changes in their lives.",
  "structure_format": {
    "narrative_style": "Instructional, anecdotal",
    "organization": "Thematic chapters focusing on different aspects of subconscious influence",
    "features": [
      "Case studies and real-life examples",
      "Practical exercises and affirmations",
      "Simple, accessible language"
    ]
  },
  "key_concepts_lessons": [
    "The subconscious mind accepts what it is told and acts upon it; thoughts and beliefs directly influence reality.",
    "Repetition of positive affirmations and visualization can reprogram the subconscious.",
    "Negative thinking and fear can create obstacles and even illness.",
    "Faith, gratitude, and forgiveness are powerful tools for transformation.",
    "Anyone can tap into the subconscious to solve problems, achieve goals, and experience healing."
  ],
  "style_tone": [
    "Encouraging",
    "Optimistic",
    "Practical",
    "Spiritual"
  ],
  "notable_features": [
    "Blends psychology with spiritual and metaphysical concepts",
    "Uses simple language and relatable stories",
    "Offers step-by-step techniques for mental conditioning"
  ],
  "cultural_historical_context": "Published during a mid-20th century surge in interest in self-help and positive thinking, influenced by both New Thought and mainstream psychology.",
  "reception_impact": [
    "Enduring bestseller, translated into multiple languages",
    "Widely cited in self-help literature and motivational circles",
    "Praised for its accessible approach to complex ideas",
    "Criticized by some for lack of scientific backing and overemphasis on positive thinking"
  ],
  "comparable_titles": [
    "Think and Grow Rich by Napoleon Hill",
    "The Secret by Rhonda Byrne",
    "As a Man Thinketh by James Allen"
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
