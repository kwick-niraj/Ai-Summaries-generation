#!/usr/bin/env node

import { AzureSpeechTTSProvider } from './pipeline/providers/AzureSpeechTTSProvider.js';
import { getConfig } from './config/audioConfig.js';
import fs from 'fs';
import path from 'path';

/**
 * Azure Speech Voice Testing Script
 * Tests all 14 favorite voices to ensure they work with your Azure Speech Service
 */

async function main() {
  try {
    console.log('🧪 Azure Speech Voice Testing');
    console.log('============================\n');

    // Get configuration
    const config = getConfig('test');
    
    // Check if Azure Speech credentials are set
    if (!process.env.AZURE_SPEECH_ENDPOINT || !process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
      console.error('❌ Azure Speech credentials not found in environment variables.');
      console.error('Please set: AZURE_SPEECH_ENDPOINT, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION');
      process.exit(1);
    }

    // Initialize Azure Speech provider
    const azureSpeechProvider = new AzureSpeechTTSProvider(config.tts.azureSpeech);
    
    console.log('✅ Azure Speech provider initialized');
    console.log(`🌍 Region: ${process.env.AZURE_SPEECH_REGION}`);
    console.log(`🔗 Endpoint: ${process.env.AZURE_SPEECH_ENDPOINT}\n`);

    // Test text samples
    const testTexts = {
      short: 'Hello, this is a test of the Azure Speech voice.',
      medium: 'Welcome to this comprehensive test of Azure Speech Services. We are evaluating the quality and capabilities of your selected voice for audiobook generation.',
      long: 'Financial literacy is the foundation of wealth building. In this transformative journey, we will explore the mindset that separates the financially successful from those who struggle with money. Through practical examples and real-world applications, you will discover the principles that can change your financial future forever.'
    };

    // Create test output directory
    const testOutputDir = './Audio/test_voices';
    fs.mkdirSync(testOutputDir, { recursive: true });

    // Get all favorite voices
    const favoriteVoices = Object.keys(config.tts.azureSpeech.favoriteVoices);
    console.log(`🎤 Testing ${favoriteVoices.length} favorite voices:\n`);

    const results = {
      successful: [],
      failed: [],
      total: favoriteVoices.length,
      testResults: {}
    };

    // Test each voice
    for (let i = 0; i < favoriteVoices.length; i++) {
      const voiceName = favoriteVoices[i];
      const voiceConfig = config.tts.azureSpeech.favoriteVoices[voiceName];
      
      console.log(`\n${i + 1}/${favoriteVoices.length} Testing: ${voiceName}`);
      console.log(`   Primary: ${voiceConfig.primary}`);
      console.log(`   Fallback: ${voiceConfig.fallback}`);
      console.log(`   Description: ${voiceConfig.description}`);

      try {
        // Test with medium text and different styles
        const testCases = [
          { text: testTexts.medium, style: 'conversational', suffix: 'conversational' },
          { text: testTexts.medium, style: 'friendly', suffix: 'friendly' },
          { text: testTexts.long, style: 'hopeful', suffix: 'hopeful' }
        ];

        const voiceResults = {
          voice: voiceName,
          success: true,
          tests: [],
          errors: []
        };

        for (const testCase of testCases) {
          const outputPath = path.join(testOutputDir, `${voiceName}_${testCase.suffix}.mp3`);
          
          console.log(`   🎵 Testing ${testCase.style} style...`);
          
          const result = await azureSpeechProvider.generateTTS(testCase.text, outputPath, {
            voice: voiceName,
            style: testCase.style
          });

          if (result.success) {
            const stats = fs.statSync(outputPath);
            voiceResults.tests.push({
              style: testCase.style,
              success: true,
              fileSize: stats.size,
              duration: result.duration,
              outputPath
            });
            console.log(`   ✅ ${testCase.style}: ${(stats.size / 1024).toFixed(1)} KB`);
          } else {
            voiceResults.tests.push({
              style: testCase.style,
              success: false,
              error: result.error
            });
            voiceResults.errors.push(`${testCase.style}: ${result.error}`);
            console.log(`   ❌ ${testCase.style}: ${result.error}`);
          }
        }

        // Determine overall success
        const successfulTests = voiceResults.tests.filter(t => t.success).length;
        if (successfulTests > 0) {
          results.successful.push(voiceName);
          console.log(`   🎯 Overall: SUCCESS (${successfulTests}/${testCases.length} styles worked)`);
        } else {
          voiceResults.success = false;
          results.failed.push(voiceName);
          console.log(`   💥 Overall: FAILED (no styles worked)`);
        }

        results.testResults[voiceName] = voiceResults;

      } catch (error) {
        console.log(`   💥 FAILED: ${error.message}`);
        results.failed.push(voiceName);
        results.testResults[voiceName] = {
          voice: voiceName,
          success: false,
          error: error.message,
          tests: []
        };
      }

      // Add delay between voice tests to respect rate limits
      if (i < favoriteVoices.length - 1) {
        console.log('   ⏳ Waiting 2 seconds...');
        await delay(2000);
      }
    }

    // Generate summary report
    console.log('\n' + '='.repeat(50));
    console.log('📊 VOICE TESTING SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`\n✅ Successful voices: ${results.successful.length}/${results.total}`);
    results.successful.forEach(voice => {
      const testResult = results.testResults[voice];
      const successfulStyles = testResult.tests.filter(t => t.success).length;
      console.log(`   🎤 ${voice} (${successfulStyles}/3 styles)`);
    });

    if (results.failed.length > 0) {
      console.log(`\n❌ Failed voices: ${results.failed.length}/${results.total}`);
      results.failed.forEach(voice => {
        const testResult = results.testResults[voice];
        console.log(`   💥 ${voice}: ${testResult.error || 'Multiple style failures'}`);
      });
    }

    // Voice recommendations
    console.log('\n🎯 VOICE RECOMMENDATIONS');
    console.log('========================');
    
    const topVoices = results.successful
      .map(voice => ({
        name: voice,
        successRate: results.testResults[voice].tests.filter(t => t.success).length / 3,
        config: config.tts.azureSpeech.favoriteVoices[voice]
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    topVoices.forEach((voice, index) => {
      console.log(`${index + 1}. ${voice.name} (${(voice.successRate * 100).toFixed(0)}% success)`);
      console.log(`   ${voice.config.description}`);
      console.log(`   Best for: ${voice.config.recommended.join(', ')}`);
    });

    // Save detailed report
    const reportPath = path.join(testOutputDir, `voice_test_report_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      region: process.env.AZURE_SPEECH_REGION,
      summary: {
        total: results.total,
        successful: results.successful.length,
        failed: results.failed.length,
        successRate: (results.successful.length / results.total * 100).toFixed(1) + '%'
      },
      results: results.testResults,
      recommendations: topVoices
    }, null, 2));

    console.log(`\n📋 Detailed report saved: ${reportPath}`);
    console.log(`🎵 Test audio files saved in: ${testOutputDir}`);

    // Final recommendations
    console.log('\n💡 NEXT STEPS');
    console.log('=============');
    
    if (results.successful.length >= 10) {
      console.log('🎉 Excellent! Most of your voices are working perfectly.');
      console.log('✅ You can proceed with Azure Speech Services as your primary TTS provider.');
    } else if (results.successful.length >= 5) {
      console.log('👍 Good! Several voices are working well.');
      console.log('⚠️  Consider updating your .env file with the correct Azure Speech credentials.');
    } else {
      console.log('⚠️  Limited voice availability detected.');
      console.log('🔧 Please check your Azure Speech Service configuration:');
      console.log('   - Verify your region is correct');
      console.log('   - Ensure your subscription has access to neural voices');
      console.log('   - Check if voice names match your Azure Speech Service region');
    }

    console.log('\n🔧 To update your credentials, edit scripts/.env:');
    console.log('   AZURE_SPEECH_ENDPOINT=https://YOUR_REGION.api.cognitive.microsoft.com/');
    console.log('   AZURE_SPEECH_KEY=your_primary_key_here');
    console.log('   AZURE_SPEECH_REGION=your_region_here');

  } catch (error) {
    console.error('\n❌ Voice testing failed:', error.message);
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
