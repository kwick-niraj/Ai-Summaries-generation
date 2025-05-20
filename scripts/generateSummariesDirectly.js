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
  
  
    "title": "How to Talk to Anyone: 92 Little Tricks for Big Success in Relationships",
    "author": "Leil Lowndes",
    "publication_date": "2003",
    "edition_analyzed": "Most recent standard edition",
    "genre": [
      "Self-Help",
      "Communication",
      "Personal Development",
      "Social Skills"
    ],
    "target_audience": [
      "Adults seeking to improve social and communication skills",
      "Professionals aiming to network and build relationships",
      "Introverts and shy individuals",
      "Anyone interested in personal development and effective communication"
    ],
    "core_themes": [
      "Building rapport and likability",
      "Mastering verbal and non-verbal communication",
      "Confidence in social situations",
      "Networking and relationship-building",
      "Practical conversation techniques"
    ],
    "primary_purpose": "To provide readers with practical, easy-to-implement tips and techniques for making a positive impression, enhancing communication, and building successful relationships in both personal and professional settings.",
    "structure_format": {
      "narrative_style": "Conversational, accessible, and tip-based",
      "organization": "Divided into 92 short, actionable chapters, each focusing on a specific technique",
      "features": [
        "Real-life examples and scenarios",
        "Step-by-step instructions",
        "Quick-reference summaries"
      ]
    },
    "key_concepts_lessons": [
      "First impressions are powerful and can be managed with specific behaviors.",
      "Non-verbal cues—such as eye contact, body language, and gestures—are critical to effective communication.",
      "Small talk can be a gateway to deeper connections.",
      "Listening actively and showing genuine interest builds trust and rapport.",
      "Adapting your communication style to the context and audience increases effectiveness.",
      "Confidence and warmth make interactions more memorable and successful."
    ],
    "style_tone": [
    ],
    "notable_features": [
      "92 concise, actionable tips",
      "Focus on both business and social situations",
      "Emphasis on non-verbal as well as verbal communication",
      "Widely used by professionals, students, and anyone looking to enhance social skills"
    ],
    "cultural_historical_context": "Published in the early 2000s, the book responded to a growing demand for practical communication advice in an increasingly networked and socially dynamic world.",
    "reception_impact": [
      "Bestseller status, widely recommended in business and self-help circles",
      "Praised for its actionable, easy-to-follow advice",
      "Popular among professionals, students, and those seeking social confidence",
      "Some critics note the tips may feel formulaic or simplistic for advanced communicators"
    ],
    "comparable_titles": [
      "How to Win Friends and Influence People by Dale Carnegie",
      "Crucial Conversations by Kerry Patterson, Joseph Grenny, Ron McMillan, Al Switzler",
      "The Fine Art of Small Talk by Debra Fine"
    ]
  
}

const isFirstHalf = true
const userPrompt = generateUserPrompt(metaOfBook, isFirstHalf)

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
