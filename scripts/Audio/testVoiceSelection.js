import { VoiceSelector } from './pipeline/voiceSelector.js';
import { TextOptimizer } from './pipeline/textOptimizer.js';

/**
 * Test script to demonstrate the new voice selection and SSML generation features
 */
async function testVoiceSelection() {
  console.log('🎤 Testing Voice Selection and SSML Generation\n');

  const voiceSelector = new VoiceSelector();
  const textOptimizer = new TextOptimizer();

  // Test voice selection for Rich Dad Poor Dad
  console.log('📖 Testing voice selection for "Rich Dad Poor Dad" (Book ID: 1159)...');
  
  try {
    const voiceConfig = await voiceSelector.selectVoiceForBook('1159', 'Meta of All Books DB');
    
    console.log('\n🎯 Voice Selection Results:');
    console.log(`Selected Voice: ${voiceConfig.selectedVoice}`);
    console.log(`Confidence: ${voiceConfig.confidence}%`);
    console.log(`Reasoning: ${voiceConfig.reasoning}`);
    console.log('\n📊 Analysis:');
    console.log(`Author Gender: ${voiceConfig.analysis.authorGender}`);
    console.log(`Genres: ${voiceConfig.analysis.genres.join(', ')}`);
    console.log(`Authority Level: ${voiceConfig.analysis.authorityLevel}`);
    console.log(`Content Style: ${voiceConfig.analysis.contentStyle}`);

    // Test SSML generation
    console.log('\n🎵 Testing SSML Generation...');
    
    const sampleText = `Welcome to Rich Dad Poor Dad. This book will challenge everything you thought you knew about money and wealth building. The most important principle is this: assets put money in your pocket, while liabilities take money out. Understanding this distinction will change your financial future.`;

    const ssmlOutput = textOptimizer.generateSSML(sampleText, 'introduction', voiceConfig.ssmlConfig);
    
    console.log('\n📝 Sample SSML Output:');
    console.log(ssmlOutput);

    // Test different section types
    console.log('\n🔄 Testing different section types...');
    
    const chapterText = `Rich Dad taught me that the poor and middle class work for money, but the rich make money work for them. This mindset shift is crucial for building wealth.`;
    const chapterSSML = textOptimizer.generateSSML(chapterText, 'chapter', voiceConfig.ssmlConfig);
    
    console.log('\n📚 Chapter SSML:');
    console.log(chapterSSML);

    console.log('\n✅ Voice selection and SSML generation test completed successfully!');
    
    return {
      voiceConfig,
      ssmlSamples: {
        introduction: ssmlOutput,
        chapter: chapterSSML
      }
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Test batch voice selection
async function testBatchVoiceSelection() {
  console.log('\n🎭 Testing Batch Voice Selection...');
  
  const voiceSelector = new VoiceSelector();
  const testBookIds = ['1159', '746', '101']; // Test with a few book IDs
  
  try {
    const batchResults = await voiceSelector.batchSelectVoices(testBookIds, 'Meta of All Books DB');
    
    console.log('\n📊 Batch Selection Results:');
    console.log(`Total: ${batchResults.summary.total}`);
    console.log(`Successful: ${batchResults.summary.successful}`);
    console.log(`Failed: ${batchResults.summary.failed}`);
    
    console.log('\n🎤 Voice Selections:');
    Object.entries(batchResults.results).forEach(([bookId, config]) => {
      console.log(`Book ${bookId}: ${config.selectedVoice} (${config.confidence}% confidence)`);
    });

    return batchResults;

  } catch (error) {
    console.error('❌ Batch test failed:', error);
    throw error;
  }
}

// Run tests
async function runTests() {
  try {
    console.log('🚀 Starting Voice Selection and SSML Tests\n');
    
    // Test individual voice selection
    const individualTest = await testVoiceSelection();
    
    // Test batch voice selection
    const batchTest = await testBatchVoiceSelection();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ Individual voice selection: PASSED');
    console.log('✅ SSML generation: PASSED');
    console.log('✅ Batch voice selection: PASSED');
    
    return {
      individual: individualTest,
      batch: batchTest
    };

  } catch (error) {
    console.error('\n💥 Tests failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { testVoiceSelection, testBatchVoiceSelection, runTests };
