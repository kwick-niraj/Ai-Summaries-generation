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
  "title": "How to Win Friends and Influence People",
  "author": "Dale Carnegie",
  "publication_date": "1936",
  "edition_analyzed": "Updated edition (latest standard reprint, unless specified otherwise)",
  "genre": [
    "Self-Help",
    "Personal Development",
    "Business",
    "Communication Skills"
  ],
  "target_audience": [
    "Professionals aiming to improve workplace relationships and leadership",
    "Individuals seeking to enhance personal and social interactions",
    "Students of business and communication",
    "Anyone interested in personal development and influence"
  ],
  "core_themes": [
    "The power of positive relationships",
    "Effective communication techniques",
    "Building rapport and trust",
    "Influence through empathy and understanding",
    "Leadership through encouragement rather than authority"
  ],
  "primary_purpose": "To teach readers timeless principles of effective human relations—showing how to make people like you, win others over to your way of thinking, and become a more influential, likable, and effective person in both personal and professional settings.",
  "structure_format": {
    "narrative_style": "Conversational, anecdotal, instructional",
    "organization": "Divided into four major parts, each with several principles explained through stories and practical examples",
    "features": [
      "Real-life anecdotes and case studies",
      "Principles summarized at the end of each section",
      "Direct, actionable guidance for readers"
    ]
  },
  "key_concepts_lessons": [
    "Don't criticize, condemn, or complain.",
    "Give honest and sincere appreciation.",
    "Arouse in the other person an eager want.",
    "Become genuinely interested in other people.",
    "Smile and use people's names.",
    "Be a good listener and encourage others to talk about themselves.",
    "Talk in terms of the other person's interests.",
    "Make the other person feel important—and do it sincerely.",
    "Win others to your way of thinking by showing respect and seeing things from their perspective.",
    "Admit when you're wrong and allow others to save face."
  ],
  "style_tone": [
    "Warm",
    "Encouraging",
    "Story-driven",
    "Direct and approachable"
  ],
  "notable_features": [
    "Timeless, principle-based approach",
    "Heavy use of illustrative stories",
    "Clear and memorable summaries",
    "Emphasis on foundational social dynamics rather than one-off tricks"
  ],
  "cultural_historical_context": "Published during the Great Depression, the book addressed a growing need for effective people skills in business and social life. Its techniques resonated with an audience seeking to adapt to a rapidly modernizing, competitive, and network-driven society. The book remains one of the foundational texts of self-help and communication literature.",
  "reception_impact": [
    "One of the best-selling self-help books of all time, with over 30 million copies sold worldwide.",
    "Widely acclaimed for its practical, actionable advice.",
    "Endorsed by business leaders, educators, and public figures for decades.",
    "Occasional criticism for being rooted in early-20th-century American business norms; celebrated for its continued relevance."
  ],
  "comparable_titles": [
    "How to Talk to Anyone by Leil Lowndes",
    "Influence: The Psychology of Persuasion by Robert Cialdini",
    "Crucial Conversations by Kerry Patterson et al.",
    "Never Split the Difference by Chris Voss"
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
      // seed: 10,
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

          Generate 4 to 5 chapters only in this half.

          Also, Add a Conclusion At End of the Summary: Write a 1800-character instructional-style conclusion using a mentor-like tone, including a short list of bullet-point takeaways (each 10–12 words long). followed by a longer, emotionally intelligent final paragraph that offers reassurance and encourages real-world action.`
        },
        ...contextMessages,
        {
          role: 'user',
          content: 'Generate second half of the full summary. The summary should be approximately 28,000–35,000.'
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
