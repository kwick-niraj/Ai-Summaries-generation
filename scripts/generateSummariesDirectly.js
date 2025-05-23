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
  "edition_analyzed": "2018 first edition",
  "genre": [
    "Self-Help",
    "Personal Development",
    "Productivity",
    "Goal-Setting"
  ],
  "target_audience": [
    "Entrepreneurs and professionals seeking sustainable growth",
    "Individuals aiming for personal or career transformation",
    "People overwhelmed by big goals or discouraged by slow progress",
    "Readers interested in mindset and behavioral psychology"
  ],
  "core_themes": [
    "The power of incremental daily improvement",
    "Process-oriented thinking versus results obsession",
    "Overcoming overwhelm by focusing on small, consistent actions",
    "Building momentum through compounding progress",
    "Letting go of perfection and embracing consistency"
  ],
  "primary_purpose": "To help readers achieve significant long-term results by breaking down lofty goals into daily, manageable 1% improvements, and to encourage a mindset shift towards embracing the process rather than fixating on outcomes.",
  "structure_format": {
    "narrative_style": "Motivational, conversational, and practical",
    "organization": "Divided into thematic chapters introducing concepts, actionable frameworks, examples, and exercises",
    "features": [
      "Step-by-step strategies for implementing the 1% Rule",
      "Case studies and anecdotes",
      "End-of-chapter action steps and reflection prompts"
    ]
  },
  "key_concepts_lessons": [
    "Small, consistent improvements lead to significant results through compounding over time.",
    "Focusing on just 1% progress each day makes big goals approachable and less overwhelming.",
    "Value lies in commitment to daily processes rather than fixating on distant outcomes.",
    "Taking imperfect action regularly is more powerful than waiting for perfect conditions.",
    "Sustainable routines and habits are the foundation for personal and professional success.",
    "Celebrating incremental progress builds self-trust and inner motivation."
  ],
  "style_tone": [
    "Encouraging",
    "Relatable",
    "Direct",
    "Inspiring"
  ],
  "notable_features": [
    "Emphasis on transforming goals into process-oriented behaviors",
    "Tangible, actionable steps for readers at any stage of a journey",
    "Blends personal stories, real-world examples, and research-backed insights",
    "Includes exercises and implementation questions"
  ],
  "cultural_historical_context": "Published during an era of productivity culture and 'hustle' mentality, the book offers an alternative path that rejects quick fixes and burnout for sustainable, process-driven growth. It aligns with trends in behavioral psychology that highlight the power of habits and marginal gains.",
  "reception_impact": [
    "Positive reception among entrepreneurs and self-improvement enthusiasts",
    "Praised for demystifying the achievement process and making transformation approachable",
    "Utilized in workshops, coaching, and productivity training",
    "Some readers find the repetition of concepts heavy-handed or wanting more scientific depth"
  ],
  "comparable_titles": [
    "Atomic Habits by James Clear",
    "The Slight Edge by Jeff Olson",
    "The Compound Effect by Darren Hardy",
    "Make Your Bed by Admiral William H. McRaven"
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

    await delayWithCountdown(90); // 5-second countdown
    console.log('▶️ Continue execution...');
  
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

async function delayWithCountdown(seconds) {
  for (let i = seconds; i > 0; i--) {
    console.log(`⏳ Waiting... ${i} second${i !== 1 ? 's' : ''} remaining`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('✅ Done!');
}

generateFullBookSummary(metaOfBook);
