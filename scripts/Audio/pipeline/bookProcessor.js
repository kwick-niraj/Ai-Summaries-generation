import fs from 'fs';
import path from 'path';
import { MarkdownParser } from './markdownParser.js';
import { TextOptimizer } from './textOptimizer.js';
import { AudioGenerator } from './audioGenerator.js';

/**
 * Main book processor that orchestrates the entire audio generation pipeline
 */
export class BookProcessor {
  constructor(options = {}) {
    this.parser = new MarkdownParser();
    this.optimizer = new TextOptimizer();
    this.audioGenerator = new AudioGenerator();
    
    this.config = {
      inputDir: options.inputDir || './FinalAllSummaries',
      outputDir: options.outputDir || 'scripts/Audio/output',
      logDir: options.logDir || 'scripts/Audio/logs',
      voice: options.voice || 'nova',
      speed: options.speed || 1.0,
      format: options.format || 'mp3',
      maxChunkLength: options.maxChunkLength || 4000,
      combineAudio: options.combineAudio !== false, // Default true
      skipExisting: options.skipExisting !== false, // Default true
      concurrency: options.concurrency || 1, // Process books one at a time by default
      ...options
    };

    this.stats = {
      totalBooks: 0,
      processedBooks: 0,
      successfulBooks: 0,
      failedBooks: 0,
      skippedBooks: 0,
      totalAudioFiles: 0,
      totalDuration: 0,
      startTime: null,
      endTime: null,
      errors: []
    };
  }

  /**
   * Process all books in the input directory
   * @returns {Promise<Object>} Processing results
   */
  async processAllBooks() {
    console.log('🚀 Starting batch audio generation pipeline...');
    console.log(`📂 Input directory: ${this.config.inputDir}`);
    console.log(`📁 Output directory: ${this.config.outputDir}`);
    
    this.stats.startTime = new Date();
    
    try {
      // Get list of markdown files
      const bookFiles = this.getBookFiles();
      this.stats.totalBooks = bookFiles.length;
      
      console.log(`📚 Found ${bookFiles.length} books to process`);
      
      if (bookFiles.length === 0) {
        throw new Error(`No markdown files found in ${this.config.inputDir}`);
      }

      // Create output and log directories
      this.ensureDirectories();
      
      // Start processing log
      await this.initializeProcessingLog();

      // Process books
      if (this.config.concurrency > 1) {
        await this.processBooksInBatches(bookFiles);
      } else {
        await this.processBooksSequentially(bookFiles);
      }

      this.stats.endTime = new Date();
      
      // Generate final report
      await this.generateFinalReport();
      
      console.log('\n🎉 Batch processing completed!');
      this.printFinalStats();
      
      return this.stats;

    } catch (error) {
      console.error('❌ Batch processing failed:', error);
      this.stats.errors.push({
        type: 'batch_processing',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.stats.endTime = new Date();
      await this.generateFinalReport();
      
      throw error;
    }
  }

  /**
   * Process a single book
   * @param {string} bookId - Book identifier
   * @param {string} inputPath - Path to markdown file
   * @returns {Promise<Object>} Processing result
   */
  async processBook(bookId, inputPath) {
    const startTime = new Date();
    console.log(`\n📖 Processing book: ${bookId}`);
    console.log(`📄 Input file: ${inputPath}`);
    
    const result = {
      bookId,
      inputPath,
      success: false,
      skipped: false,
      startTime,
      endTime: null,
      sections: null,
      audioResults: null,
      combinedAudio: null,
      errors: [],
      stats: {
        totalSections: 0,
        totalWords: 0,
        totalAudioFiles: 0,
        totalDuration: 0
      }
    };

    try {
      const outputDir = path.join(this.config.outputDir, bookId);
      
      // Check if already processed and skip if requested
      if (this.config.skipExisting && this.isBookAlreadyProcessed(outputDir)) {
        console.log(`⏭️  Skipping ${bookId} - already processed`);
        result.skipped = true;
        result.success = true;
        this.stats.skippedBooks++;
        return result;
      }

      // Step 1: Parse markdown structure
      console.log('🔍 Parsing markdown structure...');
      const sections = this.parser.parseBookStructure(inputPath);
      result.sections = sections;
      
      const summary = this.parser.getProcessingSummary(sections);
      result.stats.totalSections = summary.totalSections;
      result.stats.totalWords = summary.totalWords;
      
      console.log(`📊 Structure: ${summary.totalSections} sections, ${summary.totalWords} words`);
      console.log(`📈 Estimated chunks: ${summary.estimatedTotalChunks}`);

      // Step 2: Optimize text for audio
      console.log('✨ Optimizing text for audio...');
      const optimizedSections = await this.optimizeBookSections(sections);

      // Step 3: Generate audio files
      console.log('🎵 Generating audio files...');
      const audioResults = await this.audioGenerator.generateBookAudio(
        optimizedSections,
        bookId,
        outputDir,
        {
          voice: this.config.voice,
          speed: this.config.speed,
          format: this.config.format,
          maxChunkLength: this.config.maxChunkLength
        }
      );
      
      result.audioResults = audioResults;
      result.stats.totalAudioFiles = audioResults.totalFiles;
      result.stats.totalDuration = audioResults.totalDuration;

      // Step 4: Combine audio files if requested
      if (this.config.combineAudio && audioResults.successfulFiles > 0) {
        console.log('🔗 Combining audio files...');
        const combinedResult = await this.combineBookAudio(audioResults, bookId, outputDir);
        result.combinedAudio = combinedResult;
      }

      // Step 5: Generate book report
      await this.generateBookReport(result);

      result.success = audioResults.successfulFiles > 0;
      result.endTime = new Date();
      
      if (result.success) {
        console.log(`✅ Book ${bookId} processed successfully`);
        console.log(`📊 Generated ${audioResults.successfulFiles} audio files`);
        console.log(`⏱️  Total duration: ${this.audioGenerator.formatDuration(audioResults.totalDuration)}`);
        this.stats.successfulBooks++;
      } else {
        console.log(`❌ Book ${bookId} processing failed`);
        this.stats.failedBooks++;
      }

      this.stats.processedBooks++;
      this.stats.totalAudioFiles += result.stats.totalAudioFiles;
      this.stats.totalDuration += result.stats.totalDuration;

      return result;

    } catch (error) {
      console.error(`❌ Error processing book ${bookId}:`, error);
      result.errors.push({
        type: 'book_processing',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      result.endTime = new Date();
      this.stats.failedBooks++;
      this.stats.processedBooks++;
      
      return result;
    }
  }

  /**
   * Optimize all sections of a book for audio
   * @param {Object} sections - Book sections
   * @returns {Promise<Object>} Optimized sections
   */
  async optimizeBookSections(sections) {
    const optimized = {
      introduction: null,
      chapters: [],
      conclusion: null
    };

    try {
      // Optimize introduction
      if (sections.introduction) {
        console.log('  📖 Optimizing introduction...');
        const chunks = this.parser.splitIntoChunks(sections.introduction.content, 400);
        const optimizedChunks = await this.optimizer.batchOptimize(chunks, 'introduction');
        optimized.introduction = {
          ...sections.introduction,
          content: optimizedChunks.join(' ')
        };
      }

      // Optimize chapters
      if (sections.chapters && sections.chapters.length > 0) {
        console.log(`  📚 Optimizing ${sections.chapters.length} chapters...`);
        
        for (const chapter of sections.chapters) {
          const chunks = this.parser.splitIntoChunks(chapter.content, 400);
          const optimizedChunks = await this.optimizer.batchOptimize(chunks, 'chapter');
          
          optimized.chapters.push({
            ...chapter,
            content: optimizedChunks.join(' ')
          });
          
          // Small delay between chapters
          await this.delay(500);
        }
      }

      // Optimize conclusion
      if (sections.conclusion) {
        console.log('  🎯 Optimizing conclusion...');
        const chunks = this.parser.splitIntoChunks(sections.conclusion.content, 400);
        const optimizedChunks = await this.optimizer.batchOptimize(chunks, 'conclusion');
        optimized.conclusion = {
          ...sections.conclusion,
          content: optimizedChunks.join(' ')
        };
      }

      return optimized;

    } catch (error) {
      console.error('Text optimization failed:', error);
      // Return original sections as fallback
      return sections;
    }
  }

  /**
   * Combine all audio files for a book
   * @param {Object} audioResults - Audio generation results
   * @param {string} bookId - Book identifier
   * @param {string} outputDir - Output directory
   * @returns {Promise<Object>} Combination result
   */
  async combineBookAudio(audioResults, bookId, outputDir) {
    const audioFiles = [];
    
    // Collect all successful audio files in order
    if (audioResults.sections.introduction?.files) {
      audioFiles.push(...audioResults.sections.introduction.files
        .filter(f => f.success)
        .map(f => f.outputPath));
    }
    
    if (audioResults.sections.chapters) {
      for (const chapter of audioResults.sections.chapters) {
        if (chapter.files) {
          audioFiles.push(...chapter.files
            .filter(f => f.success)
            .map(f => f.outputPath));
        }
      }
    }
    
    if (audioResults.sections.conclusion?.files) {
      audioFiles.push(...audioResults.sections.conclusion.files
        .filter(f => f.success)
        .map(f => f.outputPath));
    }

    if (audioFiles.length === 0) {
      return { success: false, error: 'No audio files to combine' };
    }

    const combinedPath = path.join(outputDir, `${bookId}_complete.${this.config.format}`);
    
    return await this.audioGenerator.combineAudioFiles(audioFiles, combinedPath, {
      addSilence: 1.5, // 1.5 second pause between sections
      fadeIn: 0.2,
      fadeOut: 0.2
    });
  }

  /**
   * Get list of book files to process
   * @returns {Array} Array of {bookId, filePath} objects
   */
  getBookFiles() {
    try {
      const files = fs.readdirSync(this.config.inputDir)
        .filter(file => file.endsWith('.md'))
        .map(file => ({
          bookId: path.basename(file, '.md'),
          filePath: path.join(this.config.inputDir, file)
        }))
        .sort((a, b) => {
          // Sort numerically if possible, otherwise alphabetically
          const aNum = parseInt(a.bookId);
          const bNum = parseInt(b.bookId);
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
          }
          return a.bookId.localeCompare(b.bookId);
        });
      
      return files;
    } catch (error) {
      throw new Error(`Failed to read input directory ${this.config.inputDir}: ${error.message}`);
    }
  }

  /**
   * Check if a book has already been processed
   * @param {string} outputDir - Book output directory
   * @returns {boolean} Whether book is already processed
   */
  isBookAlreadyProcessed(outputDir) {
    if (!fs.existsSync(outputDir)) {
      return false;
    }
    
    // Check for any audio files
    const files = fs.readdirSync(outputDir);
    return files.some(file => file.endsWith('.mp3') || file.endsWith('.wav'));
  }

  /**
   * Process books sequentially
   * @param {Array} bookFiles - Array of book files
   */
  async processBooksSequentially(bookFiles) {
    for (let i = 0; i < bookFiles.length; i++) {
      const { bookId, filePath } = bookFiles[i];
      
      console.log(`\n📊 Progress: ${i + 1}/${bookFiles.length} books`);
      
      try {
        await this.processBook(bookId, filePath);
      } catch (error) {
        console.error(`Failed to process book ${bookId}:`, error);
        this.stats.errors.push({
          bookId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      // Log progress
      await this.logProgress(bookId, i + 1, bookFiles.length);
    }
  }

  /**
   * Process books in batches (concurrent processing)
   * @param {Array} bookFiles - Array of book files
   */
  async processBooksInBatches(bookFiles) {
    const batchSize = this.config.concurrency;
    
    for (let i = 0; i < bookFiles.length; i += batchSize) {
      const batch = bookFiles.slice(i, i + batchSize);
      console.log(`\n📊 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} books)`);
      
      const batchPromises = batch.map(({ bookId, filePath }) => 
        this.processBook(bookId, filePath).catch(error => {
          console.error(`Batch processing failed for ${bookId}:`, error);
          this.stats.errors.push({
            bookId,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          return null;
        })
      );
      
      await Promise.all(batchPromises);
      
      // Log batch progress
      const processed = Math.min(i + batchSize, bookFiles.length);
      await this.logProgress(`batch_${Math.floor(i / batchSize) + 1}`, processed, bookFiles.length);
    }
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    [this.config.outputDir, this.config.logDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  /**
   * Initialize processing log
   */
  async initializeProcessingLog() {
    const logPath = path.join(this.config.logDir, `processing_${Date.now()}.log`);
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'batch_start',
      config: this.config,
      totalBooks: this.stats.totalBooks
    };
    
    fs.writeFileSync(logPath, JSON.stringify(logEntry, null, 2) + '\n');
    this.currentLogPath = logPath;
  }

  /**
   * Log processing progress
   * @param {string} bookId - Book identifier
   * @param {number} processed - Number processed
   * @param {number} total - Total number
   */
  async logProgress(bookId, processed, total) {
    if (!this.currentLogPath) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'progress',
      bookId,
      processed,
      total,
      stats: { ...this.stats }
    };
    
    fs.appendFileSync(this.currentLogPath, JSON.stringify(logEntry, null, 2) + '\n');
  }

  /**
   * Generate report for a single book
   * @param {Object} result - Book processing result
   */
  async generateBookReport(result) {
    const reportPath = path.join(this.config.outputDir, result.bookId, 'processing_report.json');
    
    const report = {
      bookId: result.bookId,
      timestamp: new Date().toISOString(),
      success: result.success,
      processingTime: result.endTime - result.startTime,
      stats: result.stats,
      sections: result.sections ? {
        introduction: !!result.sections.introduction,
        chapters: result.sections.chapters?.length || 0,
        conclusion: !!result.sections.conclusion
      } : null,
      audioFiles: result.audioResults ? {
        total: result.audioResults.totalFiles,
        successful: result.audioResults.successfulFiles,
        failed: result.audioResults.failedFiles,
        duration: result.audioResults.totalDuration
      } : null,
      combinedAudio: result.combinedAudio,
      errors: result.errors
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  /**
   * Generate final processing report
   */
  async generateFinalReport() {
    const reportPath = path.join(this.config.logDir, `final_report_${Date.now()}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      processingTime: this.stats.endTime - this.stats.startTime,
      config: this.config,
      stats: this.stats,
      summary: {
        successRate: this.stats.totalBooks > 0 ? (this.stats.successfulBooks / this.stats.totalBooks * 100).toFixed(1) + '%' : '0%',
        averageProcessingTime: this.stats.processedBooks > 0 ? 
          Math.round((this.stats.endTime - this.stats.startTime) / this.stats.processedBooks / 1000) + 's' : '0s',
        totalDuration: this.audioGenerator.formatDuration(this.stats.totalDuration)
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📋 Final report saved: ${reportPath}`);
  }

  /**
   * Print final statistics
   */
  printFinalStats() {
    const duration = this.stats.endTime - this.stats.startTime;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log('\n📊 FINAL STATISTICS');
    console.log('==================');
    console.log(`📚 Total books: ${this.stats.totalBooks}`);
    console.log(`✅ Successful: ${this.stats.successfulBooks}`);
    console.log(`❌ Failed: ${this.stats.failedBooks}`);
    console.log(`⏭️  Skipped: ${this.stats.skippedBooks}`);
    console.log(`🎵 Audio files: ${this.stats.totalAudioFiles}`);
    console.log(`⏱️  Total audio: ${this.audioGenerator.formatDuration(this.stats.totalDuration)}`);
    console.log(`⏰ Processing time: ${hours}h ${minutes}m`);
    console.log(`📈 Success rate: ${this.stats.totalBooks > 0 ? (this.stats.successfulBooks / this.stats.totalBooks * 100).toFixed(1) : 0}%`);
  }

  /**
   * Utility delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BookProcessor;
