import { HybridVoiceSelector } from './pipeline/providers/HybridVoiceSelector.js';
import { VoiceSelector } from './pipeline/voiceSelector.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Test the new Hybrid Voice Selection system
 */
async function testHybridVoiceSelector() {
  console.log('🔀 Testing Hybrid Voice Selection System');
  console.log('========================================\n');

  // Test 1: Direct HybridVoiceSelector usage
  console.log('📋 Test 1: Direct HybridVoiceSelector');
  const hybridSelector = new HybridVoiceSelector({
    ollama: {
      endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3.1:latest',
      timeout: 30000
    }
  });

  // Check availability
  const isAvailable = await hybridSelector.isAvailable();
  console.log(`✅ Hybrid provider available: ${isAvailable}`);

  // Get provider status
  const status = await hybridSelector.getProviderStatus();
  console.log('📊 Provider Status:', JSON.stringify(status, null, 2));

  // Test with sample book metadata
  const sampleBooks = [
    {
      title: "Rich Dad Poor Dad",
      author: "Robert Kiyosaki",
      genre: ["Business", "Money & Investments"],
      core_themes: ["financial literacy", "investing", "wealth building"]
    },
    {
      title: "The 7 Habits of Highly Effective People",
      author: "Stephen Covey",
      genre: ["Self-Help", "Personal Development"],
      core_themes: ["leadership", "personal effectiveness", "character development"]
    },
    {
      title: "Becoming",
      author: "Michelle Obama",
      genre: ["Biography & Memoir"],
      core_themes: ["personal journey", "leadership", "inspiration"]
    }
  ];

  console.log('\n📚 Testing voice selection for sample books:');
  for (const book of sampleBooks) {
    try {
      console.log(`\n🔍 Testing: "${book.title}" by ${book.author}`);
      const result = await hybridSelector.selectVoice(book);
      
      console.log(`🎤 Selected Voice: ${result.selectedVoice}`);
      console.log(`📊 Confidence: ${result.confidence}%`);
      console.log(`💭 Reasoning: ${result.reasoning}`);
      console.log(`👤 Gender Detection: ${result.genderDetectionMethod || 'Not specified'}`);
    } catch (error) {
      console.error(`❌ Error testing ${book.title}:`, error.message);
    }
  }

  // Test 2: VoiceSelector with hybrid provider
  console.log('\n\n📋 Test 2: VoiceSelector with Hybrid Provider');
  const voiceSelector = new VoiceSelector();
  
  console.log(`🔧 Current provider: ${voiceSelector.config.provider}`);
  console.log(`🔄 Fallback provider: ${voiceSelector.config.fallbackProvider}`);

  // Get all provider status
  const allProviderStatus = await voiceSelector.getProviderStatus();
  console.log('\n📊 All Provider Status:');
  for (const [name, providerStatus] of Object.entries(allProviderStatus.providers)) {
    console.log(`  ${name}: ${providerStatus.available ? '✅ Available' : '❌ Unavailable'}`);
    if (providerStatus.error) {
      console.log(`    Error: ${providerStatus.error}`);
    }
  }

  console.log('\n🎯 Hybrid Voice Selection Benefits:');
  console.log('  ✅ Uses Ollama for accurate gender detection');
  console.log('  ✅ Uses SmartVoiceSelector for diverse voice selection');
  console.log('  ✅ Graceful fallback if Ollama is unavailable');
  console.log('  ✅ Sophisticated scoring algorithm for voice matching');
  console.log('  ✅ Considers genre, content style, and target audience');
}

// Run the test
testHybridVoiceSelector().catch(console.error);
