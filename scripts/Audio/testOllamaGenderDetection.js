#!/usr/bin/env node

import { OllamaVoiceSelector } from './pipeline/providers/OllamaVoiceSelector.js';
import fs from 'fs';
import path from 'path';

/**
 * Test script for Ollama gender detection
 */

async function testGenderDetection() {
  console.log('🧪 Testing Ollama Gender Detection');
  console.log('==================================\n');

  // Initialize Ollama voice selector
  const ollamaSelector = new OllamaVoiceSelector();

  // Check if Ollama is available
  console.log('🔍 Checking Ollama availability...');
  const isAvailable = await ollamaSelector.isAvailable();
  
  if (!isAvailable) {
    console.error('❌ Ollama is not available. Please ensure:');
    console.error('   1. Ollama is running on localhost:11434');
    console.error('   2. llama3.1:latest model is installed');
    console.error('   3. Run: ollama pull llama3.1:latest');
    return;
  }

  console.log('✅ Ollama is available\n');

  // Test with book 2642 (Robert Greene - The 48 Laws of Power)
  const bookId = '2642';
  const metadataPath = path.join('../../Meta of All Books DB', `${bookId}.json`);
  
  if (!fs.existsSync(metadataPath)) {
    console.error(`❌ Metadata file not found: ${metadataPath}`);
    return;
  }

  // Load metadata
  const rawData = fs.readFileSync(metadataPath, 'utf8');
  const metadata = JSON.parse(rawData);
  const bookData = Array.isArray(metadata) ? metadata[0] : metadata;

  console.log('📖 Book Information:');
  console.log(`   Title: ${bookData.title}`);
  console.log(`   Author: ${bookData.author}`);
  console.log(`   Genre: ${Array.isArray(bookData.genre) ? bookData.genre.join(', ') : bookData.genre}\n`);

  // Test gender detection
  console.log('🔍 Testing gender detection...');
  try {
    const gender = await ollamaSelector.detectAuthorGender(bookData);
    console.log(`👤 Detected gender: ${gender}\n`);

    // Test voice selection
    console.log('🎤 Testing voice selection...');
    const voiceResult = await ollamaSelector.selectVoice(bookData);
    
    console.log('📊 Voice Selection Result:');
    console.log(`   Selected Voice: ${voiceResult.selectedVoice}`);
    console.log(`   Confidence: ${voiceResult.confidence}%`);
    console.log(`   Reasoning: ${voiceResult.reasoning}`);
    console.log(`   Provider: ${voiceResult.provider}\n`);

    // Test caching
    console.log('💾 Testing cache functionality...');
    const cachedGender = await ollamaSelector.detectAuthorGender(bookData);
    console.log(`👤 Cached gender result: ${cachedGender}\n`);

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Test with different authors
async function testMultipleAuthors() {
  console.log('\n🧪 Testing Multiple Authors');
  console.log('===========================\n');

  const ollamaSelector = new OllamaVoiceSelector();

  const testCases = [
    { author: 'Robert Greene', title: 'The 48 Laws of Power', expected: 'male' },
    { author: 'Brené Brown', title: 'Daring Greatly', expected: 'female' },
    { author: 'Jordan Peterson', title: '12 Rules for Life', expected: 'male' },
    { author: 'Elizabeth Gilbert', title: 'Big Magic', expected: 'female' },
    { author: 'Unknown Author', title: 'Mystery Book', expected: 'unknown' }
  ];

  for (const testCase of testCases) {
    console.log(`📖 Testing: ${testCase.author} - "${testCase.title}"`);
    
    try {
      const gender = await ollamaSelector.detectAuthorGender(testCase);
      const isCorrect = gender === testCase.expected;
      
      console.log(`   Detected: ${gender} ${isCorrect ? '✅' : '❌'} (Expected: ${testCase.expected})`);
      
      if (isCorrect) {
        const voiceResult = await ollamaSelector.selectVoiceByGender(gender, testCase);
        console.log(`   Selected Voice: ${voiceResult.selectedVoice}`);
      }
      
    } catch (error) {
      console.log(`   Error: ${error.message} ❌`);
    }
    
    console.log('');
  }
}

// Run tests
async function runTests() {
  try {
    await testGenderDetection();
    await testMultipleAuthors();
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { testGenderDetection, testMultipleAuthors };
