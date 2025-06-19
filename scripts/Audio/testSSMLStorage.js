import { BookProcessor } from './pipeline/bookProcessor.js';
import fs from 'fs';
import path from 'path';

/**
 * Test script to demonstrate SSML storage functionality
 */
async function testSSMLStorage() {
  console.log('🎵 Testing SSML Storage Functionality\n');

  try {
    // Create a test processor with SSML enabled
    const processor = new BookProcessor({
      intelligentVoiceSelection: true,
      enableSSML: true,
      metadataDir: 'Meta of All Books DB',
      outputDir: 'scripts/Audio/output/test_ssml',
      skipExisting: false // Force reprocessing for testing
    });

    // Test with Rich Dad Poor Dad (Book ID: 1159)
    const bookId = '1159';
    const inputPath = `FinalAllSummaries/${bookId}.md`;

    console.log(`📖 Testing SSML storage for book: ${bookId}`);
    console.log(`📄 Input file: ${inputPath}`);

    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`❌ Input file not found: ${inputPath}`);
      console.log('Available files in FinalAllSummaries:');
      const files = fs.readdirSync('FinalAllSummaries').filter(f => f.endsWith('.md')).slice(0, 10);
      files.forEach(file => console.log(`  - ${file}`));
      return;
    }

    // Process the book
    console.log('\n🚀 Starting book processing...');
    const result = await processor.processBook(bookId, inputPath);

    if (result.success) {
      console.log('\n✅ Book processing completed successfully!');
      
      // Check what SSML files were created
      const outputDir = path.join('scripts/Audio/output/test_ssml', bookId);
      console.log('\n📁 Checking generated files...');
      
      // Check for complete SSML file
      const completeSSMLPath = path.join(outputDir, `${bookId}_ssml.xml`);
      if (fs.existsSync(completeSSMLPath)) {
        const stats = fs.statSync(completeSSMLPath);
        console.log(`✅ Complete SSML file: ${completeSSMLPath} (${(stats.size / 1024).toFixed(1)} KB)`);
        
        // Show first few lines of SSML
        const ssmlContent = fs.readFileSync(completeSSMLPath, 'utf-8');
        const preview = ssmlContent.split('\n').slice(0, 15).join('\n');
        console.log('\n📝 SSML Preview:');
        console.log('─'.repeat(50));
        console.log(preview);
        console.log('─'.repeat(50));
      }

      // Check for individual section files
      const ssmlDir = path.join(outputDir, 'ssml');
      if (fs.existsSync(ssmlDir)) {
        const ssmlFiles = fs.readdirSync(ssmlDir);
        console.log(`\n📂 Individual SSML files (${ssmlFiles.length}):`);
        ssmlFiles.forEach(file => {
          const filePath = path.join(ssmlDir, file);
          const stats = fs.statSync(filePath);
          console.log(`  - ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
        });
      }

      // Check optimized text with SSML info
      if (result.optimizedTextSaved?.ssmlSaved) {
        console.log('\n🎵 SSML Storage Results:');
        const ssmlResult = result.optimizedTextSaved.ssmlSaved;
        console.log(`  Total files saved: ${ssmlResult.savedFiles.length}`);
        console.log(`  Total size: ${(ssmlResult.totalSize / 1024).toFixed(1)} KB`);
        console.log(`  SSML directory: ${ssmlResult.ssmlDirectory}`);
      }

      // Show voice selection info
      if (result.voiceSelection) {
        console.log('\n🎤 Voice Selection:');
        console.log(`  Selected voice: ${result.voiceSelection.selectedVoice}`);
        console.log(`  Confidence: ${result.voiceSelection.confidence}%`);
        console.log(`  Reasoning: ${result.voiceSelection.reasoning}`);
      }

      // Show processing report location
      const reportPath = path.join(outputDir, 'processing_report.json');
      if (fs.existsSync(reportPath)) {
        console.log(`\n📋 Processing report: ${reportPath}`);
      }

      console.log('\n🎉 SSML storage test completed successfully!');
      console.log('\n📍 Review the generated files in:');
      console.log(`   ${outputDir}`);

    } else {
      console.error('\n❌ Book processing failed');
      if (result.errors.length > 0) {
        console.log('\nErrors:');
        result.errors.forEach(error => {
          console.log(`  - ${error.type}: ${error.message}`);
        });
      }
    }

  } catch (error) {
    console.error('\n💥 Test failed:', error);
    console.error(error.stack);
  }
}

// Helper function to show file structure
function showFileStructure(dir, prefix = '') {
  try {
    const items = fs.readdirSync(dir);
    items.forEach((item, index) => {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      const isLast = index === items.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      
      if (stats.isDirectory()) {
        console.log(`${prefix}${connector}📁 ${item}/`);
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        showFileStructure(itemPath, newPrefix);
      } else {
        const size = stats.size > 1024 ? `${(stats.size / 1024).toFixed(1)}KB` : `${stats.size}B`;
        console.log(`${prefix}${connector}📄 ${item} (${size})`);
      }
    });
  } catch (error) {
    console.log(`${prefix}❌ Error reading directory: ${error.message}`);
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSSMLStorage().catch(console.error);
}

export { testSSMLStorage };
