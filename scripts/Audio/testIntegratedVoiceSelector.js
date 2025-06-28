import { VoiceSelector } from './pipeline/voiceSelector.js';

/**
 * Test the integrated voice selection system with SmartVoiceSelector
 */
async function testIntegratedVoiceSelector() {
  console.log('🧪 Testing Integrated Voice Selection System...\n');

  // Test with different providers
  const testConfigs = [
    {
      name: 'Smart Voice Selector',
      config: { provider: 'smart', fallbackProvider: 'rule-based' }
    },
    {
      name: 'Azure Voice Selector',
      config: { provider: 'azure', fallbackProvider: 'smart' }
    },
    {
      name: 'Rule-Based Voice Selector',
      config: { provider: 'rule-based', fallbackProvider: 'smart' }
    }
  ];

  const testBooks = ['1159', '103', '164', '985'];

  for (const testConfig of testConfigs) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎯 Testing: ${testConfig.name}`);
    console.log(`${'='.repeat(80)}`);

    const voiceSelector = new VoiceSelector(testConfig.config);

    // Get provider status
    const status = await voiceSelector.getProviderStatus();
    console.log(`\n📊 Provider Status:`);
    console.log(`   Current: ${status.current}`);
    console.log(`   Fallback: ${status.fallback}`);
    
    for (const [providerName, providerStatus] of Object.entries(status.providers)) {
      const statusIcon = providerStatus.available ? '✅' : '❌';
      console.log(`   ${statusIcon} ${providerName}: ${providerStatus.available ? 'Available' : 'Not Available'}`);
    }

    // Test voice selection for a few books
    console.log(`\n🎤 Testing voice selection for sample books:`);
    
    for (const bookId of testBooks.slice(0, 2)) { // Test first 2 books for each provider
      try {
        const result = await voiceSelector.selectVoiceForBook(bookId, '../../Meta of All Books DB');
        
        console.log(`\n📖 Book ${bookId}:`);
        console.log(`   Selected Voice: ${result.selectedVoice}`);
        console.log(`   Confidence: ${result.confidence}%`);
        console.log(`   Provider: ${result.provider}`);
        console.log(`   Reasoning: ${result.reasoning}`);
        console.log(`   Azure Voice ID: ${result.voiceCharacteristics?.azureVoiceId || 'N/A'}`);
        
      } catch (error) {
        console.error(`❌ Error testing book ${bookId}:`, error.message);
      }
    }
  }

  // Demonstrate switching providers
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔄 Testing Provider Switching`);
  console.log(`${'='.repeat(80)}`);

  const voiceSelector = new VoiceSelector({ provider: 'azure', fallbackProvider: 'rule-based' });
  
  console.log(`\n📖 Testing book 1159 with different providers:`);
  
  // Test with Azure first
  let result = await voiceSelector.selectVoiceForBook('1159', '../../Meta of All Books DB');
  console.log(`\n🔵 Azure Provider Result:`);
  console.log(`   Voice: ${result.selectedVoice} (${result.confidence}%)`);
  console.log(`   Provider: ${result.provider}`);
  
  // Switch to Smart provider
  voiceSelector.switchProvider('smart', 'rule-based');
  result = await voiceSelector.selectVoiceForBook('1159', '../../Meta of All Books DB');
  console.log(`\n🧠 Smart Provider Result:`);
  console.log(`   Voice: ${result.selectedVoice} (${result.confidence}%)`);
  console.log(`   Provider: ${result.provider}`);
  console.log(`   Reasoning: ${result.reasoning}`);

  // Switch to Rule-based provider
  voiceSelector.switchProvider('rule-based', 'smart');
  result = await voiceSelector.selectVoiceForBook('1159', '../../Meta of All Books DB');
  console.log(`\n📋 Rule-Based Provider Result:`);
  console.log(`   Voice: ${result.selectedVoice} (${result.confidence}%)`);
  console.log(`   Provider: ${result.provider}`);
  console.log(`   Reasoning: ${result.reasoning}`);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ Integration testing completed!`);
  console.log(`${'='.repeat(80)}`);
}

// Test batch voice selection with SmartVoiceSelector
async function testBatchVoiceSelection() {
  console.log('\n🎲 Testing Batch Voice Selection with SmartVoiceSelector...\n');

  const voiceSelector = new VoiceSelector({ 
    provider: 'smart', 
    fallbackProvider: 'rule-based' 
  });

  const testBooks = ['1159', '103', '164', '985'];
  
  const batchResult = await voiceSelector.batchSelectVoices(testBooks, '../../Meta of All Books DB');
  
  console.log(`📊 Batch Selection Summary:`);
  console.log(`   Total Books: ${batchResult.summary.total}`);
  console.log(`   Successful: ${batchResult.summary.successful}`);
  console.log(`   Failed: ${batchResult.summary.failed}`);
  console.log(`   Primary Provider: ${batchResult.summary.primaryProvider}`);
  console.log(`   Fallback Provider: ${batchResult.summary.fallbackProvider}`);

  console.log(`\n📚 Individual Results:`);
  for (const [bookId, result] of Object.entries(batchResult.results)) {
    console.log(`   ${bookId}: ${result.selectedVoice} (${result.confidence}%) - ${result.provider}`);
  }

  if (batchResult.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    batchResult.errors.forEach(error => {
      console.log(`   ${error.bookId}: ${error.error}`);
    });
  }

  // Show voice distribution
  const voiceDistribution = {};
  Object.values(batchResult.results).forEach(result => {
    voiceDistribution[result.selectedVoice] = (voiceDistribution[result.selectedVoice] || 0) + 1;
  });

  console.log(`\n🎤 Voice Distribution:`);
  Object.entries(voiceDistribution)
    .sort(([,a], [,b]) => b - a)
    .forEach(([voice, count]) => {
      console.log(`   ${voice}: ${count} book(s)`);
    });
}

// Run all tests
async function runAllTests() {
  try {
    await testIntegratedVoiceSelector();
    await testBatchVoiceSelection();
    
    console.log(`\n🎉 All tests completed successfully!`);
    console.log(`\n💡 To use SmartVoiceSelector in your pipeline:`);
    console.log(`   1. Set provider to 'smart' in your configuration`);
    console.log(`   2. Use 'rule-based' as fallback for reliability`);
    console.log(`   3. SmartVoiceSelector will automatically:`);
    console.log(`      - Detect author gender from names`);
    console.log(`      - Match voices to content genres`);
    console.log(`      - Use your specified default voice for unknown genders`);
    console.log(`      - Provide detailed reasoning for selections`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runAllTests();
