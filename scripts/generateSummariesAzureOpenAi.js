// generateSummariesAzureOpenAi.js

import dotenv from 'dotenv';
import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import fs from 'fs';
import path from 'path';
import formattingService from './utils/format-summaries.js';
import { generateUserPrompt } from './generateUserPrompts.js';

dotenv.config();

// Azure OpenAI Config
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiVersion = '2025-01-01-preview';
const deployment = 'gpt-4.1';

// Initialize Azure Credential
const credential = new DefaultAzureCredential();
const scope = 'https://cognitiveservices.azure.com/.default';
const azureADTokenProvider = getBearerTokenProvider(credential, scope);

// Azure OpenAI Client
const client = new AzureOpenAI({ endpoint, azureADTokenProvider, apiVersion, deployment });

// Summary strategy map
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

// Generate first half
async function generateFirstHalfBookSummary(metaOfBook, summaryStrategy, options = {}) {
  const { outputPath = './first-half.txt' } = options;

  try {
    const userPrompt = generateUserPrompt(metaOfBook, true, summaryStrategy);
    const completion = await client.chat.completions.create({
      model: deployment,
      temperature: 0.5,
      top_p: 0,
      max_tokens: 32000,
      messages: [
        { role: 'system', content: `You are a professional nonfiction book summarizer. The summary should be approximately 28,000–35,000 characters across 4-5 chapters.` },
        { role: 'user', content: userPrompt },
      ],
    });

    const result = completion.choices[0].message.content;

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, result, 'utf-8');

    console.log(`✅ First half summary saved to: ${outputPath}`);
    return result;
  } catch (err) {
    console.error('❌ Error generating first half summary:', err);
    throw err;
  }
}

// Generate second half
async function generateSecondHalfBookSummary(metaOfBook, summaryStrategy, previousSummaryContext, options = {}) {
  const { outputPath = './second-half.txt' } = options;
  const systemContent2ndPart = summaryStrategyForPart2[summaryStrategy];

  const contextMessages = previousSummaryContext
    ? [
        { role: 'system', content: 'The following is the first half of the summary.' },
        { role: 'user', content: previousSummaryContext },
      ]
    : [];

  try {
    const completion = await client.chat.completions.create({
      model: deployment,
      temperature: 0.5,
      top_p: 0,
      max_tokens: 32000,
      messages: [
        { role: 'system', content: systemContent2ndPart },
        ...contextMessages,
        { role: 'user', content: 'Generate second half of the full summary. The summary should be approximately 28,000–35,000.' },
      ],
    });

    const result = completion.choices[0].message.content;

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, result, 'utf-8');

    console.log(`✅ Second half summary saved to: ${outputPath}`);
    return result;
  } catch (err) {
    console.error('❌ Error generating second half summary:', err);
    throw err;
  }
}

// Full summary generation
async function generateFullBookSummary(metaOfBook, summaryStrategy, meta) {
  const outputPath = `./Final Summaries/${meta.bookId}.md`;

  try {
    const firstHalf = await generateFirstHalfBookSummary(metaOfBook, summaryStrategy, {
      outputPath: './first-half-summary.txt',
    });

    await delayWithCountdown(60);

    const secondHalf = await generateSecondHalfBookSummary(metaOfBook, summaryStrategy, firstHalf, {
      outputPath: './second-half-summary.txt',
    });

    const cleanedFirstHalf = formattingService.cleanSummaryText(firstHalf);
    let fullSummary = `${cleanedFirstHalf}\n\n${secondHalf}`;
    fullSummary = formattingService.formatChapterHeaders(fullSummary);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, fullSummary, 'utf-8');

    console.log(`✅ Full summary saved to: ${outputPath}`);
    return fullSummary;
  } catch (err) {
    console.error('❌ Error generating full summary:', err);
    throw err;
  }
}

async function delayWithCountdown(seconds) {
  for (let i = seconds; i > 0; i--) {
    console.log(`⏳ Waiting... ${i} second${i !== 1 ? 's' : ''} remaining`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log('✅ Done!');
}

export default generateFullBookSummary;