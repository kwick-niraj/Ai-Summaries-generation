#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FormatConverter } from './pipeline/formatConverter.js';
import { SummaryParser } from './modules/summaryParser.js';
import { AudioValidator } from './modules/audioValidator.js';
import { TrackingManager } from './modules/trackingManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * WAV to M4A Validator and Converter
 * Validates audio completeness against summaries and converts to M4A format
 */
class WavToM4aValidator {
  constructor() {
    this.summaryParser = new SummaryParser();
    this.audioValidator = new AudioValidator();
    this.trackingManager = new TrackingManager();
    this.formatConverter = new FormatConverter({ 
      quality: 'veryLow',
      preserveOriginal: true,
      embedChapters: true
    });

    // Paths
    this.summariesPath = path.join(__dirname, '../FinalAllSummaries');
    this.audioOutputPath = path.join(__dirname, 'output');
    this.m4aOutputPath = path.join(__dirname, 'm4a_audio');
    
    // Ensure base M4A output directory exists
    if (!fs.existsSync(this.m4aOutputPath)) {
      fs.mkdirSync(this.m4aOutputPath, { recursive: true });
      console.log(`📁 Created M4A output directory: ${this.m4aOutputPath}`);
    }
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);
    
    const config = {
      bookId: null,
      batch: false,
      dryRun: false,
      status: false,
      force: false,
      verbose: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--book-id' || arg === '-b') {
        config.bookId = args[++i];
      } else if (arg === '--batch') {
        config.batch = true;
      } else if (arg === '--dry-run' || arg === '-d') {
        config.dryRun = true;
      } else if (arg === '--status' || arg === '-s') {
        config.status = true;
      } else if (arg === '--force' || arg === '-f') {
        config.force = true;
      } else if (arg === '--verbose' || arg === '-v') {
        config.verbose = true;
      } else if (arg === '--help' || arg === '-h') {
        this.showUsage();
        process.exit(0);
      }
    }

    return config;
  }

  /**
   * Show usage information
   */
  showUsage() {
    console.log(`
🔄 WAV to M4A Validator and Converter

Usage: node wavToM4aValidator.js [options]

Options:
  -b, --book-id <id>    Process specific book ID
  --batch               Process all pending books
  -d, --dry-run         Show what would be processed without converting
  -s, --status          Show status of all tracked books
  -f, --force           Force reprocess already converted books
  -v, --verbose         Show detailed processing information
  -h, --help           Show this help message

Examples:
  # Process single book
  node wavToM4aValidator.js --book-id 2644
  
  # Batch process all pending
  node wavToM4aValidator.js --batch
  
  # Check status
  node wavToM4aValidator.js --status
  
  # Dry run to see what would be processed
  node wavToM4aValidator.js --batch --dry-run

Quality: veryLow (64kbps AAC)
Output: scripts/Audio/m4a_audio/{book_ID}/{book_ID}_complete.m4a
`);
  }

  /**
   * Process single book
   */
  async processSingleBook(bookId, options = {}) {
    try {
      console.log(`\n📚 Processing Book ID: ${bookId}`);
      
      // Check if already processed (unless force)
      const existingStatus = this.trackingManager.getBookStatus(bookId);
      if (existingStatus?.status === 'converted' && !options.force) {
        console.log(`✅ Book ${bookId} already converted. Use --force to reprocess.`);
        return { success: true, skipped: true, reason: 'already_converted' };
      }

      // Step 1: Validate audio files (Audio-First Approach)
      console.log(`🎵 Scanning and validating audio files...`);
      const audioPath = path.join(this.audioOutputPath, bookId);
      const validationResult = this.audioValidator.validateAudioCompleteness(audioPath);
      
      if (options.verbose && validationResult.audioSections) {
        console.log(`📊 Found audio sections:`, validationResult.audioSections.map(s => 
          s.type + (s.number ? ` ${s.number}` : '') + ` (${s.audioFile})`
        ));
      }
      
      if (!validationResult.isComplete) {
        const error = `Audio validation failed: ${validationResult.missingFiles.join(', ')}`;
        console.error(`❌ ${error}`);
        this.trackingManager.updateBookStatus(bookId, 'rejected', { 
          error, 
          reason: 'incomplete_audio',
          missingFiles: validationResult.missingFiles,
          foundFiles: validationResult.foundFiles
        });
        return { success: false, error, validationResult };
      }

      console.log(`✅ Audio validation passed - all ${validationResult.foundFiles.length} files found`);

      // Step 3: Check for complete WAV file
      const completeWavPath = path.join(audioPath, `${bookId}_complete.wav`);
      if (!fs.existsSync(completeWavPath)) {
        const error = `Complete WAV file not found: ${completeWavPath}`;
        console.error(`❌ ${error}`);
        this.trackingManager.updateBookStatus(bookId, 'rejected', { error, reason: 'missing_complete_wav' });
        return { success: false, error };
      }

      // Step 4: Load chapter metadata
      const chapterMetadata = this.loadChapterMetadata(audioPath, bookId);
      
      if (options.dryRun) {
        console.log(`🔍 DRY RUN - Would convert: ${completeWavPath}`);
        console.log(`📁 Output would be: ${path.join(this.m4aOutputPath, bookId, `${bookId}_complete.m4a`)}`);
        return { success: true, dryRun: true };
      }

      // Step 5: Convert to M4A
      console.log(`🔄 Converting to M4A (veryLow quality - 64kbps)...`);
      const conversionResult = await this.formatConverter.convertBookAudio(
        completeWavPath,
        chapterMetadata,
        this.m4aOutputPath
      );

      if (conversionResult.success) {
        console.log(`✅ Conversion successful!`);
        console.log(`📁 Output: ${conversionResult.outputPath}`);
        
        // Update tracking
        this.trackingManager.updateBookStatus(bookId, 'converted', {
          inputFile: completeWavPath,
          outputFile: conversionResult.outputPath,
          fileSize: conversionResult.fileSize,
          compressionRatio: conversionResult.compressionRatio,
          chapterCount: chapterMetadata?.chapters?.length || 0
        });

        return { success: true, result: conversionResult };
      } else {
        const error = `Conversion failed: ${conversionResult.error}`;
        console.error(`❌ ${error}`);
        this.trackingManager.updateBookStatus(bookId, 'failed', { error, reason: 'conversion_failed' });
        return { success: false, error: conversionResult.error };
      }

    } catch (error) {
      console.error(`❌ Error processing book ${bookId}:`, error);
      this.trackingManager.updateBookStatus(bookId, 'failed', { error: error.message, reason: 'processing_error' });
      return { success: false, error: error.message };
    }
  }

  /**
   * Process all books in batch
   */
  async processBatch(options = {}) {
    try {
      console.log(`🔄 Starting batch processing...`);
      
      // Get all audio directories (Audio-First Approach)
      const audioDirectories = fs.readdirSync(this.audioOutputPath)
        .filter(item => {
          const itemPath = path.join(this.audioOutputPath, item);
          return fs.statSync(itemPath).isDirectory() && !item.startsWith('.');
        });

      console.log(`🎵 Found ${audioDirectories.length} audio directories`);

      // Filter based on tracking status
      const booksToProcess = audioDirectories.filter(bookId => {
        const status = this.trackingManager.getBookStatus(bookId);
        return !status || status.status === 'pending' || status.status === 'failed' || options.force;
      });

      console.log(`🎯 ${booksToProcess.length} books to process`);

      if (booksToProcess.length === 0) {
        console.log(`ℹ️  No books to process. Use --force to reprocess converted books.`);
        return { total: 0, processed: 0, successful: 0, failed: 0 };
      }

      const results = {
        total: booksToProcess.length,
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        results: []
      };

      // Process each book
      for (let i = 0; i < booksToProcess.length; i++) {
        const bookId = booksToProcess[i];
        console.log(`\n📊 Progress: ${i + 1}/${booksToProcess.length}`);
        
        const result = await this.processSingleBook(bookId, options);
        results.results.push({ bookId, ...result });
        results.processed++;

        if (result.success) {
          if (result.skipped) {
            results.skipped++;
          } else {
            results.successful++;
          }
        } else {
          results.failed++;
        }

        // Brief pause between conversions
        if (i < booksToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Summary
      console.log(`\n🎉 Batch processing completed!`);
      console.log(`📊 Total: ${results.total}`);
      console.log(`✅ Successful: ${results.successful}`);
      console.log(`⏭️  Skipped: ${results.skipped}`);
      console.log(`❌ Failed: ${results.failed}`);

      if (results.failed > 0) {
        console.log(`\n❌ Failed books:`);
        results.results
          .filter(r => !r.success)
          .forEach(r => console.log(`  ${r.bookId}: ${r.error}`));
      }

      return results;

    } catch (error) {
      console.error(`❌ Batch processing failed:`, error);
      return { error: error.message };
    }
  }

  /**
   * Show status of all tracked books
   */
  showStatus() {
    console.log(`📊 Book Processing Status\n`);
    
    const allStatuses = this.trackingManager.getAllStatuses();
    const statusCounts = {
      pending: 0,
      validated: 0,
      converted: 0,
      failed: 0,
      rejected: 0
    };

    Object.values(allStatuses).forEach(book => {
      statusCounts[book.status] = (statusCounts[book.status] || 0) + 1;
    });

    console.log(`📈 Summary:`);
    Object.entries(statusCounts).forEach(([status, count]) => {
      if (count > 0) {
        const emoji = {
          pending: '⏳',
          validated: '✅',
          converted: '🎵',
          failed: '❌',
          rejected: '🚫'
        }[status] || '❓';
        console.log(`  ${emoji} ${status}: ${count}`);
      }
    });

    // Show recent activity
    const recentBooks = Object.entries(allStatuses)
      .sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    if (recentBooks.length > 0) {
      console.log(`\n🕒 Recent Activity:`);
      recentBooks.forEach(([bookId, book]) => {
        const emoji = {
          converted: '✅',
          failed: '❌',
          rejected: '🚫'
        }[book.status] || '❓';
        const date = new Date(book.timestamp).toLocaleString();
        console.log(`  ${emoji} ${bookId} - ${book.status} (${date})`);
      });
    }
  }

  /**
   * Load chapter metadata from processing report
   */
  loadChapterMetadata(audioPath, bookId) {
    try {
      const reportPath = path.join(audioPath, 'processing_report.json');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        
        // Extract chapter information from the report
        if (report.chapterTimestamps && report.combinedAudio?.mergePlan?.files) {
          const chapters = report.combinedAudio.mergePlan.files.map((file, index) => ({
            title: file.title || `Chapter ${index + 1}`,
            startTime: Math.round(file.startTime * 1000), // Convert to milliseconds
            endTime: Math.round(file.endTime * 1000)
          }));

          return {
            bookId,
            chapters,
            totalDuration: report.combinedAudio.duration,
            format: 'audiobook'
          };
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not load chapter metadata for ${bookId}:`, error.message);
    }

    return null;
  }

  /**
   * Main execution function
   */
  async run() {
    try {
      const config = this.parseArgs();

      // Check FFmpeg availability
      if (!this.formatConverter.checkFFmpegAvailability()) {
        console.error('❌ FFmpeg is required but not found. Please install FFmpeg.');
        process.exit(1);
      }

      console.log(`🔄 WAV to M4A Validator and Converter`);
      console.log(`📁 Summaries: ${this.summariesPath}`);
      console.log(`🎵 Audio Input: ${this.audioOutputPath}`);
      console.log(`📀 M4A Output: ${this.m4aOutputPath}`);
      console.log(`⚙️  Quality: veryLow (64kbps AAC)\n`);

      if (config.status) {
        this.showStatus();
        return;
      }

      if (config.bookId) {
        await this.processSingleBook(config.bookId, config);
      } else if (config.batch) {
        await this.processBatch(config);
      } else {
        console.log(`❓ No action specified. Use --help for usage information.`);
        this.showUsage();
      }

    } catch (error) {
      console.error(`❌ Application error:`, error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new WavToM4aValidator();
  validator.run();
}

export default WavToM4aValidator;
