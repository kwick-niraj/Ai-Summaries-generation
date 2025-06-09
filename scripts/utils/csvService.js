import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export async function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
  return records;
}

export async function updateCsv(filePath, records) {
  const output = stringify(records, {
    header: true,
  });
  fs.writeFileSync(filePath, output, 'utf-8');
}

export async function updateCsvRowByBookId(filePath, bookId, updateFn) {
  const records = await parseCsv(filePath);

  const updatedRecords = records.map((record) => {
    if (record.book_id === bookId) {
      return updateFn(record);
    } else {
      return record;
    }
  });

  const output = stringify(updatedRecords, {
    header: true,
  });

  fs.writeFileSync(filePath, output, 'utf-8');
}