const fs = require('fs');
const path = require('path');

// === CONFIGURATION ===
const inputDir = './IntroOutputs'; // Folder with your input files (markdown or text)
const introOutputDir = './Intro';
const whatYouGetOutputDir = './WhatYouGet';

// === Ensure output directories exist ===
if (!fs.existsSync(introOutputDir)) fs.mkdirSync(introOutputDir);
if (!fs.existsSync(whatYouGetOutputDir)) fs.mkdirSync(whatYouGetOutputDir);

// === Helper function ===
function extractSections(content) {
    const introRegex = /\*\*?Introduction:?[\*\n]*([\s\S]+?)(?=\*\*?What(?:\s|’)You(?:’|')ll Get Out of This Book|\*\*?What You(?:’|')ll Get|\*\*?What You'll Get|\*\*?What You Will Get|\*\*?What You Will Get Out of This Book|$)/i;

    const whatYouGetRegex = /\*\*?What(?:\s|’)You(?:’|')ll Get Out of This Book:?[\*\n]*([\s\S]+?)(?=\n\s*\*\*|\n\s*##|\n\s*###|$)/i;

    const introMatch = content.match(introRegex);
    const whatYouGetMatch = content.match(whatYouGetRegex);

    const introContent = introMatch ? introMatch[1].trim() : '';
    const whatYouGetContent = whatYouGetMatch ? whatYouGetMatch[1].trim() : '';

    return { introContent, whatYouGetContent };
}

// === Main processing ===
fs.readdirSync(inputDir).forEach(file => {
    const filePath = path.join(inputDir, file);
    if (fs.statSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const { introContent, whatYouGetContent } = extractSections(content);

        // Save Intro section
        if (introContent) {
            const introFilePath = path.join(introOutputDir, file.replace(path.extname(file), '.md'));
            const introFormatted = `## Introduction\n\n${introContent}\n\n---\n`;
            fs.writeFileSync(introFilePath, introFormatted, 'utf-8');
            console.log(`✅ Extracted Intro → ${introFilePath}`);
        } else {
            console.warn(`⚠️ No Intro found in: ${file}`);
        }

        // Save What You'll Get section
        if (whatYouGetContent) {
            const whatYouGetFilePath = path.join(whatYouGetOutputDir, file.replace(path.extname(file), '.md'));
            fs.writeFileSync(whatYouGetFilePath, `${whatYouGetContent}\n`, 'utf-8');
            console.log(`✅ Extracted What You'll Get → ${whatYouGetFilePath}`);
        } else {
            console.warn(`⚠️ No What You'll Get found in: ${file}`);
        }
    }
});

console.log('🎉 Extraction complete.');