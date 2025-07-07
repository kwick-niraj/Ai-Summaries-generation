const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;

// 👇 Update this path to your actual folder path
const booksDirectory = path.join(__dirname, '../output'); // e.g., ./books/

// 👇 Output CSV file path
const outputCsvPath = path.join(__dirname, '../logs/processed_book_ids.csv');

// Set up the CSV writer with an extra column: isProcessed
const writer = csvWriter({
  path: outputCsvPath,
  header: [
    { id: 'book_id', title: 'book_id' },
    { id: 'isProcessed', title: 'isProcessed' },
  ],
});

(async () => {
  try {
    const items = fs.readdirSync(booksDirectory, { withFileTypes: true });

    // Only keep directories (assumed to be book_id), and add isProcessed: true
    const bookFolders = items
      .filter(item => item.isDirectory())
      .map(dir => ({
        book_id: dir.name,
        isProcessed: 'true',
      }));

    if (bookFolders.length === 0) {
      console.log('No folders found inside the directory.');
      return;
    }

    // Write to CSV
    await writer.writeRecords(bookFolders);
    console.log(`✅ Saved ${bookFolders.length} book_id(s) to ${outputCsvPath}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();