import { BookProcessor } from './pipeline/bookProcessor.js';
import { getConfig } from './config/audioConfig.js';

/**
 * Test script to demonstrate the text optimization caching functionality
 */
async function testCaching() {
  console.log('🧪 Testing Text Optimization Caching System');
  console.log('===========================================\n');

  // Test with different cache strategies
  const testConfigs = [
    {
      name: 'Smart Caching (Default)',
      config: getConfig({
        useOptimizedTextCache: true,
        cacheStrategy: 'smart',
        cacheValidityDays: 30,
        forceReoptimization: false,
        outputDir: './scripts/Audio/test_cache_output',
        inputDir: './FinalAllSummaries',
        concurrency: 1,
        verboseLogging: true
      })
    },
    {
      name: 'Always Use Cache',
      config: getConfig({
        useOptimizedTextCache: true,
        cacheStrategy: 'always',
        cacheValidityDays: 90,
        forceReoptimization: false,
        outputDir: './scripts/Audio/test_cache_output',
        inputDir: './FinalAllSummaries',
        concurrency: 1,
        verboseLogging: true
      })
    },
    {
      name: 'Force Reoptimization',
      config: getConfig({
        useOptimizedTextCache: true,
        cacheStrategy: 'smart',
        forceReoptimization: true,
        outputDir: './scripts/Audio/test_cache_output',
        inputDir: './FinalAllSummaries',
        concurrency: 1,
        verboseLogging: true
      })
    },
    {
      name: 'Cache Disabled',
      config: getConfig({
        useOptimizedTextCache: false,
        outputDir: './scripts/Audio/test_cache_output',
        inputDir: './FinalAllSummaries',
        concurrency: 1,
        verboseLogging: true
      })
    }
  ];

  // Test with a single book (you can change this to any book ID you have)
  const testBookId = '1159'; // Change this to a book ID that exists in your FinalAllSummaries

  for (const testConfig of testConfigs) {
    console.log(`\n🔬 Testing: ${testConfig.name}`);
    console.log('─'.repeat(50));
    
    try {
      const processor = new BookProcessor(testConfig.config);
      
      // Print configuration summary
      console.log('\n📋 Configuration:');
      console.log(`   Cache Enabled: ${testConfig.config.useOptimizedTextCache}`);
      console.log(`   Cache Strategy: ${testConfig.config.cacheStrategy}`);
      console.log(`   Cache Validity: ${testConfig.config.cacheValidityDays} days`);
      console.log(`   Force Reoptimization: ${testConfig.config.forceReoptimization}`);
      
      // Find the test book
      const bookFiles = processor.getBookFiles();
      const testBook = bookFiles.find(book => book.bookId === testBookId);
      
      if (!testBook) {
        console.log(`❌ Test book ${testBookId} not found. Available books:`, 
          bookFiles.slice(0, 5).map(b => b.bookId).join(', '), '...');
        continue;
      }
      
      console.log(`\n📖 Processing test book: ${testBookId}`);
      
      const startTime = Date.now();
      const result = await processor.processBook(testBook.bookId, testBook.filePath);
      const endTime = Date.now();
      
      console.log(`\n📊 Results for ${testConfig.name}:`);
      console.log(`   Success: ${result.success ? '✅' : '❌'}`);
      console.log(`   Processing Time: ${((endTime - startTime) / 1000).toFixed(2)}s`);
      console.log(`   Sections: ${result.stats.totalSections}`);
      console.log(`   Words: ${result.stats.totalWords}`);
      
      if (result.optimizedSections) {
        console.log(`   Loaded From: ${result.optimizedSections.loadedFrom || 'fresh_optimization'}`);
        if (result.optimizedSections.cacheInfo) {
          console.log(`   Cache Strategy: ${result.optimizedSections.cacheInfo.strategy || 'N/A'}`);
          console.log(`   Cache Reason: ${result.optimizedSections.cacheInfo.reason}`);
        }
      }
      
      // Print cache statistics
      if (processor.cacheManager) {
        const cacheStats = processor.cacheManager.getStats();
        console.log(`\n💾 Cache Statistics:`);
        console.log(`   Total Checks: ${cacheStats.totalChecks}`);
        console.log(`   Cache Hits: ${cacheStats.cacheHits}`);
        console.log(`   Cache Misses: ${cacheStats.cacheMisses}`);
        console.log(`   Hit Rate: ${cacheStats.hitRate}`);
        console.log(`   Time Saved: ${cacheStats.timeSavedFormatted}`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${testConfig.name}:`, error.message);
    }
    
    console.log('\n' + '='.repeat(60));
  }

  console.log('\n🎉 Caching test completed!');
  console.log('\n📝 Summary:');
  console.log('- Smart caching checks file age and source modification');
  console.log('- Always caching uses any existing cache files');
  console.log('- Force reoptimization ignores cache and regenerates');
  console.log('- Cache disabled performs fresh optimization every time');
  console.log('\n💡 For production use, "smart" strategy is recommended');
}

// Run the test
testCaching().catch(console.error);
