// generateIntroAndWhatUserWillGet.js

import dotenv from 'dotenv';
import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import fs from 'fs';
import path from 'path';
import { parseCsv, updateCsvRowByBookId} from './utils/csvService.js';
import formattingService from './utils/format-intro.js';

dotenv.config();

console.log('process.env', process.env)

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

async function generateIntroAndWhatYouWillGet(metaOfBook, options = {}) {
  const { outputDir = './IntroOutputs' } = options;
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    const systemPrompt = `You are a professional nonfiction book helper, which can help in understanding "Introduction" and "What to expect if someone reads it".

For each book, you will write two distinct sections in this exact order and exact format:

1️⃣ First, write the word: **Introduction:** on its own line.

Then, write a two-paragraph introduction (1000–1200 characters) using only the book’s metadata (title and author).  
The first paragraph should clearly introduce the book’s core themes and what it is about.  
The second paragraph should be an overview of the book.
These both paragraph should be blend completely, these both should look connecting to each.

Instructions for Introduction:

a. Use a conversational and emotionally intelligent tone, written in neutral third-person or implicit voice — do not use direct second-person phrasing.

b. Do not write in a meta-referential tone anywhere in the Introduction.  
This means: do not describe, introduce, or explain the book, the text, the material, or how it is written.  
Do not position yourself as summarizing or presenting content to the reader.  
Do not refer to "the book", "this material", "this text", "this document", "this book", "the narrative", "these pages", or any form of "what the book does" — not just in words, but in tone.

c. Instead, write as if the ideas, themes, and questions naturally exist and speak for themselves.  

d. The writing should feel immersive and idea-centered — as if inviting the reader into the world of the ideas themselves.  

e. You can use the book & author's name for only once just for engagement, It's not necessary to add this at very first line of introduction, instead you can blend it properly with a good paragraph and use where it has more effect.
for eg:- "The Psychology of Money by Morgan Housel explores the subtle, deeply personal ways that attitudes..", "The world of Rich Dad, Poor Dad by Robert T. Kiyosaki explores the powerful influence of early financial education". 

f. End the introduction with a subtle transition into the summary. because the next step here will be a full summary of the book.


2️⃣ After that, write exactly the heading: **What You’ll Get Out of This Book** on its own line.

Then, write a short section (250–400 characters).  
Clearly describe what knowledge, mindset shifts, perspectives, or practical value the reader will gain from reading the book.  
Write this section in **explicit second-person voice**, using direct phrasing such as: "You will learn", "You can expect to gain", "You will discover", etc. — this section should directly address the reader and preview the personal benefits of engaging with the material.  
Do not use meta-referential phrases or words such as: "the book", "this book", "summary", "in this summary", "readers", or similar.

Important style and phrasing rules for both sections:
- Start the first section with the literal text: **Introduction:** on its own line.
- The second section must start with the heading: **What You’ll Get Out of This Book**.
- Do not add any other headings, labels, or extra spacing.
- Write in fluent, human-sounding English.
- Avoid mechanical phrasing or AI clichés. The tone should feel modern and accessible.

You will receive only the book’s metadata (title, author). Base your writing only on that.`;

    const userPrompt = `Book Title: ${metaOfBook.title}
Author: ${metaOfBook.author}`;

    const completion = await client.chat.completions.create({
      model: deployment,
      temperature: 0.5,
      top_p: 0,
      max_tokens: 8000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const rawResult = completion.choices[0].message.content;
    const cleanedResult = formattingService.cleanIntroText(rawResult);

    const filePath = path.join(outputDir, `${metaOfBook.bookId}.md`);
    fs.writeFileSync(filePath, cleanedResult, 'utf-8');

    console.log(`✅ Intro + What You Will Get saved to: ${filePath}`);
    return cleanedResult;
  } catch (err) {
    console.error('❌ Error generating intro + what you will get:', err);
    throw err;
  }
}

async function runBatch() {
  const csvFilePath = '../non-fiction-books-db/books.csv';
  const books = await parseCsv(csvFilePath);

  console.log('books', books)

  for (const book of books) {
    // Skip if already done
    if (book.introdone?.toLowerCase() === 'true') {
      console.log(`➡️ Skipping bookId ${book.book_id} (already done)`);
      continue;
    }

    console.log(`🚀 Processing bookId ${book.book_id} - "${book.title}"`);

    const metaOfBook = {
      bookId: book.book_id,
      title: book.title,
      author: book.author,
      // description: book.description,
    };

    try {
      await generateIntroAndWhatYouWillGet(metaOfBook);

      // Mark as done
      await updateCsvRowByBookId(csvFilePath, book.book_id, (record) => {
        return {
          ...record,
          introdone: 'true',
        };
      });

      console.log(`✅ Marked bookId ${book.book_id} as introdone`);
    } catch (err) {
      console.error(`❌ Failed to process bookId ${book.book_id}`, err);
    }

    await delayWithCountdown(3);
  }

  console.log('🎉 All books processed!');
}

async function delayWithCountdown(seconds) {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`⏳ ${i} `);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log('');
}

runBatch();