import fs from 'fs';
import path from 'path';

// === CONFIG ===
const IntroOutputFolder = path.resolve('./IntroOutputs');           // Input folder
const outputFolder = path.resolve('./IntroOutputs'); // Optional output folder (can be same as input)
const useOutputFolder = false; // true → write to outputFolder | false → overwrite original files

// Optional list of files to process. Leave empty to process all.
const specificFiles = [
  '1012.md', '1079.md', '1143.md', '1145.md', '1164.md',
  '1213.md', '1226.md', '1333.md', '1350.md', '1355.md',
  '1363.md', '142.md',  '1455.md', '1466.md', '150.md',
  '1539.md', '1598.md', '1672.md', '1729.md', '1753.md',
  '1759.md', '1816.md', '1847.md', '1862.md', '1877.md',
  '1891.md', '1995.md', '2011.md', '2030.md', '2058.md',
  '208.md',  '220.md',  '2233.md', '2241.md', '2303.md',
  '2340.md', '2404.md', '2410.md', '2467.md', '2519.md',
  '2532.md', '2697.md', '271.md',  '2862.md', '2906.md',
  '2978.md', '3019.md', '3049.md', '3083.md', '3086.md',
  '3107.md', '3137.md', '3162.md', '3173.md', '3208.md',
  '3225.md', '431.md',  '436.md',  '555.md',  '765.md',
  '784.md',  '801.md',  '863.md',  '870.md',  '884.md',
  '92.md',   '953.md',  '956.md'
]; // e.g., ['1234.md', '5678.md']

// === HEADINGS TO BOLD ===
const targets = [
  'What You’ll Get Out of This Book',
  'Introduction:'
];

// === Main Function ===
function formatHeadingsInMetaFiles(folderPath, filenames = []) {
  if (!fs.existsSync(folderPath)) {
    console.error(`❌ Folder not found: ${folderPath}`);
    return;
  }

  if (useOutputFolder && !fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const files = filenames.length > 0 ? filenames : fs.readdirSync(folderPath);
  const updatedFiles = [];

  files.forEach((file) => {
    const filePath = path.join(folderPath, file);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      let content = fs.readFileSync(filePath, 'utf-8');
      const originalContent = content;

      // Apply heading replacements
      targets.forEach(text => {
        const regex = new RegExp(`^${text}$`, 'gm'); // Match line exactly
        content = content.replace(regex, `**${text}**`);
      });

      if (content !== originalContent) {
        const destinationPath = useOutputFolder
          ? path.join(outputFolder, file)
          : filePath;

        fs.writeFileSync(destinationPath, content, 'utf-8');
        updatedFiles.push(file);
        console.log(`✅ Updated: ${file}`);
      }
    }
  });

  console.log(`\n🎉 Done. ${updatedFiles.length} file(s) updated.`);
}

// === RUN ===
formatHeadingsInMetaFiles(IntroOutputFolder, specificFiles);