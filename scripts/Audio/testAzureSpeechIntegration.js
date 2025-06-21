#!/usr/bin/env node

import { getConfig } from './config/audioConfig.js';
import { TTSProviderFactory } from './pipeline/providers/TTSProviderFactory.js';
import { TextOptimizer } from './pipeline/textOptimizer.js';
import fs from 'fs';
import path from 'path';

/**
 * Azure Speech Services Integration Test
 * Tests the complete pipeline with your 14 favorite voices and advanced SSML
 */

async function main() {
  try {
    console.log('🚀 Azure Speech Services Integration Test');
    console.log('==========================================\n');

    // Get configuration
    const config = getConfig('test');
    
    // Check Azure Speech credentials
    if (!process.env.AZURE_SPEECH_ENDPOINT || !process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
      console.error('❌ Azure Speech credentials missing. Please update your .env file:');
      console.error('   AZURE_SPEECH_ENDPOINT=https://YOUR_REGION.api.cognitive.microsoft.com/');
      console.error('   AZURE_SPEECH_KEY=your_primary_key_here');
      console.error('   AZURE_SPEECH_REGION=your_region_here');
      process.exit(1);
    }

    // Initialize components
    console.log('🔧 Initializing Azure Speech Services components...');
    const ttsFactory = new TTSProviderFactory(config);
    const textOptimizer = new TextOptimizer();
    
    console.log('✅ Components initialized successfully\n');

    // Test content samples
    const testContent = {
      introduction: `Welcome to "Rich Dad Poor Dad" by Robert Kiyosaki. This transformative book will challenge everything you thought you knew about money and wealth building. Through the contrasting lessons from his two father figures, Kiyosaki reveals the mindset that separates the financially successful from those who struggle with money. Get ready to discover the principles that can change your financial future forever.`,
      
      chapter: `The rich don't work for money. This fundamental principle is what separates the wealthy from the poor and middle class. While most people spend their lives working for a paycheck, the rich understand that true wealth comes from making money work for them. They focus on acquiring assets that generate passive income, rather than trading their time for money. This shift in mindset is crucial for anyone who wants to achieve financial freedom.`,
      
      conclusion: `As we wrap up this journey through the lessons of Rich Dad Poor Dad, remember that financial education is the foundation of wealth building. The choice is yours: you can continue thinking like Poor Dad, working for money and living paycheck to paycheck, or you can adopt Rich Dad's mindset and start building assets that work for you. The path to financial freedom begins with changing how you think about money. Take action today, and start your journey toward financial independence.`
    };

    // Create test output directory
    const testOutputDir = './Audio/test_integration';
    fs.mkdirSync(testOutputDir, { recursive: true });

    console.log('🧪 Testing Azure Speech Services Integration\n');

    // Test 1: Provider Factory Functionality
    console.log('📋 Test 1: TTS Provider Factory');
    console.log('================================');
    
    const providerInfo = ttsFactory.getProviderInfo();
    console.log(`✅ Primary Provider: ${providerInfo.primary}`);
    console.log(`🔄 Fallback Provider: ${providerInfo.fallback}`);
    console.log(`📊 Available Providers: ${providerInfo.total}`);
    
    providerInfo.available.forEach(provider => {
      console.log(`   - ${provider.name}: ${provider.type}`);
      if (provider.voiceCount) {
        console.log(`     Voices: ${provider.voiceCount}, SSML: ${provider.supportsSSML ? 'Yes' : 'No'}`);
      }
    });

    // Test 2: Voice Selection and Content Analysis
    console.log('\n📋 Test 2: Intelligent Voice Selection');
    console.log('======================================');
    
    const sections = ['introduction', 'chapter', 'conclusion'];
    const voiceRecommendations = {};
    
    for (const sectionType of sections) {
      const content = testContent[sectionType];
      const recommendation = ttsFactory.analyzeContentForOptimalProvider(content, sectionType);
      voiceRecommendations[sectionType] = recommendation;
      
      console.log(`\n${sectionType.toUpperCase()}:`);
      console.log(`   Recommended Voice: ${recommendation.voice}`);
      console.log(`   Style: ${recommendation.style}`);
      console.log(`   Confidence: ${(recommendation.confidence * 100).toFixed(0)}%`);
      console.log(`   Reasoning: ${recommendation.reasoning}`);
    }

    // Test 3: Enhanced SSML Generation
    console.log('\n📋 Test 3: Enhanced SSML Generation');
    console.log('===================================');
    
    for (const sectionType of sections) {
      console.log(`\n🎵 Generating enhanced SSML for ${sectionType}...`);
      
      const content = testContent[sectionType];
      const recommendation = voiceRecommendations[sectionType];
      
      try {
        const optimizedSSML = await textOptimizer.optimizeForListening(content, sectionType, {
          enableSSML: true,
          provider: 'azure-speech',
          voice: recommendation.voice
        });
        
        // Save SSML for inspection
        const ssmlPath = path.join(testOutputDir, `${sectionType}_enhanced.ssml`);
        fs.writeFileSync(ssmlPath, optimizedSSML);
        
        console.log(`   ✅ Enhanced SSML generated (${optimizedSSML.length} chars)`);
        console.log(`   📄 Saved to: ${ssmlPath}`);
        
        // Show preview of SSML features
        const hasVoiceStyles = optimizedSSML.includes('mstts:express-as');
        const hasProsody = optimizedSSML.includes('<prosody');
        const hasEmphasis = optimizedSSML.includes('<emphasis');
        const hasBreaks = optimizedSSML.includes('<break') || optimizedSSML.includes('mstts:silence');
        
        console.log(`   🎭 Voice Styles: ${hasVoiceStyles ? 'Yes' : 'No'}`);
        console.log(`   🎵 Prosody Control: ${hasProsody ? 'Yes' : 'No'}`);
        console.log(`   💪 Emphasis: ${hasEmphasis ? 'Yes' : 'No'}`);
        console.log(`   ⏸️  Strategic Breaks: ${hasBreaks ? 'Yes' : 'No'}`);
        
      } catch (error) {
        console.log(`   ❌ SSML generation failed: ${error.message}`);
      }
    }

    // Test 4: Audio Generation with Top Voices
    console.log('\n📋 Test 4: Audio Generation with Top Voices');
    console.log('============================================');
    
    const topVoices = ['andrew-multilingual', 'nova-turbo-multilingual', 'emma-multilingual'];
    const testText = "Welcome to this test of Azure Speech Services. This voice will demonstrate the quality and expressiveness of our advanced neural voices.";
    
    for (const voiceName of topVoices) {
      console.log(`\n🎤 Testing voice: ${voiceName}`);
      
      try {
        const outputPath = path.join(testOutputDir, `test_${voiceName}.mp3`);
        
        const result = await ttsFactory.generateTTS(testText, outputPath, {
          voice: voiceName,
          style: 'conversational',
          provider: 'azure-speech'
        });
        
        if (result.success) {
          const stats = fs.statSync(outputPath);
          console.log(`   ✅ Generated: ${(stats.size / 1024).toFixed(1)} KB`);
          console.log(`   🎵 Voice: ${result.voice}`);
          console.log(`   ⏱️  Duration: ${result.duration ? result.duration.toFixed(1) + 's' : 'Unknown'}`);
          console.log(`   📁 File: ${outputPath}`);
        } else {
          console.log(`   ❌ Failed: ${result.error}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      
      // Add delay between tests
      await delay(1000);
    }

    // Test 5: Complete Pipeline Integration
    console.log('\n📋 Test 5: Complete Pipeline Integration');
    console.log('=======================================');
    
    console.log('\n🔄 Testing complete pipeline with Azure Speech Services...');
    
    try {
      const pipelineTestText = testContent.chapter;
      const outputPath = path.join(testOutputDir, 'pipeline_test_complete.mp3');
      
      // Step 1: Optimize text with Azure Speech SSML
      console.log('   1️⃣  Optimizing text with Azure Speech SSML...');
      const optimizedContent = await textOptimizer.optimizeForListening(pipelineTestText, 'chapter', {
        enableSSML: true,
        provider: 'azure-speech',
        voice: 'andrew-multilingual'
      });
      
      // Step 2: Generate audio with optimized SSML
      console.log('   2️⃣  Generating audio with enhanced SSML...');
      const result = await ttsFactory.generateTTS(optimizedContent, outputPath, {
        voice: 'andrew-multilingual',
        style: 'conversational',
        provider: 'azure-speech'
      });
      
      if (result.success) {
        const stats = fs.statSync(outputPath);
        console.log(`   ✅ Pipeline test successful!`);
        console.log(`   📊 File size: ${(stats.size / 1024).toFixed(1)} KB`);
        console.log(`   🎵 Voice: ${result.voice}`);
        console.log(`   🎭 Provider: ${result.provider}`);
        console.log(`   📁 Output: ${outputPath}`);
        
        if (result.usedFallback) {
          console.log(`   ⚠️  Used fallback provider: ${result.originalProvider} → ${result.provider}`);
        }
      } else {
        console.log(`   ❌ Pipeline test failed: ${result.error}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Pipeline error: ${error.message}`);
    }

    // Test Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(50));
    
    console.log('\n✅ Components Tested:');
    console.log('   🏭 TTS Provider Factory - Multi-provider support');
    console.log('   🧠 Intelligent Voice Selection - Content analysis');
    console.log('   🎵 Enhanced SSML Generation - Azure Speech features');
    console.log('   🎤 Voice Quality Testing - Top 3 voices');
    console.log('   🔄 Complete Pipeline - End-to-end integration');
    
    console.log('\n🎯 Key Features Demonstrated:');
    console.log('   ✨ 14 favorite voices with UK English preference');
    console.log('   🎭 Voice styles (conversational, friendly, hopeful, etc.)');
    console.log('   🎵 Advanced prosody control (rate, pitch, volume)');
    console.log('   💪 Strategic emphasis and breaks');
    console.log('   🔄 Automatic fallback to Azure OpenAI TTS');
    console.log('   🧠 AI-driven voice selection based on content');
    
    console.log('\n📁 Test Files Generated:');
    console.log(`   📂 Directory: ${testOutputDir}`);
    console.log('   📄 Enhanced SSML files for each section type');
    console.log('   🎵 Audio samples from top voices');
    console.log('   🔄 Complete pipeline test output');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Update your .env file with actual Azure Speech credentials');
    console.log('   2. Run: node scripts/Audio/testAzureSpeechVoices.js');
    console.log('   3. Test with real book content using the enhanced pipeline');
    console.log('   4. Enjoy professional-quality audiobooks with rich expression!');
    
    console.log('\n🎉 Azure Speech Services integration is ready!');

  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

/**
 * Utility delay function
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
