#!/usr/bin/env node

import { AzureSpeechTTSProvider } from './pipeline/providers/AzureSpeechTTSProvider.js';
import { getConfig } from './config/audioConfig.js';
import fs from 'fs';
import path from 'path';

/**
 * Test script to verify SSML processing fixes
 */

async function testSSMLProcessing() {
  console.log('🧪 Testing SSML Processing Fixes');
  console.log('================================\n');

  try {
    // Get configuration
    const config = getConfig('test');
    
    // Initialize Azure Speech provider
    const provider = new AzureSpeechTTSProvider({
      ...config.tts.azureSpeech,
      favoriteVoices: config.tts.azureSpeech.favoriteVoices
    });

    // Test 1: Plain text (should generate SSML)
    console.log('📝 Test 1: Plain text input');
    const plainText = "Hello, this is a test of plain text conversion to SSML.";
    const plainTextResult = await provider.generateTTS(
      plainText, 
      './Audio/output/test/ssml_test_plain.mp3',
      { voice: 'andrew-multilingual' }
    );
    
    console.log(`   Result: ${plainTextResult.success ? '✅ Success' : '❌ Failed'}`);
    if (!plainTextResult.success) {
      console.log(`   Error: ${plainTextResult.error}`);
    }

    // Test 2: SSML input (should use as-is)
    console.log('\n🎵 Test 2: SSML input');
    const ssmlContent = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-GB">
  <voice name="en-US-AndrewMultilingualNeural">
    <mstts:express-as style="conversational">
      <prosody rate="0.95" pitch="medium">
        Hello, this is a test of <emphasis level="moderate">SSML processing</emphasis>.
        <break time="500ms"/>
        The system should interpret these tags correctly.
      </prosody>
    </mstts:express-as>
  </voice>
</speak>`;

    const ssmlResult = await provider.generateTTS(
      ssmlContent,
      './Audio/output/test/ssml_test_ssml.mp3',
      { voice: 'andrew-multilingual' }
    );
    
    console.log(`   Result: ${ssmlResult.success ? '✅ Success' : '❌ Failed'}`);
    if (!ssmlResult.success) {
      console.log(`   Error: ${ssmlResult.error}`);
    }

    // Test 3: SSML validation
    console.log('\n🔍 Test 3: SSML validation');
    const validSSML = provider.validateSSMLStructure(ssmlContent);
    console.log(`   SSML validation: ${validSSML ? '✅ Valid' : '❌ Invalid'}`);

    // Test 4: Invalid SSML
    console.log('\n❌ Test 4: Invalid SSML');
    const invalidSSML = '<speak>Missing namespace</speak>';
    const invalidValidation = provider.validateSSMLStructure(invalidSSML);
    console.log(`   Invalid SSML validation: ${!invalidValidation ? '✅ Correctly rejected' : '❌ Incorrectly accepted'}`);

    // Summary
    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log(`Plain text processing: ${plainTextResult.success ? '✅' : '❌'}`);
    console.log(`SSML processing: ${ssmlResult.success ? '✅' : '❌'}`);
    console.log(`SSML validation: ${validSSML ? '✅' : '❌'}`);
    console.log(`Invalid SSML rejection: ${!invalidValidation ? '✅' : '❌'}`);

    const allPassed = plainTextResult.success && ssmlResult.success && validSSML && !invalidValidation;
    console.log(`\n🎯 Overall result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    if (allPassed) {
      console.log('\n🎉 SSML processing fixes are working correctly!');
      console.log('   - Azure Speech will now properly interpret SSML markup');
      console.log('   - No more speaking of SSML tags as text');
      console.log('   - Proper validation prevents malformed SSML');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testSSMLProcessing().catch(error => {
    console.error('Fatal test error:', error);
    process.exit(1);
  });
}

export { testSSMLProcessing };
