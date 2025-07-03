#!/usr/bin/env node

import { BookProcessor } from './pipeline/bookProcessor.js';
import { getConfig } from './config/audioConfig.js';

/**
 * Test script to demonstrate the new error handling functionality
 */

async function testErrorHandling() {
  console.log('🧪 Testing Enhanced Error Handling');
  console.log('==================================\n');

  // Test configurations
  const testConfigs = [
    {
      name: 'Strict Mode (Default)',
      config: {
        ...getConfig('test'),
        strictMode: true,
        maxRetries: 2,
        retryDelay: 500,
        inputDir: './FinalAllSummaries',
        outputDir: './scripts/Audio/output/test-strict',
        skipExisting: false,
        trackProcessing: true
      }
    },
    {
      name: 'Lenient Mode',
      config: {
        ...getConfig('test'),
        strictMode: false,
        maxRetries: 2,
        retryDelay: 500,
        inputDir: './FinalAllSummaries',
        outputDir: './scripts/Audio/output/test-lenient',
        skipExisting: false,
        trackProcessing: true
      }
    }
  ];

  for (const testCase of testConfigs) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log('─'.repeat(50));
    
    try {
      const processor = new BookProcessor(testCase.config);
      
      // Test with a single book (use the first available book)
      const bookFiles = processor.getBookFiles();
      if (bookFiles.length === 0) {
        console.log('❌ No books found for testing');
        continue;
      }
      
      const testBook = bookFiles[0];
      console.log(`📖 Testing with book: ${testBook.bookId}`);
      
      const result = await processor.processBook(testBook.bookId, testBook.filePath);
      
      console.log('\n📊 Test Results:');
      console.log(`✅ Success: ${result.success}`);
      console.log(`⏭️ Skipped: ${result.skipped}`);
      
      if (result.errorDetails) {
        console.log(`❌ Error Stage: ${result.errorDetails.stage}`);
        console.log(`❌ Error Message: ${result.errorDetails.error}`);
        console.log(`🔄 Retry Attempts: ${result.retryAttempts || 0}`);
      }
      
      if (result.success) {
        console.log(`📄 Sections: ${result.stats.totalSections}`);
        console.log(`🎵 Audio Files: ${result.stats.totalAudioFiles}`);
        console.log(`⏱️ Duration: ${result.stats.totalDuration}s`);
      }
      
    } catch (error) {
      console.error(`💥 Test failed: ${error.message}`);
    }
  }

  console.log('\n🎉 Error handling tests completed!');
  console.log('\n📋 Check the CSV logs to see how failures are tracked:');
  console.log('   - scripts/Audio/logs/book_processing_tracker.csv');
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testErrorHandling().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export { testErrorHandling };
