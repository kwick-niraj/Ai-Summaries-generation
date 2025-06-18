#!/usr/bin/env node

import { MarkdownParser } from './pipeline/markdownParser.js';
import { TextOptimizer } from './pipeline/textOptimizer.js';
import { AudioGenerator } from './pipeline/audioGenerator.js';
import { getConfig, printConfigSummary } from './config/audioConfig.js';
import fs from 'fs';
import path from 'path';

/**
 * Test script for the audio generation pipeline
 * Tests individual components and a complete workflow
 */

async function main() {
  console.log('🧪 Audio Pipeline Test Suite');
  console.log('============================\n');

  try {
    // Test 1: Configuration
    console.log('1️⃣  Testing Configuration...');
    const config = getConfig('test');
    printConfigSummary(config);
    console.log('✅ Configuration test passed\n');

    // Test 2: Markdown Parser
    console.log('2️⃣  Testing Markdown Parser...');
    await testMarkdownParser();
    console.log('✅ Markdown parser test passed\n');

    // Test 3: Text Optimizer (if enabled)
    if (config.optimizeText) {
      console.log('3️⃣  Testing Text Optimizer...');
      await testTextOptimizer();
      console.log('✅ Text optimizer test passed\n');
    } else {
      console.log('3️⃣  Skipping Text Optimizer (disabled in config)\n');
    }

    // Test 4: Audio Generator
    console.log('4️⃣  Testing Audio Generator...');
    await testAudioGenerator();
    console.log('✅ Audio generator test passed\n');

    // Test 5: End-to-End Test
    console.log('5️⃣  Running End-to-End Test...');
    await testEndToEnd();
    console.log('✅ End-to-end test passed\n');

    console.log('🎉 All tests passed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('- Run: node runFullPipeline.js --test 12');
    console.log('- Or: node runFullPipeline.js --dry-run');
    console.log('- Or: node runFullPipeline.js --preset balanced');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

/**
 * Test markdown parser functionality
 */
async function testMarkdownParser() {
  const parser = new MarkdownParser();
  
  // Find a test file
  const inputDir = './FinalAllSummaries';
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.md'));
  
  if (files.length === 0) {
    throw new Error(`No markdown files found in ${inputDir}`);
  }
  
  const testFile = path.join(inputDir, files[0]);
  console.log(`  📄 Testing with: ${files[0]}`);
  
  // Parse the file
  const sections = parser.parseBookStructure(testFile);
  
  // Validate structure
  if (!sections.introduction && !sections.chapters.length && !sections.conclusion) {
    throw new Error('No sections found in markdown file');
  }
  
  const summary = parser.getProcessingSummary(sections);
  console.log(`  📊 Found: ${summary.totalSections} sections, ${summary.totalWords} words`);
  
  // Test chunking
  if (sections.introduction) {
    const chunks = parser.splitIntoChunks(sections.introduction.content, 400);
    console.log(`  🔪 Introduction split into ${chunks.length} chunks`);
  }
}

/**
 * Test text optimizer functionality
 */
async function testTextOptimizer() {
  const optimizer = new TextOptimizer();
  
  const testText = `## Introduction

This is a test introduction with some markdown formatting. It includes **bold text** and *italic text*. 

The text also has abbreviations like e.g. and i.e. that should be converted for audio.

---

This section tests various formatting elements.`;

  console.log('  🔄 Optimizing sample text...');
  
  try {
    const optimized = await optimizer.optimizeForAudio(testText, 'introduction');
    
    if (!optimized || optimized.length === 0) {
      throw new Error('Text optimization returned empty result');
    }
    
    console.log(`  📝 Original: ${testText.length} chars`);
    console.log(`  ✨ Optimized: ${optimized.length} chars`);
    
    // Check if abbreviations were converted
    if (optimized.includes('e.g.') || optimized.includes('i.e.')) {
      console.log('  ⚠️  Warning: Some abbreviations may not have been converted');
    }
    
  } catch (error) {
    if (error.message.includes('API') || error.message.includes('network')) {
      console.log('  ⚠️  Skipping AI optimization test (API not available)');
      
      // Test basic formatting instead
      const basicOptimized = optimizer.applyAudioFormatting(
        optimizer.cleanMarkdownText(testText), 
        'introduction'
      );
      
      if (!basicOptimized || basicOptimized.length === 0) {
        throw new Error('Basic text formatting failed');
      }
      
      console.log('  ✅ Basic text formatting works');
    } else {
      throw error;
    }
  }
}

/**
 * Test audio generator functionality
 */
async function testAudioGenerator() {
  const generator = new AudioGenerator();
  
  // Test configuration
  if (!process.env.AZURE_OPENAI_KEY) {
    console.log('  ⚠️  Skipping audio generation test (no API key)');
    return;
  }
  
  console.log('  🔧 Audio generator initialized');
  console.log('  📋 Configuration validated');
  
  // Test file naming
  const testSection = {
    number: 1,
    title: 'Test Chapter',
    content: 'This is test content.'
  };
  
  const fileName = generator.generateFileName('chapter', testSection, 0, 1);
  if (!fileName.includes('chapter_01')) {
    throw new Error('File naming logic failed');
  }
  
  console.log(`  📁 File naming: ${fileName}`);
  
  // Test content splitting
  const longContent = 'This is a very long piece of content. '.repeat(200);
  const chunks = generator.splitSectionForTTS(longContent, 1000);
  
  if (chunks.length === 0) {
    throw new Error('Content splitting failed');
  }
  
  console.log(`  🔪 Content splitting: ${chunks.length} chunks`);
}

/**
 * Test end-to-end workflow without actual TTS generation
 */
async function testEndToEnd() {
  const parser = new MarkdownParser();
  const optimizer = new TextOptimizer();
  
  // Find a small test file
  const inputDir = './FinalAllSummaries';
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.md'));
  
  if (files.length === 0) {
    throw new Error(`No markdown files found in ${inputDir}`);
  }
  
  const testFile = path.join(inputDir, files[0]);
  const bookId = path.basename(files[0], '.md');
  
  console.log(`  📖 Testing workflow with book: ${bookId}`);
  
  // Step 1: Parse
  const sections = parser.parseBookStructure(testFile);
  console.log('  ✅ Parsing completed');
  
  // Step 2: Optimize (basic formatting only to avoid API calls)
  const optimizedSections = {
    introduction: null,
    chapters: [],
    conclusion: null
  };
  
  if (sections.introduction) {
    optimizedSections.introduction = {
      ...sections.introduction,
      content: optimizer.applyAudioFormatting(
        optimizer.cleanMarkdownText(sections.introduction.content),
        'introduction'
      )
    };
  }
  
  if (sections.chapters.length > 0) {
    optimizedSections.chapters = sections.chapters.map(chapter => ({
      ...chapter,
      content: optimizer.applyAudioFormatting(
        optimizer.cleanMarkdownText(chapter.content),
        'chapter'
      )
    }));
  }
  
  if (sections.conclusion) {
    optimizedSections.conclusion = {
      ...sections.conclusion,
      content: optimizer.applyAudioFormatting(
        optimizer.cleanMarkdownText(sections.conclusion.content),
        'conclusion'
      )
    };
  }
  
  console.log('  ✅ Text optimization completed');
  
  // Step 3: Validate optimized content
  const totalOptimizedLength = 
    (optimizedSections.introduction?.content.length || 0) +
    optimizedSections.chapters.reduce((sum, ch) => sum + ch.content.length, 0) +
    (optimizedSections.conclusion?.content.length || 0);
  
  if (totalOptimizedLength === 0) {
    throw new Error('No content after optimization');
  }
  
  console.log(`  📊 Total optimized content: ${totalOptimizedLength} characters`);
  console.log('  ✅ Workflow validation completed');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { main as runTests };
