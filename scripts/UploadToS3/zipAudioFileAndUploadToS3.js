const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const AWS = require('aws-sdk');

// CONFIG
const BOOKS_DIR = path.resolve('./Audio/output');
const ZIP_DIR = path.resolve('./zips');
const TRACKER_PATH = './UploadToS3/tracker.json';
const BUCKET_NAME = 'raw-book-audios';
const BATCH_SIZE = 50;

// AWS CONFIG
const s3 = new AWS.S3({
  region: 'us-east-1',
});

// Load or initialize tracking JSON
function loadTracker() {
  if (!fs.existsSync(TRACKER_PATH)) {
    fs.writeJSONSync(TRACKER_PATH, {});
  }
  return fs.readJSONSync(TRACKER_PATH);
}

function saveTracker(tracker) {
  fs.writeJSONSync(TRACKER_PATH, tracker, { spaces: 2 });
}

// Zip multiple folders
function zipFolders(batchBookIds, destZipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    for (const bookId of batchBookIds) {
      const folderPath = path.join(BOOKS_DIR, String(bookId));
      if (fs.existsSync(folderPath)) {
        archive.directory(folderPath, String(bookId));
      }
    }

    archive.finalize();
  });
}

// Upload ZIP to S3
async function uploadToS3(zipName, zipPath) {
  const key = `zips/${zipName}`;
  const zipStream = fs.createReadStream(zipPath);
  await s3.upload({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: zipStream,
    ContentType: 'application/zip',
  }).promise();
}

async function main() {
  await fs.ensureDir(ZIP_DIR);
  const tracker = loadTracker();
  const allFolders = await fs.readdir(BOOKS_DIR);

  const eligibleBookIds = allFolders
    .filter((folder) => /^\d+$/.test(folder))
    .map(Number)
    .filter((id) => id < 2702 && (!tracker[id] || !tracker[id].isUploaded))
    .sort((a, b) => a - b);

  const batches = [];

  for (let i = 0; i < eligibleBookIds.length; i += BATCH_SIZE) {
    const batch = eligibleBookIds.slice(i, i + BATCH_SIZE);
    if (batch.length > 0) batches.push(batch);
  }

  if (batches.length === 0) {
    console.log('✅ No eligible books left to zip/upload.');
    return;
  }

  for (const batchBookIds of batches) {
    const lastBookId = batchBookIds[batchBookIds.length - 1];
    const zipName = `${lastBookId}.zip`;
    const zipPath = path.join(ZIP_DIR, zipName);

    try {
      console.log(`🔐 Zipping batch ending at ${lastBookId}...`);
      await zipFolders(batchBookIds, zipPath);

      for (const id of batchBookIds) {
        tracker[id] = { isZipped: true, isUploaded: false };
      }
      saveTracker(tracker);

      console.log(`☁️ Uploading ${zipName} to S3...`);
      await uploadToS3(zipName, zipPath);

      for (const id of batchBookIds) {
        tracker[id].isUploaded = true;
      }
      saveTracker(tracker);

      console.log(`🧹 Deleting local zip: ${zipPath}`);
      await fs.remove(zipPath);

      console.log(`✅ Batch ${zipName} complete.`);
    } catch (err) {
      console.error(`❌ Failed processing batch ${zipName}:`, err);
    }
  }
}

main();