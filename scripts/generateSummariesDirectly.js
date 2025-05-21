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
function generateSeedFromMetadata(meta, version = '1.1') {
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
  "title": "Rich Dad Poor Dad: What the Rich Teach Their Kids About Money That the Poor and Middle Class Do Not!",
  "author": "Robert T. Kiyosaki",
  "publication_date": "1997",
  "edition_analyzed": "Most recent standard edition",
  "genre": [
    "Personal Finance",
    "Self-Help",
    "Business",
    "Motivational"
  ],
  "target_audience": [
    "Individuals seeking financial literacy",
    "Young adults and recent graduates",
    "Entrepreneurs and aspiring business owners",
    "People interested in building wealth or escaping the cycle of living paycheck to paycheck",
    "Anyone new to personal finance concepts"
  ],
  "core_themes": [
    "Financial literacy and education",
    "Differences in mindset between the wealthy and the poor/middle class",
    "Assets vs. liabilities",
    "The importance of entrepreneurship and investment",
    "Self-empowerment through financial knowledge",
    "Learning by doing and challenging traditional beliefs about money"
  ],
  "primary_purpose": "To challenge conventional views about money and personal finance by emphasizing financial education, encouraging entrepreneurship, and highlighting the differences in thinking and decision-making between the wealthy and the non-wealthy. The book aims to inspire and guide readers to achieve financial independence through smart investing and understanding how money works.",
  "structure_format": {
    "narrative_style": "Conversational, personal anecdotes, and motivational",
    "organization": "Organized into ten chapters, each focusing on a key lesson or principle learned from the author's 'rich dad' and 'poor dad'. Includes summaries and actionable advice at the end of key sections.",
    "features": [
      "First-person storytelling based on the author’s childhood and lessons from two father figures",
      "Simple diagrams and definitions (assets vs. liabilities)",
      "Chapter summaries and practical action points",
      "Motivational tone, encouraging self-education"
    ]
  },
  "key_concepts_lessons": [
    "The importance of financial literacy is often overlooked in traditional education.",
    "The wealthy focus on acquiring assets, while the non-wealthy accumulate liabilities they think are assets.",
    "Working for money versus having money work for you.",
    "Entrepreneurship, investing, and taking calculated risks are essential for building long-term wealth.",
    "Mindset and attitude toward money matter as much as practical skills.",
    "Continuous self-education and decision-making are vital to financial success."
  ],
  "style_tone": [
    "Encouraging",
    "Accessible",
    "Story-driven",
    "Motivational"
  ],
  "notable_features": [
    "Uses contrasting stories of two father figures to illustrate financial lessons",
    "Introduced simple, memorable definitions (particularly 'assets' and 'liabilities')",
    "Has inspired a global franchise, including workshops, games, and follow-up books",
    "Emphasis on lifelong learning and challenging conventional wisdom"
  ],
  "cultural_historical_context": "Published during a period of increasing awareness of personal finance in the late 1990s, 'Rich Dad Poor Dad' tapped into a widespread sense of economic uncertainty and dissatisfaction with traditional financial advice and formal education. The book contributed to the popularization of financial literacy as a movement, especially aimed at those outside traditional financial circles.",
  "reception_impact": [
    "Consistently ranked among the best-selling finance books worldwide",
    "Credited with starting a cultural conversation about 'financial literacy'",
    "Widely used as an entry point for those new to personal finance and investing",
    "Some critics question the accuracy of its stories and note the lack of specific investment guidance, but praise its motivational impact",
    "Spawned a large number of seminars, courses, and follow-up publications"
  ],
  "comparable_titles": [
    "The Millionaire Next Door by Thomas J. Stanley and William D. Danko",
    "Think and Grow Rich by Napoleon Hill",
    "The Richest Man in Babylon by George S. Clason",
    "Your Money or Your Life by Vicki Robin and Joe Dominguez",
    "I Will Teach You to Be Rich by Ramit Sethi"
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

    // Generate prompt and seed for specific half
    const userPrompt = generateUserPrompt(metaOfBook, generateFirstHalf);
    const seed = generateSeedFromMetadata(metaOfBook);
    console.log('seed', seed)

    // Generate summary
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      temperature: 0.5,
      top_p: 0,
      max_tokens: 32000,
      seed: seed,
      messages: [
        {
          role: 'system',
          content: `You are an expert nonfiction book summarizer.`
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

async function generateFullBookSummary(metaOfBook, options = {}) {
  const {
    outputPath = './full-summary.md'
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
    const fullSummary = `--- First Half ---\n\n${firstHalfResult}\n\n--- Second Half ---\n\n${secondHalfResult}`;

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
