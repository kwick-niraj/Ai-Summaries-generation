#!/usr/bin/env node

import dotenv from 'dotenv';

dotenv.config();

/**
 * Simple configuration test to verify environment variables
 */

function testConfiguration() {
  console.log('🔧 Testing Audio Pipeline Configuration');
  console.log('=====================================\n');

  const requiredVars = {
    'Chat Completions (Text Optimization)': {
      'AZURE_OPENAI_ENDPOINT': process.env.AZURE_OPENAI_ENDPOINT,
      'AZURE_OPENAI_KEY': process.env.AZURE_OPENAI_KEY ? '✓ Set' : '❌ Missing',
      'AZURE_OPENAI_CHAT_DEPLOYMENT_ID': process.env.AZURE_OPENAI_CHAT_DEPLOYMENT_ID
    },
    'TTS (Audio Generation)': {
      'AZURE_TTS_ENDPOINT': process.env.AZURE_TTS_ENDPOINT,
      'AZURE_TTS_KEY': process.env.AZURE_TTS_KEY ? '✓ Set' : '❌ Missing',
      'AZURE_TTS_DEPLOYMENT_ID': process.env.AZURE_TTS_DEPLOYMENT_ID
    }
  };

  let allGood = true;

  for (const [category, vars] of Object.entries(requiredVars)) {
    console.log(`📋 ${category}:`);
    for (const [varName, value] of Object.entries(vars)) {
      if (!value || value === '❌ Missing') {
        console.log(`  ❌ ${varName}: Missing`);
        allGood = false;
      } else {
        console.log(`  ✅ ${varName}: ${value}`);
      }
    }
    console.log('');
  }

  if (allGood) {
    console.log('🎉 Configuration looks good!');
    console.log('\n📋 Next steps:');
    console.log('1. Test single book: node runFullPipeline.js --test 12');
    console.log('2. Run dry-run: node runFullPipeline.js --dry-run');
    console.log('3. Process all books: node runFullPipeline.js');
  } else {
    console.log('❌ Configuration issues found. Please check your .env file.');
  }

  return allGood;
}

// Run the test
testConfiguration();
