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
  "title": "The 7 Habits of Highly Effective People: Powerful Lessons in Personal Change",
  "author": "Stephen R. Covey",
  "publication_date": "1989",
  "edition_analyzed": "25th Anniversary Edition (2013; core content unchanged)",
  "genre": [
    "Self-Help",
    "Personal Development",
    "Leadership",
    "Productivity",
    "Business"
  ],
  "target_audience": [
    "Professionals seeking personal and organizational effectiveness",
    "Leaders and managers",
    "Students and lifelong learners",
    "Individuals interested in self-improvement and personal growth",
    "Anyone aiming for a principled, purpose-driven life"
  ],
  "core_themes": [
    "Personal responsibility and proactive living",
    "Values-driven decision-making",
    "Interpersonal effectiveness and collaboration",
    "Continuous self-renewal and balanced living",
    "Principle-centered leadership"
  ],
  "primary_purpose": "To present a holistic, principle-centered framework for achieving personal and professional effectiveness through internal transformation, character development, and positive relationships.",
  "structure_format": {
    "narrative_style": "Didactic, narrative-driven, and reflective, with exercises and anecdotes",
    "organization": "Divided into individual chapters for each habit, with supporting sections on paradigm shifts and growth processes",
    "features": [
      "Step-by-step lessons and self-assessment tools",
      "Real-life stories and examples",
      "Diagrams explaining concepts (e.g., Time Management Matrix)",
      "Reflections and application exercises"
    ]
  },
  "key_concepts_lessons": [
    "The importance of a paradigm shift: Success starts with changing how we perceive and interpret the world.",
    "Habit 1: Be Proactive – Take responsibility for your life and choices.",
    "Habit 2: Begin with the End in Mind – Define a clear personal vision and life goals.",
    "Habit 3: Put First Things First – Prioritize tasks by importance, not urgency.",
    "Habit 4: Think Win-Win – Cultivate an abundance mindset and seek mutual benefit in interactions.",
    "Habit 5: Seek First to Understand, Then to Be Understood – Practice empathic listening and clear communication.",
    "Habit 6: Synergize – Value differences and collaborate creatively for better results.",
    "Habit 7: Sharpen the Saw – Invest in balanced, ongoing self-renewal across physical, mental, social/emotional, and spiritual dimensions."
  ],
  "style_tone": [
    "Inspirational",
    "Practical",
    "Reflective",
    "Systematic",
    "Accessible"
  ],
  "notable_features": [
    "Global bestseller, translated into over 40 languages",
    "Widely used in corporate, educational, and personal settings",
    "Principle-centered rather than personality-focused approach",
    "Diagonal focus: personal, interpersonal, and organizational effectiveness"
  ],
  "cultural_historical_context": "Published at the close of the 1980s, when self-help books were booming and the business world was shifting focus to leadership, accountability, and work-life balance. The book’s enduring influence reflects its integration of timeless wisdom and practical models for a rapidly changing world.",
  "reception_impact": [
    "Over 40 million copies sold worldwide; consistently recommended for personal and professional growth",
    "Foundational text for many leadership and development programs",
    "Praised for its clarity, applicability, and depth",
    "Criticized in some circles as too idealistic or time-intensive for immediate results",
    "Influence extended to sequels, workbooks, and a broader '7 Habits' franchise"
  ],
  "comparable_titles": [
    "How to Win Friends and Influence People by Dale Carnegie",
    "Atomic Habits by James Clear",
    "Principles: Life and Work by Ray Dalio",
    "Drive: The Surprising Truth About What Motivates Us by Daniel H. Pink"
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
