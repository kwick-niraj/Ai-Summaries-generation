import dbClient from "./db.js";

async function updateMetaOfBook(client, bookId, isSummaryGenerated) {
  await client.query(
    'UPDATE book_meta SET is_summary_generated = $1 WHERE book_id = $2',
    [isSummaryGenerated, bookId]
  );
  console.log(`✅ Summary saved to DB for book ID: ${bookId}`);
}

async function getBookMetadata(client) {
  const res = await client.query('SELECT * FROM book_meta WHERE is_summary_generated IS NOT true limit 1');
  if (res.rows.length === 0) throw new Error(`No book found for ID: ${bookId}`);
  return res.rows[0];
}

export default {
  updateMetaOfBook,
  getBookMetadata,
}