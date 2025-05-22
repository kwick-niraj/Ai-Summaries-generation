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

// Generate a deterministic seed based on book metadata
function generateSeedFromMetadata(meta, version = '1.0') {
  const seedString = `${meta.title}${meta.author}${meta.publication_date}${version}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

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
    "Young professionals and job seekers",
    "Introverts or shy individuals looking to gain confidence",
    "Businesspeople and networkers",
    "Anyone interested in building stronger relationships"
  ],
  "core_themes": [
    "Effective verbal and non-verbal communication",
    "Confidence in social situations",
    "Building rapport and likability",
    "Small talk as a foundation for deeper conversations",
    "Networking and relationship-building strategies"
  ],
  "primary_purpose": "To equip readers with a toolkit of practical, easy-to-use techniques for making positive impressions, communicating confidently, and building relationships in any social or professional context.",
  "structure_format": {
    "narrative_style": "Conversational, encouraging, and tip-oriented",
    "organization": "Divided into 92 brief chapters, each highlighting a single actionable technique or insight",
    "features": [
      "Step-by-step tips and strategies",
      "Real-life anecdotes and illustrative examples",
      "Clear summaries and takeaways"
    ]
  },
  "key_concepts_lessons": [
    "First impressions can be greatly improved with simple behavioral tweaks.",
    "Non-verbal communication (posture, eye contact, gestures) is as important as words.",
    "Small talk paves the way for connection—and can be learned.",
    "Actively listening and showing authentic interest strengthens relationships.",
    "Mirroring body language and tone builds rapport.",
    "Adapting your approach depending on context (social, professional, networking, etc.) succeeds more often.",
    "Practicing confidence and warmth is a catalyst for memorable interactions."
  ],
  "style_tone": [
    "Friendly",
    "Encouraging",
    "Accessible",
    "Practical",
    "Optimistic"
  ],
  "notable_features": [
    "92 stand-alone tips make the book easy to dip into or reference",
    "Coverage of both professional and personal communication",
    "Focus on both spoken and non-spoken signals",
    "Mixes psychological insight with actionable advice",
    "Widely used in sales, networking, and self-improvement communities"
  ],
  "cultural_historical_context": "Published in the early 2000s, reflecting a period of rising focus on networking, self-presentation, and social mobility linked to business culture and increased emphasis on soft skills.",
  "reception_impact": [
    "Popular bestseller and mainstay in self-help communication",
    "Frequently recommended in corporate, sales, and self-improvement settings",
    "Praised for its straightforward, actionable advice",
    "Occasional criticism for formulaic or surface-level tips, but lauded for accessibility and breadth"
  ],
  "comparable_titles": [
    "How to Win Friends and Influence People by Dale Carnegie",
    "The Fine Art of Small Talk by Debra Fine",
    "Crucial Conversations by Kerry Patterson, Joseph Grenny, Ron McMillan, and Al Switzler",
    "Never Eat Alone by Keith Ferrazzi"
  ]
}

async function generateBookSummary(metaOfBook, options = {}) {
  const {
    generateFirstHalf = true,
    previousSummaryContext = null,
    outputPath = './summaries-output.txt'
  } = options;

  try {
    // Prepare messages with context if second half
    const contextMessages = previousSummaryContext 
      ? [
          {
            role: 'system', 
            content: 'The following is the first half of the summary. Ensure the second half maintains consistent tone, style, and narrative flow.'
          },
          {
            role: 'user',
            content: previousSummaryContext
          }
        ]
      : [];
      
    console.log('context Messages, ', contextMessages)
    // Generate prompt and seed for specific half
    const userPrompt = generateUserPrompt(metaOfBook, generateFirstHalf);
    const seed = generateSeedFromMetadata(metaOfBook);
    console.log('seed', seed)

    // Generate summary
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      temperature: 0.5,
      top_p: 0.7,
      max_tokens: 32000,
      seed: 2,
      messages: [
        {
          role: 'system',
          content: `You are a professional nonfiction book summarizer.`
        },
        ...contextMessages,
        {
          role: 'user',
          content: userPrompt
        }
      ],
    });

    const result = completion.choices[0].message.content;

    // Ensure output directory exists
    const fullOutputPath = path.join(process.cwd(), outputPath);
    const outputDir = path.dirname(fullOutputPath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write summary to file
    fs.writeFileSync(fullOutputPath, result, 'utf-8');

    console.log(`✅ ${generateFirstHalf ? 'First' : 'Second'} half summary saved to: ${fullOutputPath}`);
    
    return result;
  } catch (err) {
    console.error('❌ Error generating summary:', err);
    throw err;
  }
}

function sanitizeFilename(title) {
  return title.replace(/[\/\\?%*:|"<>]/g, '').replace(/\s+/g, '_');
}

async function generateFullBookSummary(metaOfBook, options = {}) {
  const {
    outputPath = `./Final Summaries/${sanitizeFilename(metaOfBook.title)}.md`
  } = options;

  try {
    // Generate first half
    const firstHalfResult = await generateBookSummary(metaOfBook, {
      generateFirstHalf: true,
      outputPath: './first-half-summary.txt'
    });

    // Generate second half with first half as context
    const secondHalfResult = await generateBookSummary(metaOfBook, {
      generateFirstHalf: false,
      previousSummaryContext: firstHalfResult,
      outputPath: './second-half-summary.txt'
    });

    // Combine summaries
    const fullSummary = `${firstHalfResult}\n\n${secondHalfResult}`;

    // Write full summary to file
    const fullOutputPath = path.join(process.cwd(), outputPath);
    fs.writeFileSync(fullOutputPath, fullSummary, 'utf-8');

    console.log(`✅ Full summary saved to: ${fullOutputPath}`);
    return fullSummary;
  } catch (err) {
    console.error('❌ Error generating full summary:', err);
    throw err;
  }
}

// Export functions for potential use in other scripts
export { generateBookSummary, generateFullBookSummary, metaOfBook };

// If this script is run directly, generate full summary
if (import.meta.url === `file://${process.argv[1]}`) {
  generateFullBookSummary(metaOfBook);
}
