import { SmartVoiceSelector } from './pipeline/providers/SmartVoiceSelector.js';
import fs from 'fs';
import path from 'path';

/**
 * Test the SmartVoiceSelector with real metadata
 */
async function testSmartVoiceSelector() {
  console.log('🧪 Testing SmartVoiceSelector with real metadata...\n');

  const selector = new SmartVoiceSelector();

  // Test with a few different books from your metadata
  const testBooks = [
    '../../Meta of All Books DB/1159.json', // Rich Dad Poor Dad (Robert T. Kiyosaki - Male)
    '../../Meta of All Books DB/103.json',  // Getting to Yes (Multiple male authors)
  ];

  // Add a few more test cases if they exist
  const additionalTests = [
    '../../Meta of All Books DB/164.json',
    '../../Meta of All Books DB/985.json',
    '../../Meta of All Books DB/2621.json'
  ];

  for (const testFile of additionalTests) {
    if (fs.existsSync(testFile)) {
      testBooks.push(testFile);
    }
  }

  for (const bookPath of testBooks) {
    try {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📖 Testing: ${bookPath}`);
      console.log(`${'='.repeat(80)}`);

      // Read metadata
      const metadataContent = fs.readFileSync(bookPath, 'utf8');
      const metadata = JSON.parse(metadataContent)[0]; // Assuming array format

      console.log(`\n📚 Book: "${metadata.title}"`);
      console.log(`👤 Author: ${Array.isArray(metadata.author) ? metadata.author.join(', ') : metadata.author}`);
      console.log(`🏷️ Genre: ${Array.isArray(metadata.genre) ? metadata.genre.join(', ') : metadata.genre}`);
      console.log(`🎭 Style/Tone: ${Array.isArray(metadata.style_tone) ? metadata.style_tone.join(', ') : metadata.style_tone || 'N/A'}`);

      // Test voice selection
      const result = await selector.selectVoice(metadata);

      console.log(`\n🎯 VOICE SELECTION RESULT:`);
      console.log(`   Selected Voice: ${result.selectedVoice}`);
      console.log(`   Confidence: ${result.confidence}%`);
      console.log(`   Reasoning: ${result.reasoning}`);
      console.log(`   Provider: ${result.provider}`);

      // Get voice characteristics for selected voice
      const voices = selector.getVoiceCharacteristics();
      const selectedVoiceData = voices[result.selectedVoice];
      if (selectedVoiceData) {
        console.log(`\n🎤 VOICE CHARACTERISTICS:`);
        console.log(`   Azure Voice ID: ${selectedVoiceData.azureVoiceId}`);
        console.log(`   Gender: ${selectedVoiceData.gender}`);
        console.log(`   Tone: ${selectedVoiceData.tone}`);
        console.log(`   Style: ${selectedVoiceData.style}`);
        console.log(`   Personality: ${selectedVoiceData.personality}`);
        console.log(`   Best For: ${selectedVoiceData.bestFor.join(', ')}`);
      }

    } catch (error) {
      console.error(`❌ Error testing ${bookPath}:`, error.message);
    }
  }

  // Test edge cases
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TESTING EDGE CASES`);
  console.log(`${'='.repeat(80)}`);

  // Test unknown author gender
  const unknownGenderTest = {
    title: "Test Book with Unknown Author",
    author: "X. Y. Anonymous",
    genre: ["Business"],
    style_tone: ["Professional"]
  };

  console.log(`\n📖 Testing unknown author gender...`);
  const unknownResult = await selector.selectVoice(unknownGenderTest);
  console.log(`🎯 Result: ${unknownResult.selectedVoice} (${unknownResult.confidence}%)`);
  console.log(`📝 Reasoning: ${unknownResult.reasoning}`);

  // Test female author
  const femaleAuthorTest = {
    title: "Test Book by Female Author",
    author: "Oprah Winfrey",
    genre: ["Self-Help", "Motivation & Inspiration"],
    style_tone: ["Motivational", "Empathetic"],
    core_themes: ["Personal growth", "Empowerment"],
    target_audience: ["General audience seeking inspiration"]
  };

  console.log(`\n📖 Testing female author...`);
  const femaleResult = await selector.selectVoice(femaleAuthorTest);
  console.log(`🎯 Result: ${femaleResult.selectedVoice} (${femaleResult.confidence}%)`);
  console.log(`📝 Reasoning: ${femaleResult.reasoning}`);

  // Test business book with male author
  const businessMaleTest = {
    title: "Advanced Business Strategy",
    author: "Michael Porter",
    genre: ["Business", "Management & Leadership"],
    style_tone: ["Professional", "Authoritative"],
    core_themes: ["Strategic thinking", "Competitive advantage"],
    target_audience: ["Business professionals", "MBA students"]
  };

  console.log(`\n📖 Testing business book with male author...`);
  const businessResult = await selector.selectVoice(businessMaleTest);
  console.log(`🎯 Result: ${businessResult.selectedVoice} (${businessResult.confidence}%)`);
  console.log(`📝 Reasoning: ${businessResult.reasoning}`);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ SmartVoiceSelector testing completed!`);
  console.log(`${'='.repeat(80)}`);
}

// Test voice distribution
async function testVoiceDistribution() {
  console.log('\n🎲 Testing voice distribution across different content types...\n');

  const selector = new SmartVoiceSelector();
  const voiceUsage = {};

  // Create test cases for different genres and author genders
  const testCases = [
    // Male authors
    { author: "Robert Smith", genre: ["Business"], gender: "male" },
    { author: "John Doe", genre: ["Self-Help"], gender: "male" },
    { author: "Michael Johnson", genre: ["Science"], gender: "male" },
    { author: "David Wilson", genre: ["Biography & Memoir"], gender: "male" },
    { author: "James Brown", genre: ["Philosophy"], gender: "male" },
    
    // Female authors
    { author: "Sarah Johnson", genre: ["Self-Help"], gender: "female" },
    { author: "Emma Wilson", genre: ["Mindfulness & Happiness"], gender: "female" },
    { author: "Amanda Davis", genre: ["Business"], gender: "female" },
    { author: "Jennifer Miller", genre: ["Psychology"], gender: "female" },
    { author: "Lisa Anderson", genre: ["Health & Nutrition"], gender: "female" },
    
    // Unknown gender
    { author: "A. B. Unknown", genre: ["Technology & the Future"], gender: "unknown" },
    { author: "X. Y. Mystery", genre: ["Economics"], gender: "unknown" },
  ];

  for (const testCase of testCases) {
    const metadata = {
      title: `Test Book - ${testCase.genre[0]}`,
      author: testCase.author,
      genre: testCase.genre,
      style_tone: ["Professional"],
      core_themes: ["Test theme"],
      target_audience: ["General audience"]
    };

    const result = await selector.selectVoice(metadata);
    const voice = result.selectedVoice;
    
    voiceUsage[voice] = (voiceUsage[voice] || 0) + 1;
    
    console.log(`${testCase.gender.padEnd(8)} | ${testCase.genre[0].padEnd(25)} | ${voice}`);
  }

  console.log('\n📊 Voice Usage Distribution:');
  console.log('================================');
  Object.entries(voiceUsage)
    .sort(([,a], [,b]) => b - a)
    .forEach(([voice, count]) => {
      console.log(`${voice.padEnd(30)} | ${count} times`);
    });
}

// Run tests
async function runAllTests() {
  try {
    await testSmartVoiceSelector();
    await testVoiceDistribution();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runAllTests();
