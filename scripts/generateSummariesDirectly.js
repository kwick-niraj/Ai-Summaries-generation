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
  "edition_analyzed": "First edition (2018)",
  "genre": [
    "Self-Help",
    "Personal Development",
    "Productivity",
    "Motivation"
  ],
  "target_audience": [
    "Individuals seeking sustainable personal or professional growth",
    "Readers struggling with consistency and follow-through",
    "Entrepreneurs, creatives, and high-performers",
    "Anyone interested in goal setting and achievement through process"
  ],
  "core_themes": [
    "The power of small, consistent daily improvements",
    "Focusing on the process rather than only outcomes",
    "Overcoming overwhelm and perfectionism",
    "Building momentum through incremental habits",
    "Cultivating patience and resilience"
  ],
  "primary_purpose": "To teach readers how to achieve ambitious dreams by committing to steady, incremental progress, using the principle of improving by just 1% each day, and to promote a mindset shift from instant results to long-term, process-oriented growth.",
  "structure_format": {
    "narrative_style": "Encouraging, practical, and motivational with personal anecdotes",
    "organization": "Thematic chapters introducing core concepts, followed by strategies and application exercises",
    "features": [
      "Case studies and real-life examples",
      "Action steps and journal prompts",
      "Summaries at the end of chapters"
    ]
  },
  "key_concepts_lessons": [
    "Exponential impact comes from small, repeated daily actions.",
    "Focusing on the journey (process) makes goals less overwhelming and more sustainable.",
    "Taking imperfect action daily is more powerful than waiting for the perfect time or plan.",
    "Habits compound over time to produce significant transformation.",
    "Celebrating small wins builds momentum and confidence.",
    "Clarity, consistency, and courage are essential for long-term success."
  ],
  "style_tone": [
    "Inspiring",
    "Direct",
    "Supportive",
    "Action-oriented"
  ],
  "notable_features": [
    "Framework for sustainable personal growth",
    "Emphasis on behavioral psychology and neuroscience principles",
    "Practical exercises and reflection prompts",
    "Advice for overcoming modern distractions and instant gratification tendencies"
  ],
  "cultural_historical_context": "Written during a period of increased focus on productivity and self-improvement, the book responds to growing frustration with quick-fix solutions and societal impatience for results, advocating a return to process-oriented achievement in the face of digital-age distractions.",
  "reception_impact": [
    "Positively received by productivity and self-improvement communities",
    "Appreciated for its actionable guidance and easy-to-apply philosophy",
    "Praised for demystifying achievement by breaking it into accessible daily steps",
    "Some critics find the core idea repetitive, noting it appeals most to those seeking motivation or struggling with consistency"
  ],
  "comparable_titles": [
    "Atomic Habits by James Clear",
    "The Slight Edge by Jeff Olson",
    "The Compound Effect by Darren Hardy",
    "Deep Work by Cal Newport"
  ]
}
const isFirstHalf = true
const userPrompt = generateUserPrompt(metaOfBook, isFirstHalf)

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
      top_p: 0,
      max_tokens: 32000,
      // seed: 30,
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
      top_p: 0,
      max_tokens: 32000,
      // seed: 30,
      messages: [
        {
          role: 'system',
          content: `You are a professional nonfiction book summarizer. You're Generating the Second Half of a summary. Match the tone and structure from the first half of the summary.
          Instruction:
          "structure_type": "framework_stepwise",
          
          "description": "Use this strategy to summarize books that present a structured methodology, system, or set of principles. The summary should progress step-by-step in a clear, logical flow that mirrors the original framework or sequential argument of the book. This structure is ideal for books about productivity, business, health, learning, or behavioral change.",
          
          "prompt": "Summarize the book using a structured, principle-by-principle flow. Each chapter should cover one or more related steps, ideas, or habits. Start by clearly defining the theme or principle of that chapter. Then, explain the concept in simplified, logical terms using analogies, metaphors, or relatable thought experiments when needed. Use short, real-life examples to demonstrate how the principle works in action — these can be paraphrased or generalized but must be relevant.\n\n
          
          Ensure the summary maintains a logical progression: early chapters should introduce foundational ideas, while later ones build complexity or deepen practical understanding. Link concepts where appropriate to show interdependence.\n
          Emphasize practical understanding over literary style. Avoid fragmenting insights — keep the flow continuous.\n\n
          
          When the original book presents visual or conceptual frameworks (e.g., loops, matrices, pyramids), describe them simply so they are mentally visualizable. Summarize tools, models, or checklists naturally within the paragraph flow or as short bullet lists where necessary.\n\n
          
          The overall goal is to teach the core logic and usability of the framework clearly and sequentially — as if helping someone implement the method in real life, step by step.",

          "tone": "Use a warm, thoughtful tone that feels like a calm mentor guiding the reader. Maintain emotional clarity without sounding formal or academic. Blend in human-centered metaphors, light scene-setting, and relatable analogies to explain abstract ideas — similar to a quiet conversation or reflective personal essay. Prioritize ease of reading and psychological depth. Avoid dramatization or persuasive flair — the value should come from clarity and resonance.",
            
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

    await delayWithCountdown(60); // 5-second countdown
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
