#!/usr/bin/env node

import { TextOptimizer } from './pipeline/textOptimizer.js';
import { getConfig } from './config/audioConfig.js';

/**
 * Test script to verify SSML generation is working correctly
 */

async function testSSMLGeneration() {
  console.log('🧪 Testing SSML Generation');
  console.log('===========================\n');

  const optimizer = new TextOptimizer();
  const config = getConfig('balanced'); // This should have SSML enabled

  // Test text samples
  const testTexts = {
    introduction: `Welcome to Rich Dad Poor Dad by Robert Kiyosaki. This book will challenge everything you thought you knew about money and wealth building. Let's begin this transformative journey together.`,
    
    chapter: `The most important lesson is this: assets put money in your pocket, while liabilities take money out. This fundamental distinction will change your financial future. Understanding cash flow is crucial for building wealth.`,
    
    conclusion: `As we wrap up, remember these key principles: invest in assets, minimize liabilities, and focus on financial education. Here's what this means for you: start building your wealth today.`
  };

  console.log('📝 Testing text optimization with SSML generation...\n');

  for (const [sectionType, text] of Object.entries(testTexts)) {
    console.log(`🔍 Testing ${sectionType}:`);
    console.log(`Input: "${text.substring(0, 80)}..."`);
    
    try {
      // Test with SSML enabled
      const optimizedWithSSML = await optimizer.optimizeForListening(text, sectionType, { enableSSML: true });
      
      console.log(`✅ SSML-enhanced output:`);
      console.log(`"${optimizedWithSSML.substring(0, 150)}..."`);
      
      // Check if SSML tags are present
      const hasSSMLTags = optimizedWithSSML.includes('<break') || 
                         optimizedWithSSML.includes('<emphasis') || 
                         optimizedWithSSML.includes('<prosody');
      
      if (hasSSMLTags) {
        console.log('🎵 SSML tags detected: ✅');
      } else {
        console.log('⚠️  No SSML tags found in output');
      }
      
      // Test without SSML for comparison
      const optimizedWithoutSSML = await optimizer.optimizeForListening(text, sectionType, { enableSSML: false });
      
      console.log(`📝 Plain text output:`);
      console.log(`"${optimizedWithoutSSML.substring(0, 150)}..."`);
      
      console.log('---\n');
      
    } catch (error) {
      console.error(`❌ Error testing ${sectionType}:`, error.message);
    }
  }

  // Test manual SSML generation
  console.log('🎵 Testing manual SSML generation...\n');
  
  const plainText = "Welcome to this audiobook. This is a key concept about financial literacy.";
  const ssmlConfig = {
    sectionSettings: {
      introduction: { rate: '0.95', emphasis: 'moderate', pauseAfter: '1.5s' }
    },
    emphasisSettings: {
      keyTerms: { level: 'moderate' }
    }
  };
  
  try {
    const ssmlOutput = optimizer.generateSSML(plainText, 'introduction', ssmlConfig);
    console.log('📝 Input text:', plainText);
    console.log('🎵 SSML output:');
    console.log(ssmlOutput);
    
    // Validate SSML
    const isValid = optimizer.validateSSML(ssmlOutput);
    console.log(`✅ SSML validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    
  } catch (error) {
    console.error('❌ Manual SSML generation failed:', error.message);
  }

  console.log('\n🎉 SSML generation test completed!');
  console.log('\n💡 Tips:');
  console.log('- SSML tags should appear in the optimized text when enableSSML is true');
  console.log('- Key terms like "financial literacy" should have <emphasis> tags');
  console.log('- Strategic <break> tags should appear between concepts (0.3s-0.8s)');
  console.log('- NO XML declarations should appear in the output');
  console.log('- The output should be plain text with embedded SSML tags only');
  console.log('- Pauses should be minimal and strategic, not excessive');
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testSSMLGeneration().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export { testSSMLGeneration };
