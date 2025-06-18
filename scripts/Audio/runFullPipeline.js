#!/usr/bin/env node

import { BookProcessor } from './pipeline/bookProcessor.js';
import { getConfig, validateConfig, printConfigSummary, voiceOptions } from './config/audioConfig.js';
import fs from 'fs';
import path from 'path';

/**
 * Enhanced Audio Generation Pipeline
 * Processes all book summaries and generates high-quality audio files
 */

// Parse command line arguments
const args = process.argv.slice(2);
const options = parseArguments(args);

async function main() {
  try {
    console.log('🎧 Enhanced Audio Generation Pipeline');
    console.log('====================================\n');

    // Get configuration
    const config = getConfig(options.preset || 'balanced');
    
    // Apply command line overrides
    if (options.voice) config.voice = options.voice;
    if (options.speed) config.speed = parseFloat(options.speed);
    if (options.format) config.format = options.format;
    if (options.concurrency) config.concurrency = parseInt(options.concurrency);
    if (options.skipExisting !== undefined) config.skipExisting = options.skipExisting;
    if (options.combineAudio !== undefined) config.combineAudio = options.combineAudio;
    if (options.optimizeText !== undefined) config.optimizeText = options.optimizeText;
    if (options.inputDir) config.inputDir = options.inputDir;
    if (options.outputDir) config.outputDir = options.outputDir;

    // Validate configuration
    const validation = validateConfig(config);
    if (!validation.valid) {
      console.error('❌ Configuration errors:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️  Configuration warnings:');
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }

    // Print configuration summary
    printConfigSummary(config);

    // Check prerequisites
    await checkPrerequisites(config);

    // Handle special commands
    if (options.listVoices) {
      listAvailableVoices();
      return;
    }

    if (options.testSingle) {
      await testSingleBook(config, options.testSingle);
      return;
    }

    if (options.dryRun) {
      await performDryRun(config);
      return;
    }

    // Confirm before processing all books
    if (!options.yes && !await confirmProcessing(config)) {
      console.log('❌ Processing cancelled by user');
      return;
    }

    // Initialize and run the processor
    const processor = new BookProcessor(config);
    
    console.log('\n🚀 Starting batch processing...');
    const startTime = Date.now();
    
    const results = await processor.processAllBooks();
    
    const endTime = Date.now();
    const totalTime = Math.round((endTime - startTime) / 1000);
    
    console.log('\n🎉 Pipeline completed successfully!');
    console.log(`⏰ Total processing time: ${Math.floor(totalTime / 60)}m ${totalTime % 60}s`);
    
    // Generate summary report
    generateSummaryReport(results, config);

  } catch (error) {
    console.error('\n❌ Pipeline failed:', error.message);
    if (options.verbose) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseArguments(args) {
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--preset':
      case '-p':
        options.preset = args[++i];
        break;
      case '--voice':
      case '-v':
        options.voice = args[++i];
        break;
      case '--speed':
      case '-s':
        options.speed = args[++i];
        break;
      case '--format':
      case '-f':
        options.format = args[++i];
        break;
      case '--concurrency':
      case '-c':
        options.concurrency = args[++i];
        break;
      case '--input':
      case '-i':
        options.inputDir = args[++i];
        break;
      case '--output':
      case '-o':
        options.outputDir = args[++i];
        break;
      case '--no-skip':
        options.skipExisting = false;
        break;
      case '--no-combine':
        options.combineAudio = false;
        break;
      case '--no-optimize':
        options.optimizeText = false;
        break;
      case '--test':
      case '-t':
        options.testSingle = args[++i];
        break;
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--list-voices':
      case '-l':
        options.listVoices = true;
        break;
      case '--yes':
      case '-y':
        options.yes = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        if (arg.startsWith('-')) {
          console.warn(`Unknown option: ${arg}`);
        }
    }
  }
  
  return options;
}

/**
 * Print help information
 */
function printHelp() {
  console.log(`
🎧 Enhanced Audio Generation Pipeline

USAGE:
  node runFullPipeline.js [options]

OPTIONS:
  -p, --preset <name>      Use configuration preset (fast|balanced|premium|test)
  -v, --voice <voice>      TTS voice (alloy|echo|fable|nova|onyx|shimmer)
  -s, --speed <speed>      Speech speed (0.25-4.0)
  -f, --format <format>    Audio format (mp3|opus|aac|flac)
  -c, --concurrency <n>    Number of concurrent books to process
  -i, --input <dir>        Input directory path
  -o, --output <dir>       Output directory path
  
  --no-skip               Don't skip existing files
  --no-combine            Don't combine audio files
  --no-optimize           Don't optimize text for audio
  
  -t, --test <bookId>     Test processing on a single book
  -d, --dry-run           Show what would be processed without doing it
  -l, --list-voices       List available voices and exit
  -y, --yes               Skip confirmation prompts
  --verbose               Enable verbose error reporting
  -h, --help              Show this help message

PRESETS:
  fast        Fast processing with basic quality
  balanced    Balanced processing with good quality (default)
  premium     High quality processing (slower)
  test        Testing configuration

EXAMPLES:
  # Process all books with default settings
  node runFullPipeline.js

  # Use premium quality with nova voice
  node runFullPipeline.js --preset premium --voice nova

  # Test single book
  node runFullPipeline.js --test 12

  # Fast processing without text optimization
  node runFullPipeline.js --preset fast --no-optimize

  # Custom settings
  node runFullPipeline.js --voice shimmer --speed 1.2 --concurrency 2
`);
}

/**
 * List available voices
 */
function listAvailableVoices() {
  console.log('\n🎤 Available TTS Voices:');
  console.log('========================\n');
  
  Object.entries(voiceOptions).forEach(([voice, info]) => {
    console.log(`${voice.toUpperCase()}`);
    console.log(`  Description: ${info.description}`);
    console.log(`  Best for: ${info.recommended.join(', ')}`);
    console.log('');
  });
}

/**
 * Check prerequisites before processing
 */
async function checkPrerequisites(config) {
  console.log('\n🔍 Checking prerequisites...');
  
  // Check if input directory exists
  if (!fs.existsSync(config.inputDir)) {
    throw new Error(`Input directory not found: ${config.inputDir}`);
  }
  
  // Check if there are any markdown files
  const files = fs.readdirSync(config.inputDir).filter(f => f.endsWith('.md'));
  if (files.length === 0) {
    throw new Error(`No markdown files found in ${config.inputDir}`);
  }
  
  console.log(`✅ Found ${files.length} markdown files`);
  
  // Check environment variables
  const requiredEnvVars = [
    'AZURE_OPENAI_KEY',
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_DEPLOYMENT_ID'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  console.log('✅ Environment variables configured');
  
  // Check if ffmpeg is available (for audio combination)
  if (config.combineAudio) {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      await execAsync('ffmpeg -version');
      console.log('✅ FFmpeg available for audio combination');
    } catch (error) {
      console.warn('⚠️  FFmpeg not found - audio combination will be disabled');
      config.combineAudio = false;
    }
  }
  
  console.log('✅ Prerequisites check completed');
}

/**
 * Confirm processing with user
 */
async function confirmProcessing(config) {
  const files = fs.readdirSync(config.inputDir).filter(f => f.endsWith('.md'));
  
  console.log('\n📋 Processing Summary:');
  console.log(`📚 Books to process: ${files.length}`);
  console.log(`🎤 Voice: ${config.voice}`);
  console.log(`⚡ Speed: ${config.speed}x`);
  console.log(`✨ Text optimization: ${config.optimizeText ? 'Yes' : 'No'}`);
  console.log(`🔗 Combine audio: ${config.combineAudio ? 'Yes' : 'No'}`);
  
  // Estimate processing time
  const estimatedMinutes = Math.ceil(files.length * (config.optimizeText ? 5 : 2) / config.concurrency);
  console.log(`⏰ Estimated time: ~${estimatedMinutes} minutes`);
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('\n❓ Continue with processing? (y/N): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

/**
 * Test processing on a single book
 */
async function testSingleBook(config, bookId) {
  console.log(`\n🧪 Testing single book: ${bookId}`);
  
  const inputPath = path.join(config.inputDir, `${bookId}.md`);
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Book file not found: ${inputPath}`);
  }
  
  // Override config for testing
  const testConfig = {
    ...config,
    outputDir: path.join(config.outputDir, 'test'),
    skipExisting: false,
    verboseLogging: true
  };
  
  const processor = new BookProcessor(testConfig);
  const result = await processor.processBook(bookId, inputPath);
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Success: ${result.success}`);
  console.log(`📄 Sections: ${result.stats.totalSections}`);
  console.log(`📝 Words: ${result.stats.totalWords}`);
  console.log(`🎵 Audio files: ${result.stats.totalAudioFiles}`);
  console.log(`⏱️  Duration: ${result.stats.totalDuration}s`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => console.log(`  - ${error.message}`));
  }
}

/**
 * Perform dry run to show what would be processed
 */
async function performDryRun(config) {
  console.log('\n🔍 Dry Run - Analyzing files...');
  
  const files = fs.readdirSync(config.inputDir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      bookId: path.basename(f, '.md'),
      filePath: path.join(config.inputDir, f),
      size: fs.statSync(path.join(config.inputDir, f)).size
    }))
    .sort((a, b) => {
      const aNum = parseInt(a.bookId);
      const bNum = parseInt(b.bookId);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.bookId.localeCompare(b.bookId);
    });
  
  console.log(`\n📚 Found ${files.length} books:`);
  
  let totalSize = 0;
  files.forEach((file, index) => {
    const sizeKB = Math.round(file.size / 1024);
    totalSize += file.size;
    
    const outputDir = path.join(config.outputDir, file.bookId);
    const exists = fs.existsSync(outputDir) && 
                   fs.readdirSync(outputDir).some(f => f.endsWith('.mp3'));
    
    const status = config.skipExisting && exists ? '⏭️  SKIP' : '🔄 PROCESS';
    
    console.log(`  ${String(index + 1).padStart(3)}: ${file.bookId.padEnd(8)} (${String(sizeKB).padStart(3)}KB) ${status}`);
  });
  
  const totalMB = Math.round(totalSize / 1024 / 1024);
  const toProcess = files.filter(f => {
    if (!config.skipExisting) return true;
    const outputDir = path.join(config.outputDir, f.bookId);
    return !(fs.existsSync(outputDir) && 
             fs.readdirSync(outputDir).some(file => file.endsWith('.mp3')));
  });
  
  console.log(`\n📊 Summary:`);
  console.log(`📁 Total size: ${totalMB}MB`);
  console.log(`🔄 To process: ${toProcess.length} books`);
  console.log(`⏭️  To skip: ${files.length - toProcess.length} books`);
  
  const estimatedMinutes = Math.ceil(toProcess.length * (config.optimizeText ? 5 : 2) / config.concurrency);
  console.log(`⏰ Estimated time: ~${estimatedMinutes} minutes`);
}

/**
 * Generate summary report
 */
function generateSummaryReport(results, config) {
  const reportPath = path.join(config.logDir, `summary_${Date.now()}.txt`);
  
  const report = `
Enhanced Audio Generation Pipeline - Summary Report
==================================================

Configuration:
- Preset: ${config.preset || 'custom'}
- Voice: ${config.voice}
- Speed: ${config.speed}x
- Format: ${config.format}
- Text Optimization: ${config.optimizeText ? 'Enabled' : 'Disabled'}
- Audio Combination: ${config.combineAudio ? 'Enabled' : 'Disabled'}

Results:
- Total Books: ${results.totalBooks}
- Successful: ${results.successfulBooks}
- Failed: ${results.failedBooks}
- Skipped: ${results.skippedBooks}
- Audio Files Generated: ${results.totalAudioFiles}
- Total Audio Duration: ${Math.round(results.totalDuration / 60)} minutes
- Success Rate: ${results.totalBooks > 0 ? (results.successfulBooks / results.totalBooks * 100).toFixed(1) : 0}%

Processing Time: ${Math.round((results.endTime - results.startTime) / 1000 / 60)} minutes

Generated: ${new Date().toISOString()}
`;

  fs.writeFileSync(reportPath, report);
  console.log(`📋 Summary report saved: ${reportPath}`);
}

// Run the main function
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
