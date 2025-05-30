// runSummaries.js

import dbServices from './db-services/services.js';
import dbClient from './db-services/db.js';
import fs from 'fs';
import path from 'path';
import generateFullBookSummary from './generateSummariesAzureOpenAi.js';

let client;

async function runAllBooks() {
  let bookCount = 0;
  while (true) {
    try {
      console.log(`\n🚀 Processing book ${bookCount + 1}...`);

      const meta = await getBookMeta();
      if (!meta) {
        console.log('✅ No more books to process. Exiting loop.');
        break;
      }

      console.log(`BookId: ${meta.bookId} \n Book Title: ${meta.bookTitleFromMetaTable}`)

      const metaOfBook = meta.bookMetaJson;
      const summaryStrategy = meta.summaryStrategy;

      if (!metaOfBook || !summaryStrategy) {
        console.log(`❌ Missing metaOfBook or summaryStrategy for book ${bookCount + 1}. Skipping...`);
        continue;
      }

      await generateFullBookSummary(metaOfBook, summaryStrategy, meta);

      client = await dbClient();
      await client.connect()
      await dbServices.updateMetaOfBook(client, meta.bookId, true)
      bookCount++;
      console.log(`✅ Completed book ${bookCount}. Waiting before next...`);
      await delayWithCountdown(30);
    } catch (err) {
      console.error('❌ Fatal error. Stopping execution:', err.message);
      break;
    }
    finally {
      await client.end();
    }
  }

  console.log(`🎉 All done! Processed ${bookCount} book(s).`);
}

async function getBookMeta(client) {
  try {
    const client = await dbClient();
    await client.connect()
    console.log('✅ Connected to PostgreSQL');

    const book = await dbServices.getBookMetadata(client);
    const bookDetails = {};

    if (book) {
      bookDetails.bookId = book.book_id;
      bookDetails.summaryStrategy = book.summary_structure;
      bookDetails.bookTitleFromMetaTable = book.title;
    }

    console.log('📚 Book metadata:', book);
    await client.end();
    console.log('✅ PostgreSQL connection closed');

    bookDetails.bookMetaJson = getBookMetaJSONById(bookDetails.bookId);

    if (bookDetails.bookMetaJson) {
      console.log('✅ Ready Book Details:', bookDetails);
      return bookDetails;
    }

    throw new Error("Can't get metaOfBook JSON");
  } catch (err) {
    console.error('❌ Error:', err.message);
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

async function delayWithCountdown(seconds) {
  for (let i = seconds; i > 0; i--) {
    console.log(`⏳ Waiting... ${i} second${i !== 1 ? 's' : ''} remaining`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log('✅ Done!');
}

runAllBooks();