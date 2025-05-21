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
function generateSeedFromMetadata(meta, isFirstHalf) {
  const seedString = `${meta.title}${meta.author}${meta.publication_date}${isFirstHalf ? 'first' : 'second'}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

const metaOfBook = {
  "title": "The Art of Seduction",
  "author": "Robert Greene",
  "publication_date": "2002",
  "edition_analyzed": "Most recent standard edition",
  "genre": [
    "Self-Help",
    "Psychology",
    "Strategy",
    "Interpersonal Relationships"
  ],
  "target_audience": [
    "Adults interested in power dynamics and human behavior",
    "Readers of self-help and personal development",
    "Professionals seeking insight into persuasion and influence",
    "Fans of Robert Greene's work"
  ],
  "core_themes": [
    "The psychology of seduction",
    "Manipulation and persuasion in relationships",
    "Types of seducers and their strategies",
    "Historical and literary analysis of seduction",
    "Human desires, vulnerabilities, and social power dynamics"
  ],
  "primary_purpose": "To examine and decode the timeless techniques and strategies of seduction, drawing on historical figures, psychological insight, and storytelling to show readers how seduction operates in personal and social contexts—and how it can be wielded as both an art and instrument of power.",
  "structure_format": {
    "narrative_style": "Narrative, analytical, often anecdotal and historical; aphoristic and occasionally provocative",
    "organization": "Divided into two main parts: character studies of the nine seducer archetypes and the 18 stages of seduction, interspersed with historical case studies, anecdotes, and 'seduction strategies'",
    "features": [
      "In-depth character portraits and archetypes",
      "Case studies from history, literature, and myth",
      "Summaries of tactics and laws of seduction",
      "Interpretive side-bars and aphorisms"
    ]
  },
  "key_concepts_lessons": [
    "Seduction is not strictly sexual; it is a form of social power that can be harnessed in many contexts.",
    "Recognizing the different types of seducers (and anti-seducers) allows one to understand and anticipate others’ behavior.",
    "The process of seduction involves subtle manipulation, psychological tactics, and a deep attunement to social cues.",
    "Historical examples (e.g., Casanova, Cleopatra, Rasputin) serve as archetypes for various seductive strategies.",
    "Vulnerability, mystery, and creating emotional highs and lows are all instrumental tools in seduction.",
    "Being aware of seduction’s risks and ethical boundaries is critical."
  ],
  "style_tone": [
    "Evocative",
    "Provocative",
    "Cautionary",
    "Analytical",
    "Lush, occasionally theatrical language"
  ],
  "notable_features": [
    "Combines psychological theory with storytelling and history",
    "Embeds cautionary tales and 'anti-seducer' warnings",
    "Controversial approach to manipulation and consent",
    "Elaborate, almost literary presentation—typical of Greene’s narrative style"
  ],
  "cultural_historical_context": "Published in the early 2000s, 'The Art of Seduction' aligns with a turn-of-the-century fascination with power, charisma, and the darker sides of human nature, following Greene’s prior success with 'The 48 Laws of Power.' Its themes draw on both modern psychology and classical stories, reflecting a postmodern appetite for self-mastery and influence.",
  "reception_impact": [
    "Became widely popular among readers interested in strategy, persuasion, and self-help",
    "Critically noted for its breadth of research and engaging narrative style",
    "Frequently criticized for its morally ambiguous stance on manipulation",
    "Has influenced discussions around pick-up culture, dating, and social influence; recommended and reviled in equal measure for its approach"
  ],
  "comparable_titles": [
    "The 48 Laws of Power by Robert Greene",
    "Influence: The Psychology of Persuasion by Robert B. Cialdini",
    "The Power of Seduction by Robert Greene (companion work/audiobook)",
    "Dangerous Liaisons by Pierre Choderlos de Laclos (literary precedent)",
    "The Art of War by Sun Tzu (in its strategic, non-literal sense)"
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
    const seed = generateSeedFromMetadata(metaOfBook, generateFirstHalf);

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
