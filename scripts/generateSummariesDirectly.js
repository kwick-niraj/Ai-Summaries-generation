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

const toneAndStructure = {
  "structure_type": "story_wisdom",
  "description": "Narrative-style walkthrough using emotional, reflective storytelling to explain key ideas.",
  "structure": "Structure the summary as a flowing narrative that uses emotionally engaging storytelling to deliver key insights. Use broad, relatable scenarios to illustrate each key idea. You may use generalized, non-specific archetypes (e.g., “a manager,” “a shy student”), but avoid creating named characters or detailed fictional backstories. Include clear, paraphrased examples or everyday situations to support key concepts and make them more relatable. When the original book includes personal journeys or character-driven learning (e.g., through mentors, parents, or contrasting figures), anchor the narrative around an unnamed persona (e.g., 'a young boy', 'an early-career professional') and refer to other figures using relational roles (e.g., 'a mentor', 'a friend's father') instead of names. Avoid full retellings or fictional anecdotes. Use natural, third-person narration and keep the tone reflective, warm, and human."
};
const isFirstHalf = true
const userPrompt = generateUserPrompt(metaOfBook, toneAndStructure, isFirstHalf)

console.log('user prompt', userPrompt)

async function generateFirstHalfBookSummary(metaOfBook, options = {}) {
  const {
    generateFirstHalf = true,
    previousSummaryContext = null,
    outputPath = './first-half.txt'
  } = options;

  try {
    // Prepare messages with context if second half
    // Generate prompt and seed for specific half
    const userPrompt = generateUserPrompt(metaOfBook, generateFirstHalf);
    // const seed = generateSeedFromMetadata(metaOfBook);
    // console.log('seed', seed)

    // Generate summary
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      temperature: 0.5,
      top_p: 0.7,
      max_tokens: 32000,
      // seed: 2,
      messages: [
        {
          role: 'system',
          content: `You are a professional nonfiction book summarizer. The summary should be approximately 28,000–35,000 characters across 4-5 chapters.`
        },
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

async function generateSecondHalfBookSummary(metaOfBook, options = {}) {
  const {
    generateFirstHalf = true,
    previousSummaryContext = null,
    outputPath = './second-half.txt'

  } = options; const contextMessages = previousSummaryContext
    ? [
      {
        role: 'system',
        content: 'The following is the first half of the summary.'
      },
      {
        role: 'user',
        content: previousSummaryContext
      }
    ]
    : [];

  console.log('context Messages, ', contextMessages)

  try {
    // Prepare messages with context if second half
    // Generate prompt and seed for specific half
    // const userPrompt = generateUserPrompt(metaOfBook, generateFirstHalf);
    // const seed = generateSeedFromMetadata(metaOfBook);
    // console.log('seed', seed)

    // Generate summary
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      temperature: 0.5,
      top_p: 0.7,
      max_tokens: 32000,
      seed: 3,
      messages: [
        {
          role: 'system',
          content: `You are a professional nonfiction book summarizer. You're Generating the Second Half of a summary. Match the tone and structure from the first half of the summary.
          Instruction:
          "structure_type": "framework_stepwise",

          "description": "Use this strategy to summarize books that present a structured methodology, system, or set of principles. The summary should progress step-by-step in a clear, logical flow that mirrors the original framework or sequential argument of the book. This structure is ideal for books about productivity, business, health, learning, or behavioral change.",
          
          "prompt": "Summarize the book using a structured, principle-by-principle flow. Each chapter should cover one or more related steps, ideas, or habits. Start by clearly defining the theme or principle of that chapter. Then, explain the concept in simplified, logical terms using analogies, metaphors, or relatable thought experiments when needed. Use short, real-life examples to demonstrate how the principle works in action — these can be paraphrased or generalized but must be relevant.\n\nEnsure the summary maintains a logical progression: early chapters should introduce foundational ideas, while later ones build complexity or deepen practical understanding. Link concepts where appropriate to show interdependence.\nEmphasize practical understanding over literary style. Avoid fragmenting insights — keep the flow continuous.\n\nWhen the original book presents visual or conceptual frameworks (e.g., loops, matrices, pyramids), describe them simply so they are mentally visualizable. Summarize tools, models, or checklists naturally within the paragraph flow or as short bullet lists where necessary.\n\nThe overall goal is to teach the core logic and usability of the framework clearly and sequentially — as if helping someone implement the method in real life, step by step.",

          "tone": "Use a story-driven tone that feels like each principle is being uncovered through meaningful experience. Begin sections with real-world moments or reflective situations where the need for a given principle becomes obvious. Rather than a detached mentor, the voice should feel like someone walking through the lessons from lived trial-and-error — learning alongside the reader. Blend instruction with light storytelling and internal realizations. Prioritize relatability, transformation, and natural clarity over formal exposition or motivation. Let the structure emerge as the path someone walked to find what works.",

          "technique_integration": "If there are clearly named or structured techniques (e.g., rules, steps, methods, or frameworks), include them as brief, well-placed bullet points at the moment they emerge naturally in the narrative. Do not isolate them into a separate section. Introduce them gently with transitions. Paraphrase both the language and any original metaphors to keep the expression fresh and natural. Keep each point concise (2–5 lines max) and use accessible, human-centered wording. The goal is to blend clarity with emotional and conceptual flow, without referring to the book or its author directly."

          Also, Add a Conclusion At End of the Summary: Write a 1800-character instructional-style conclusion using a mentor-like tone, including a short list of bullet-point takeaways (each 10–12 words long). followed by a longer, emotionally intelligent final paragraph that offers reassurance and encourages real-world action.`
        },
        ...contextMessages,
        {
          role: 'user',
          content: 'Generate second half of the full summary.'
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
    const firstHalfResult = await generateFirstHalfBookSummary(metaOfBook, {
      generateFirstHalf: true,
      outputPath: './first-half-summary.txt'
    });

    // Generate second half with first half as context
    const secondHalfResult = await generateSecondHalfBookSummary(metaOfBook, {
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

generateFullBookSummary(metaOfBook);
