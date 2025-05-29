// Requires: npm install openai dotenv
import dotenv from 'dotenv';
import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import fs from 'fs';
import path from 'path';
import { generateUserPrompt } from './generateUserPrompts.js';
import dbServices from './db-services/services.js'
import dbClient from './db-services/db.js';
import formattingService from './utils/format-summaries.js'

dotenv.config();

// Azure OpenAI Config
const endpoint = process.env.AZURE_OPENAI_ENDPOINT; // e.g., https://kwickin.openai.azure.com/
const apiVersion = '2025-01-01-preview'; // Match your API version
const deployment = 'gpt-4.1';// e.g., gpt-4.1

// Initialize Azure Credential (Entra ID/Managed Identity)
const credential = new DefaultAzureCredential();
const scope = 'https://cognitiveservices.azure.com/.default';
const azureADTokenProvider = getBearerTokenProvider(credential, scope);

// Initialize Azure OpenAI Client
const client = new AzureOpenAI({ endpoint, azureADTokenProvider, apiVersion, deployment });

const meta = await getBookMeta();

let metaOfBook;
let summary_strategy;


if (meta) {
  metaOfBook = meta.bookMetaJson;
  summary_strategy = meta.summaryStrategy;
} else {
  throw new Error('STOPPED EXECUTION, NO META FOUND!')
}

const isFirstHalf = true
console.log('Meta', meta);
const userPrompt = generateUserPrompt(metaOfBook, isFirstHalf, summary_strategy)

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
    // const userPrompt = generateUserPrompt(metaOfBook, generateFirstHalf, );
    // const seed = generateSeedFromMetadata(metaOfBook);
    // console.log('seed', seed)

    // Generate summary
    const completion = await client.chat.completions.create({
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

const summaryStrategyForPart2 = {
  "story_wisdom": `You are a professional nonfiction book summarizer. You're Generating the Second Half of a summary. Match the tone and structure from the first half of the summary.
  Instruction:
  "structure_type": "story_wisdom",
  "description": "Use the following structure configuration to guide the summary writing process.\n
  • The summary should follow the **story_wisdom** structure — Structure the summary using emotionally engaging, human-centered storytelling and easy to understand language. It is acceptable to introduce characters or roles from the original book to set up the initial context. Preserve the original chapter structure for 80% and paraphrase the stories and examples provided by the author.
  Maintain a warm, thoughtful tone throughout. The reader should feel like they’re being guided through a lived experience, not reading a textbook or summary. Avoid formal transitions and instead focus on emotional flow, mental clarity, and human resonance."
  Use a hybrid tone across the summary that seamlessly blends narrative, story, and reflection in the following way:
  1. Start each chapter with an **engaging, flowing introduction** that sets up the theme in a human, relatable way. Use reflective yet accessible language to draw the reader in — avoid sounding academic or formal.
  2.  When referencing real-life stories or examples from the book, shift into immersive storytelling. Retell these moments in a vivid but grounded way, using unnamed, relatable characters (e.g., “a kid frustrated with work,” “a parent chasing security”) to preserve emotional closeness. Keep scenes concise and emotionally believable — include small actions, reactions, and emotional turning points to make the lesson feel lived, not just told. Avoid dramatization or overly literary flair. The pacing should feel like a memory being naturally shared, not a scene from fiction.
  3. As you explain core ideas, **embed insights subtly within the narration** using a natural **conversational tone**. Speak directly to the reader without announcing lessons. Let takeaways emerge through phrases like “it became clear,” “most people don’t notice this,” or “many fall into the same habit.” Avoid any list-like phrasing or labeled takeaways. Let the insight feel discovered — not pointed out.
  4. Avoid repeating the same phrases like “a young person” or similar generic identities — vary the narrative by using situational framing and emotional context instead.

  Generate 4 to 5 chapters only in this half.

  Also, Add a Conclusion At End of the Summary: Write a 1800-character instructional-style conclusion using a mentor-like tone, including a short list of bullet-point takeaways (each 10–12 words long). followed by a longer, emotionally intelligent final paragraph that offers reassurance and encourages real-world action.
    `,
  "framework_stepwise": `You are a professional nonfiction book summarizer. You're Generating the Second Half of a summary. Match the tone and structure from the first half of the summary.
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
}

const systemContent2ndPart = summaryStrategyForPart2[summary_strategy];

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
    const completion = await client.chat.completions.create({
      model: 'gpt-4.1',
      temperature: 0.5,
      top_p: 0,
      max_tokens: 32000,
      // seed: 30,
      messages: [
        {
          role: 'system',
          content: systemContent2ndPart,
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

async function generateFullBookSummary(metaOfBook, meta) {
  // const {
  //   outputPath = `./Final Summaries/${sanitizeFilename(metaOfBook.title)}.md`
  // } = options;

  const outputPath = `./Final Summaries/${meta.bookId}.md`

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

    const cleanedFirstHalf = formattingService.cleanSummaryText(firstHalfResult);
    // const cleanedSecondHalf = formattingService.cleanSummaryText(secondHalfResult);
    // No need to clean second half, it's already clean always.
    // Combine summaries
    let fullSummary = `${cleanedFirstHalf}\n\n${secondHalfResult}`;

    fullSummary = formattingService.formatChapterHeaders(fullSummary)

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

console.log('MetaOfBook: ', metaOfBook)
generateFullBookSummary(metaOfBook, meta);

// // Define input and output file paths
// const inputFilePath = path.join(process.cwd(), 'first-half-summary.txt');
// const outputFilePath = path.join(process.cwd(), 'first-half-summary-cleaned.txt');

// try {
//   // Read the original file
//   const fileContent = fs.readFileSync(inputFilePath, 'utf-8');

//   // Clean the content
//   const cleanedContent = formattingService.cleanSummaryText(fileContent);

//   // Write the cleaned content to a new file
//   fs.writeFileSync(outputFilePath, cleanedContent, 'utf-8');

//   console.log(`✅ Cleaned summary saved to: ${outputFilePath}`);
// } catch (err) {
//   console.error('❌ Error reading or writing file:', err);
// }

async function getBookMeta(){
  try {
    await dbClient.connect();
    console.log('✅ Connected to PostgreSQL');
  
    const book = await dbServices.getBookMetadata();
    const bookDetails = {}
    if (book) {
      bookDetails.bookId = book.book_id;
      bookDetails.summaryStrategy = book.summary_structure;
      bookDetails.bookTitleFromMetaTable = book.title;
    }
    console.log('📚 Book metadata:', book);
  
    await dbClient.end();
    console.log('✅ PostgreSQL connection closed');

    bookDetails.bookMetaJson = getBookMetaJSONById(bookDetails.bookId)
    
    if(!!bookDetails.bookMetaJson) {
      console.log('Ready Book Details OBJ: ', bookDetails)
      return bookDetails
    }
    throw new Error('Can\'t able to get metaOfBook JSON')
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
}

function getBookMetaJSONById(bookId) {
  const metaFolderPath = path.join(process.cwd(), '..', 'Meta of All Books DB');
  const filePath = path.join(metaFolderPath, `${bookId}.json`);

  try {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(rawContent);
    return jsonData[0];
  } catch (err) {
    console.error(`❌ Could not load metadata for book ID ${bookId}:`, err.message);
    return null;
  }
}