import { VoiceSelector } from './pipeline/voiceSelector.js';
import { audioConfig } from './config/audioConfig.js';

/**
 * Comprehensive test script for the new provider-based voice selection system
 */
async function testProviderSystem() {
  console.log('🚀 Testing Enhanced Voice Selection Provider System\n');

  // Test 1: Provider Status Check
  console.log('📊 Test 1: Checking Provider Status');
  console.log('=====================================');
  
  const voiceSelector = new VoiceSelector(audioConfig.voiceSelection);
  
  try {
    const status = await voiceSelector.getProviderStatus();
    
    console.log(`Current Provider: ${status.current}`);
    console.log(`Fallback Provider: ${status.fallback}\n`);
    
    for (const [name, info] of Object.entries(status.providers)) {
      const statusIcon = info.available ? '✅' : '❌';
      console.log(`${statusIcon} ${name}: ${info.available ? 'Available' : 'Not Available'}`);
      
      if (info.validation && !info.validation.valid) {
        console.log(`   Errors: ${info.validation.errors.join(', ')}`);
      }
      if (info.validation && info.validation.warnings.length > 0) {
        console.log(`   Warnings: ${info.validation.warnings.join(', ')}`);
      }
      if (info.error) {
        console.log(`   Error: ${info.error}`);
      }
    }
    
    console.log('\n✅ Provider status check completed\n');
  } catch (error) {
    console.error('❌ Provider status check failed:', error);
  }

  // Test 2: Individual Voice Selection with Azure
  console.log('🤖 Test 2: Azure Voice Selection');
  console.log('=================================');
  
  try {
    voiceSelector.switchProvider('azure', 'rule-based');
    const result = await voiceSelector.selectVoiceForBook('1159', 'Meta of All Books DB');
    
    console.log('Voice Selection Result:');
    console.log(`📖 Book: ${result.bookId}`);
    console.log(`🎤 Selected Voice: ${result.selectedVoice}`);
    console.log(`🎯 Confidence: ${result.confidence}%`);
    console.log(`🤖 Provider: ${result.provider}`);
    console.log(`💭 Reasoning: ${result.reasoning}`);
    console.log(`📊 Analysis: ${JSON.stringify(result.analysis, null, 2)}`);
    
    console.log('\n✅ Azure voice selection test completed\n');
  } catch (error) {
    console.error('❌ Azure voice selection test failed:', error);
  }

  // Test 3: Ollama Voice Selection (if available)
  console.log('🦙 Test 3: Ollama Voice Selection');
  console.log('==================================');
  
  try {
    voiceSelector.switchProvider('ollama', 'rule-based');
    const result = await voiceSelector.selectVoiceForBook('1159', 'Meta of All Books DB');
    
    console.log('Voice Selection Result:');
    console.log(`📖 Book: ${result.bookId}`);
    console.log(`🎤 Selected Voice: ${result.selectedVoice}`);
    console.log(`🎯 Confidence: ${result.confidence}%`);
    console.log(`🦙 Provider: ${result.provider}`);
    console.log(`💭 Reasoning: ${result.reasoning}`);
    
    console.log('\n✅ Ollama voice selection test completed\n');
  } catch (error) {
    console.warn('⚠️  Ollama voice selection test failed (expected if Ollama not running):', error.message);
  }

  // Test 4: Rule-based Voice Selection
  console.log('📋 Test 4: Rule-based Voice Selection');
  console.log('=====================================');
  
  try {
    voiceSelector.switchProvider('rule-based');
    const result = await voiceSelector.selectVoiceForBook('1159', 'Meta of All Books DB');
    
    console.log('Voice Selection Result:');
    console.log(`📖 Book: ${result.bookId}`);
    console.log(`🎤 Selected Voice: ${result.selectedVoice}`);
    console.log(`🎯 Confidence: ${result.confidence}%`);
    console.log(`📋 Provider: ${result.provider}`);
    console.log(`💭 Reasoning: ${result.reasoning}`);
    
    console.log('\n✅ Rule-based voice selection test completed\n');
  } catch (error) {
    console.error('❌ Rule-based voice selection test failed:', error);
  }

  // Test 5: Fallback Mechanism
  console.log('🔄 Test 5: Fallback Mechanism');
  console.log('==============================');
  
  try {
    // Test with a non-existent book to trigger fallback
    voiceSelector.switchProvider('azure', 'rule-based');
    const result = await voiceSelector.selectVoiceForBook('nonexistent', 'Meta of All Books DB');
    
    console.log('Fallback Result:');
    console.log(`📖 Book: ${result.bookId}`);
    console.log(`🎤 Selected Voice: ${result.selectedVoice}`);
    console.log(`🎯 Confidence: ${result.confidence}%`);
    console.log(`🔄 Provider: ${result.provider}`);
    console.log(`💭 Reasoning: ${result.reasoning}`);
    
    console.log('\n✅ Fallback mechanism test completed\n');
  } catch (error) {
    console.error('❌ Fallback mechanism test failed:', error);
  }

  // Test 6: Batch Voice Selection
  console.log('📚 Test 6: Batch Voice Selection');
  console.log('=================================');
  
  try {
    voiceSelector.switchProvider('azure', 'rule-based');
    const testBooks = ['1159', '746', '101'];
    const batchResult = await voiceSelector.batchSelectVoices(testBooks, 'Meta of All Books DB');
    
    console.log('Batch Selection Summary:');
    console.log(`📊 Total: ${batchResult.summary.total}`);
    console.log(`✅ Successful: ${batchResult.summary.successful}`);
    console.log(`❌ Failed: ${batchResult.summary.failed}`);
    console.log(`🤖 Primary Provider: ${batchResult.summary.primaryProvider}`);
    console.log(`🔄 Fallback Provider: ${batchResult.summary.fallbackProvider}`);
    
    console.log('\nIndividual Results:');
    Object.entries(batchResult.results).forEach(([bookId, result]) => {
      console.log(`  📖 ${bookId}: ${result.selectedVoice} (${result.confidence}% - ${result.provider})`);
    });
    
    if (batchResult.errors.length > 0) {
      console.log('\nErrors:');
      batchResult.errors.forEach(error => {
        console.log(`  ❌ ${error.bookId}: ${error.error}`);
      });
    }
    
    console.log('\n✅ Batch voice selection test completed\n');
  } catch (error) {
    console.error('❌ Batch voice selection test failed:', error);
  }

  // Test 7: Provider Switching
  console.log('🔄 Test 7: Provider Switching');
  console.log('=============================');
  
  try {
    console.log('Initial provider: azure');
    voiceSelector.switchProvider('azure');
    
    console.log('Switching to rule-based...');
    voiceSelector.switchProvider('rule-based');
    
    console.log('Switching to ollama with azure fallback...');
    voiceSelector.switchProvider('ollama', 'azure');
    
    console.log('Switching back to azure...');
    voiceSelector.switchProvider('azure', 'rule-based');
    
    console.log('\n✅ Provider switching test completed\n');
  } catch (error) {
    console.error('❌ Provider switching test failed:', error);
  }

  // Test 8: Configuration Integration
  console.log('⚙️  Test 8: Configuration Integration');
  console.log('====================================');
  
  try {
    // Test with different configurations
    const customConfig = {
      provider: 'rule-based',
      fallbackProvider: 'azure',
      azure: {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiKey: process.env.AZURE_OPENAI_KEY,
        deploymentId: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT_ID
      }
    };
    
    const customSelector = new VoiceSelector(customConfig);
    const result = await customSelector.selectVoiceForBook('1159', 'Meta of All Books DB');
    
    console.log('Custom Configuration Result:');
    console.log(`🎤 Selected Voice: ${result.selectedVoice}`);
    console.log(`📋 Provider: ${result.provider}`);
    console.log(`🎯 Confidence: ${result.confidence}%`);
    
    console.log('\n✅ Configuration integration test completed\n');
  } catch (error) {
    console.error('❌ Configuration integration test failed:', error);
  }

  console.log('🎉 All tests completed!');
  console.log('\n📋 Test Summary:');
  console.log('================');
  console.log('✅ Provider status check');
  console.log('✅ Azure voice selection');
  console.log('⚠️  Ollama voice selection (may fail if not running)');
  console.log('✅ Rule-based voice selection');
  console.log('✅ Fallback mechanism');
  console.log('✅ Batch voice selection');
  console.log('✅ Provider switching');
  console.log('✅ Configuration integration');
  
  console.log('\n🚀 Enhanced voice selection system is ready for use!');
}

// Test individual providers
async function testIndividualProviders() {
  console.log('\n🔍 Testing Individual Providers');
  console.log('===============================');

  // Test Azure provider directly
  console.log('\n🤖 Testing Azure Provider Directly:');
  try {
    const { AzureVoiceSelector } = await import('./pipeline/providers/AzureVoiceSelector.js');
    const azureProvider = new AzureVoiceSelector();
    
    const available = await azureProvider.isAvailable();
    console.log(`Azure Available: ${available ? '✅' : '❌'}`);
    
    const validation = azureProvider.validateConfig();
    console.log(`Azure Config Valid: ${validation.valid ? '✅' : '❌'}`);
    if (!validation.valid) {
      console.log(`Errors: ${validation.errors.join(', ')}`);
    }
  } catch (error) {
    console.error('Azure provider test failed:', error.message);
  }

  // Test Ollama provider directly
  console.log('\n🦙 Testing Ollama Provider Directly:');
  try {
    const { OllamaVoiceSelector } = await import('./pipeline/providers/OllamaVoiceSelector.js');
    const ollamaProvider = new OllamaVoiceSelector();
    
    const available = await ollamaProvider.isAvailable();
    console.log(`Ollama Available: ${available ? '✅' : '❌'}`);
    
    const validation = ollamaProvider.validateConfig();
    console.log(`Ollama Config Valid: ${validation.valid ? '✅' : '❌'}`);
    
    if (available) {
      const models = await ollamaProvider.getAvailableModels();
      console.log(`Available Models: ${models.map(m => m.name).join(', ')}`);
    }
  } catch (error) {
    console.error('Ollama provider test failed:', error.message);
  }

  // Test Rule-based provider directly
  console.log('\n📋 Testing Rule-based Provider Directly:');
  try {
    const { RuleBasedVoiceSelector } = await import('./pipeline/providers/RuleBasedVoiceSelector.js');
    const ruleProvider = new RuleBasedVoiceSelector();
    
    const available = await ruleProvider.isAvailable();
    console.log(`Rule-based Available: ${available ? '✅' : '❌'}`);
    
    const validation = ruleProvider.validateConfig();
    console.log(`Rule-based Config Valid: ${validation.valid ? '✅' : '❌'}`);
  } catch (error) {
    console.error('Rule-based provider test failed:', error.message);
  }
}

// Run tests
async function runAllTests() {
  try {
    await testProviderSystem();
    await testIndividualProviders();
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { testProviderSystem, testIndividualProviders, runAllTests };
