import dbClient from "./db.js";

async function updateMetaOfBook(bookId, isSummaryGenerated) {
  await dbClient.query(
    'UPDATE book_meta SET is_summary_generated = $1 WHERE book_id = $2',
    [isSummaryGenerated, bookId]
  );
  console.log(`✅ Summary saved to DB for book ID: ${bookId}`);
}

async function getBookMetadata() {
  const res = await dbClient.query('SELECT * FROM book_meta WHERE is_summary_generated IS NOT true limit 1');
  if (res.rows.length === 0) throw new Error(`No book found for ID: ${bookId}`);
  return res.rows[0];
}

(async () => {
  try {
    await dbClient.connect();
    console.log('✅ Connected to PostgreSQL');

    const book = await getBookMetadata(12);
    console.log('📚 Book metadata:', book);

    await dbClient.end();
    console.log('✅ PostgreSQL connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();

export default {
  updateMetaOfBook,
  getBookMetadata,
}