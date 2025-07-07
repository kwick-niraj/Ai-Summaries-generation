import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import csv from 'csv-parser';

export class ProcessedBookTracker {
  constructor(csvPath = path.join('Audio', 'logs', 'processed_book_ids.csv')) {
    if (!csvPath.endsWith('.csv')) {
      throw new Error(`❌ Invalid CSV path: Expected a .csv file but got "${csvPath}"`);
    }

    this.csvPath = csvPath;
    this.bookMap = new Map(); // book_id -> isProcessed
  }

  async initialize() {
    console.log('🔍 Tracker loading from:', this.csvPath);

    // Ensure parent directory exists
    const dir = path.dirname(this.csvPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create file if not exists
    if (!fs.existsSync(this.csvPath)) {
      const writer = createObjectCsvWriter({
        path: this.csvPath,
        header: [
          { id: 'book_id', title: 'book_id' },
          { id: 'isProcessed', title: 'isProcessed' }
        ]
      });
      await writer.writeRecords([]); // create empty file with headers
      console.log(`📄 Created new CSV file at ${this.csvPath}`);
    }

    // Load entries
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.csvPath);

      stream.on('error', (err) => {
        console.error('❌ Error reading CSV file:', err.message);
        reject(err);
      });

      stream
        .pipe(csv())
        .on('data', (row) => {
          this.bookMap.set(row.book_id, row.isProcessed === 'true');
        })
        .on('end', () => {
          console.log(`✅ Loaded ${this.bookMap.size} processed books`);
          resolve();
        })
        .on('error', reject);
    });
  }

  isAlreadyProcessed(bookId) {
    return this.bookMap.get(bookId) === true;
  }

  async markAsProcessed(bookId) {
    this.bookMap.set(bookId, true);

    const writer = createObjectCsvWriter({
      path: this.csvPath,
      header: [
        { id: 'book_id', title: 'book_id' },
        { id: 'isProcessed', title: 'isProcessed' }
      ],
      append: false
    });

    const records = Array.from(this.bookMap.entries()).map(([book_id, isProcessed]) => ({
      book_id,
      isProcessed: isProcessed ? 'true' : 'false'
    }));

    await writer.writeRecords(records);
    console.log(`📝 Updated processed_book_ids.csv (${records.length} total records)`);
  }
}