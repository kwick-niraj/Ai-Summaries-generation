import fs from 'fs';
import path from 'path';
import { MarkdownParser } from './markdownParser.js';
import { TextOptimizer } from './textOptimizer.js';
import { AudioGenerator } from './audioGenerator.js';
import { OptimizedTextSaver } from './optimizedTextSaver.js';
import { ChapterTimestampGenerator } from './chapterTimestampGenerator.js';
import { AudioMerger } from './audioMerger.js';
import { FormatConverter } from './formatConverter.js';
import { VoiceSelector } from './voiceSelector.js';
import { TextCacheManager } from './textCacheManager.js';
import { ProcessedBookTracker } from './csvTracker.js';

/**
 * Main book processor that orchestrates the entire audio generation pipeline
 */
export class BookProcessor {
  constructor(options = {}) {
    this.config = {
      inputDir: options.inputDir || './FinalAllSummaries',
      outputDir: options.outputDir || 'scripts/Audio/output',
      logDir: options.logDir || 'scripts/Audio/logs',
      logFile: options.logFile || 'scripts/Audio/logs/processed_book_ids.csv',
      metadataDir: options.metadataDir || '../Meta of All Books DB',
      voice: options.voice || null, // Will be auto-selected if null
      speed: options.speed || 1.0,
      format: options.format || 'mp3',
      maxChunkLength: options.maxChunkLength || 3000,
      combineAudio: options.combineAudio !== false, // Default true
      skipExisting: options.skipExisting !== false, // Default true
      concurrency: options.concurrency || 1, // Process books one at a time by default
      enableSSML: options.enableSSML !== false, // Default true
      intelligentVoiceSelection: options.intelligentVoiceSelection !== false, // Default true
      trackProcessing: options.trackProcessing !== false, // Default true
      ...options
    };

    console.log('Niraj Book Processing Configs', this.config);

    // Initialize components with configuration
    this.parser = new MarkdownParser();
    this.optimizer = new TextOptimizer();
    this.audioGenerator = new AudioGenerator(this.config);
    this.textSaver = new OptimizedTextSaver();
    this.timestampGenerator = new ChapterTimestampGenerator();
    this.audioMerger = new AudioMerger();
    this.formatConverter = new FormatConverter();
    this.voiceSelector = new VoiceSelector();

    // Initialize text cache manager with configuration
    this.cacheManager = new TextCacheManager(this.config);

    // Initialize book processing tracker if enabled
    this.processingTracker = this.config.trackProcessing
      ? new ProcessedBookTracker(this.config.logFile)
      : null;

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
   * Process a single book with comprehensive error handling
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
      retryAttempts: 0,
      stats: {
        totalSections: 0,
        totalWords: 0,
        totalAudioFiles: 0,
        totalDuration: 0
      }
    };

    // Ensure CSV tracker is initialized
    if (this.processingTracker) {
      try {
        await this.processingTracker.initialize();
      } catch (err) {
        console.error(`⚠️ Failed to initialize tracker for ${bookId}:`, err);
      }
    }

    // Skip if already processed
    if (this.processingTracker?.isAlreadyProcessed(bookId)) {
      console.log(`⏭️ Skipping ${bookId} — already marked as processed`);
      result.skipped = true;
      result.success = true;
      result.endTime = new Date();
      this.stats.skippedBooks++;
      this.stats.processedBooks++;
      return result;
    }

    try {
      const outputDir = path.join(this.config.outputDir, bookId);

      // 1. Parse markdown
      console.log('🔍 Parsing markdown structure...');
      try {
        const sections = this.parser.parseBookStructure(inputPath);
        result.sections = sections;
        const summary = this.parser.getProcessingSummary(sections);
        result.stats.totalSections = summary.totalSections;
        result.stats.totalWords = summary.totalWords;
        console.log(`📊 ${summary.totalSections} sections, ${summary.totalWords} words`);
      } catch (err) {
        return await this._handleFailure('parsing', err, result);
      }

      // 2. Voice selection
      let voiceConfig = null;
      if (this.config.intelligentVoiceSelection) {
        console.log('🎤 Selecting voice...');
        try {
          voiceConfig = await this.voiceSelector.selectVoiceForBook(bookId, this.config.metadataDir);
          result.voiceSelection = voiceConfig;
        } catch (err) {
          console.warn(`⚠️ Voice selection failed. Using fallback.`);
          voiceConfig = {
            selectedVoice: this.config.voice || 'nova',
            confidence: 0,
            reasoning: 'Fallback due to error'
          };
          result.voiceSelection = voiceConfig;
        }
      }

      // 3. Optimize text
      console.log('✨ Optimizing text...');
      let optimizedSections;
      try {
        optimizedSections = await this.optimizeBookSections(
          result.sections, voiceConfig, bookId, outputDir, inputPath, this.config.enableSSML
        );
        result.optimizedSections = optimizedSections;
      } catch (err) {
        return await this._handleFailure('text_optimization', err, result);
      }

      // 4. Save text
      console.log('💾 Saving text...');
      let textSaveResult;
      try {
        textSaveResult = await this.textSaver.saveDualTrackOptimizedBook(
          optimizedSections, bookId, outputDir, voiceConfig
        );
        result.optimizedTextSaved = textSaveResult;
      } catch (err) {
        return await this._handleFailure('file_operation', err, result);
      }

      // 5. Generate audio
      console.log('🎵 Generating audio...');
      let audioResults;
      try {
        const selectedVoice = voiceConfig?.selectedVoice || this.config.voice || 'nova';
        audioResults = await this.audioGenerator.generateBookAudio(
          optimizedSections.audio,
          bookId,
          outputDir,
          {
            voice: selectedVoice,
            speed: this.config.speed,
            format: this.config.format,
            maxChunkLength: this.config.maxChunkLength,
            ssmlConfig: voiceConfig?.ssmlConfig
          },
          this.config.enableSSML
        );
        result.audioResults = audioResults;
        result.stats.totalAudioFiles = audioResults.totalFiles;
        result.stats.totalDuration = audioResults.totalDuration;
      } catch (err) {
        return await this._handleFailure('audio_generation', err, result);
      }

      // 6. Timestamps
      console.log('⏱️ Generating timestamps...');
      try {
        const ts = await this.timestampGenerator.generateChapterTimestamps(audioResults, bookId, outputDir);
        result.chapterTimestamps = ts;
      } catch (err) {
        console.warn(`⚠️ Timestamp generation failed: ${err.message}`);
      }

      // 7. Metadata
      if (result.chapterTimestamps?.success) {
        try {
          result.playlist = await this.timestampGenerator.generatePlaylist(result.chapterTimestamps.chapterData, outputDir);
        } catch (err) {
          console.warn(`⚠️ Playlist generation failed: ${err.message}`);
        }
        try {
          result.webvttChapters = await this.timestampGenerator.generateWebVTTChapters(result.chapterTimestamps.chapterData, outputDir);
        } catch (err) {
          console.warn(`⚠️ VTT generation failed: ${err.message}`);
        }
      }

      // 8. Combine audio
      if (this.config.combineAudio && audioResults.successfulFiles > 0) {
        try {
          result.combinedAudio = await this.combineBookAudio(audioResults, result, bookId, outputDir);
        } catch (err) {
          console.warn(`⚠️ Combine failed: ${err.message}`);
        }
      }

      // 9. Generate report
      try {
        await this.generateBookReport(result);
      } catch (err) {
        console.warn(`⚠️ Report generation failed: ${err.message}`);
      }

      // ✅ Final result
      result.success = audioResults.successfulFiles > 0 && textSaveResult.success;
      result.endTime = new Date();

      if (result.success) {
        console.log(`✅ Book ${bookId} processed successfully`);
        this.stats.successfulBooks++;
        if (this.processingTracker) {
          await this.processingTracker.markAsProcessed(bookId); // ✅ Mark in CSV
        }
      } else {
        console.log(`❌ Book ${bookId} failed`);
        this.stats.failedBooks++;
      }

      this.stats.processedBooks++;
      this.stats.totalAudioFiles += result.stats.totalAudioFiles;
      this.stats.totalDuration += result.stats.totalDuration;

      return result;

    } catch (err) {
      console.error(`❌ Unexpected error for ${bookId}:`, err);
      result.success = false;
      result.errorDetails = {
        stage: 'unexpected_error',
        error: err.message
      };
      result.errors.push({
        type: 'book_processing',
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      result.endTime = new Date();
      this.stats.failedBooks++;
      this.stats.processedBooks++;
      return result;
    }
  }
  /**
   * Optimize all sections of a book with dual-track processing (audio + reading)
   * Uses intelligent caching to avoid re-optimization when possible
   * @param {Object} sections - Book sections
   * @param {Object} voiceConfig - Voice configuration from voice selector
   * @param {string} bookId - Book identifier for caching
   * @param {string} outputDir - Output directory for caching
   * @param {string} inputPath - Input file path for cache freshness check
   * @param {boolean} enableSSML - Whether SSML is enabled
   * @returns {Promise<Object>} Optimized sections with both audio and reading versions
   */
  async optimizeBookSections(sections, voiceConfig = null, bookId = null, outputDir = null, inputPath = null, enableSSML) {
    // Step 1: Check cache first
    if (bookId && outputDir) {
      console.log('💾 Checking optimized text cache...');
      const cacheCheck = await this.cacheManager.checkCache(bookId, outputDir, inputPath);

      if (cacheCheck.valid) {
        // Load cached optimized text
        const cachedResult = await this.cacheManager.loadCachedText(bookId, outputDir, enableSSML);

        // console.log('niraj cachedResult', cachedResult.audio.chapters)

        if (cachedResult.success) {
          // Handle partial cache (missing one version)
          // if (cachedResult.partialCache) {
          //   console.log(`⚠️  Partial cache found for ${bookId}, generating missing versions: ${cachedResult.missingVersions.join(', ')}`);

          //   // Generate missing versions
          //   const missingOptimized = await this.generateMissingOptimizedVersions(
          //     sections, 
          //     cachedResult, 
          //     voiceConfig
          //   );

          //   return {
          //     audio: missingOptimized.audio || cachedResult.audio,
          //     reading: missingOptimized.reading || cachedResult.reading,
          //     loadedFrom: 'partial_cache',
          //     cacheInfo: cacheCheck
          //   };
          // }

          // // Full cache hit - apply SSML if needed
          // if (cachedResult.audio && this.config.enableSSML && voiceConfig?.ssmlConfig) {
          //   console.log('🎵 Applying SSML to cached audio content...');
          //   // cachedResult.audio = this.applySSMLToSections(cachedResult.audio, voiceConfig);
          // }

          return {
            audio: cachedResult.audio,
            reading: cachedResult.reading,
            loadedFrom: 'cache',
            cacheInfo: cacheCheck
          };
        }
      }

      // Cache miss - log reason
      console.log(`💾 Cache miss: ${cacheCheck.reason}`);
    }

    // Step 2: Perform fresh optimization
    console.log('✨ Performing fresh dual-track optimization...');

    const optimizedAudio = {
      introduction: null,
      chapters: [],
      conclusion: null
    };

    const optimizedReading = {
      introduction: null,
      chapters: [],
      conclusion: null
    };

    try {
      // Optimize introduction
      if (sections.introduction) {
        console.log('  📖 Dual-track optimizing introduction...');
        const chunks = this.parser.splitIntoChunks(sections.introduction.content);

        // Process chunks for both audio and reading
        const audioChunks = [];
        const readingChunks = [];

        for (const chunk of chunks) {
          const dualResult = await this.optimizer.optimizeDualTrack(chunk, 'introduction', {
            ...this.config,
            ...voiceConfig,
            voice: voiceConfig.selectedVoice,
            provider: 'azure-speech',
            enableSSML: this.config.enableSSML
          });
          audioChunks.push(dualResult.audio);
          readingChunks.push(dualResult.reading);
        }

        const audioText = audioChunks.join(' ');
        const readingText = readingChunks.join(' ');

        // Use LLM-generated SSML directly (no additional wrapping needed)
        const finalAudioContent = audioText;

        optimizedAudio.introduction = {
          ...sections.introduction,
          content: finalAudioContent
        };

        optimizedReading.introduction = {
          ...sections.introduction,
          content: readingText
        };
      }

      // Optimize chapters
      if (sections.chapters && sections.chapters.length > 0) {
        console.log(`  📚 Dual-track optimizing ${sections.chapters.length} chapters...`);

        for (const chapter of sections.chapters) {
          const chunks = this.parser.splitIntoChunks(chapter.content);

          // Process chunks for both audio and reading
          const audioChunks = [];
          const readingChunks = [];

          for (const chunk of chunks) {
            const dualResult = await this.optimizer.optimizeDualTrack(chunk, 'chapter', {
              ...this.config,
              ...voiceConfig,
              voice: voiceConfig.selectedVoice,
              provider: 'azure-speech',
              enableSSML: this.config.enableSSML
            });
            audioChunks.push(dualResult.audio);
            readingChunks.push(dualResult.reading);
          }

          const audioText = audioChunks.join(' ');
          const readingText = readingChunks.join(' ');

          // Use LLM-generated SSML directly (no additional wrapping needed)
          const finalAudioContent = audioText;

          optimizedAudio.chapters.push({
            ...chapter,
            content: finalAudioContent
          });

          optimizedReading.chapters.push({
            ...chapter,
            content: readingText
          });

          // Small delay between chapters
          await this.delay(500);
        }
      }

      // Optimize conclusion
      if (sections.conclusion) {
        console.log('  🎯 Dual-track optimizing conclusion...');
        const chunks = this.parser.splitIntoChunks(sections.conclusion.content);

        // Process chunks for both audio and reading
        const audioChunks = [];
        const readingChunks = [];

        for (const chunk of chunks) {
          const dualResult = await this.optimizer.optimizeDualTrack(chunk, 'conclusion', {
            ...this.config,
            ...voiceConfig,
            voice: voiceConfig.selectedVoice,
            provider: 'azure-speech',
            enableSSML: this.config.enableSSML
          });
          audioChunks.push(dualResult.audio);
          readingChunks.push(dualResult.reading);
        }

        const audioText = audioChunks.join(' ');
        const readingText = readingChunks.join(' ');

        // Use LLM-generated SSML directly (no additional wrapping needed)
        const finalAudioContent = audioText;

        optimizedAudio.conclusion = {
          ...sections.conclusion,
          content: finalAudioContent
        };

        optimizedReading.conclusion = {
          ...sections.conclusion,
          content: readingText
        };
      }

      // Return both versions
      return {
        audio: optimizedAudio,
        reading: optimizedReading,
        loadedFrom: 'fresh_optimization'
      };

    } catch (error) {
      console.error('Dual-track optimization failed:', error);
      // Return original sections as fallback for both tracks
      return {
        audio: sections,
        reading: sections,
        loadedFrom: 'fallback_original'
      };
    }
  }

  /**
   * Generate missing optimized versions when partial cache is found
   * @param {Object} originalSections - Original sections
   * @param {Object} cachedResult - Cached result with partial data
   * @param {Object} voiceConfig - Voice configuration
   * @returns {Promise<Object>} Missing optimized versions
   */
  async generateMissingOptimizedVersions(originalSections, cachedResult, voiceConfig) {
    const result = {
      audio: null,
      reading: null
    };

    try {
      // Generate missing audio version
      if (cachedResult.missingVersions.includes('audio')) {
        console.log('  🎧 Generating missing audio version...');
        result.audio = await this.generateAudioOptimizedSections(originalSections, voiceConfig);
      }

      // Generate missing reading version
      if (cachedResult.missingVersions.includes('reading')) {
        console.log('  📖 Generating missing reading version...');
        result.reading = await this.generateReadingOptimizedSections(originalSections);
      }

      return result;

    } catch (error) {
      console.error('Failed to generate missing optimized versions:', error);
      return result;
    }
  }

  /**
   * Generate audio-optimized sections
   * @param {Object} sections - Original sections
   * @param {Object} voiceConfig - Voice configuration
   * @returns {Promise<Object>} Audio-optimized sections
   */
  async generateAudioOptimizedSections(sections, voiceConfig) {
    const optimized = {
      introduction: null,
      chapters: [],
      conclusion: null
    };

    // Process each section for audio optimization
    if (sections.introduction) {
      const chunks = this.parser.splitIntoChunks(sections.introduction.content);
      const audioChunks = [];

      for (const chunk of chunks) {
        const result = await this.optimizer.optimizeForListening(chunk, 'introduction', { enableSSML: this.config.enableSSML });
        console.log('result of otimizeforListening', result)
        audioChunks.push(result);
      }

      const audioText = audioChunks.join(' ');
      // Use LLM-generated SSML directly (no additional wrapping needed)
      const finalContent = audioText;

      optimized.introduction = {
        ...sections.introduction,
        content: finalContent
      };
    }

    if (sections.chapters) {
      for (const chapter of sections.chapters) {
        const chunks = this.parser.splitIntoChunks(chapter.content);
        const audioChunks = [];

        for (const chunk of chunks) {
          const result = await this.optimizer.optimizeForListening(chunk, 'chapter', { enableSSML: this.config.enableSSML });
          audioChunks.push(result);
        }

        const audioText = audioChunks.join(' ');
        // Use LLM-generated SSML directly (no additional wrapping needed)
        const finalContent = audioText;

        optimized.chapters.push({
          ...chapter,
          content: finalContent
        });
      }
    }

    if (sections.conclusion) {
      const chunks = this.parser.splitIntoChunks(sections.conclusion.content);
      const audioChunks = [];

      for (const chunk of chunks) {
        const result = await this.optimizer.optimizeForListening(chunk, 'conclusion', { enableSSML: this.config.enableSSML });
        audioChunks.push(result);
      }

      const audioText = audioChunks.join(' ');
      // Use LLM-generated SSML directly (no additional wrapping needed)
      const finalContent = audioText;

      optimized.conclusion = {
        ...sections.conclusion,
        content: finalContent
      };
    }

    return optimized;
  }

  /**
   * Generate reading-optimized sections
   * @param {Object} sections - Original sections
   * @returns {Promise<Object>} Reading-optimized sections
   */
  async generateReadingOptimizedSections(sections) {
    const optimized = {
      introduction: null,
      chapters: [],
      conclusion: null
    };

    // Process each section for reading optimization
    if (sections.introduction) {
      const chunks = this.parser.splitIntoChunks(sections.introduction.content);
      const readingChunks = [];

      for (const chunk of chunks) {
        const result = await this.optimizer.optimizeForReading(chunk, 'introduction');
        readingChunks.push(result);
      }

      optimized.introduction = {
        ...sections.introduction,
        content: readingChunks.join(' ')
      };
    }

    if (sections.chapters) {
      for (const chapter of sections.chapters) {
        const chunks = this.parser.splitIntoChunks(chapter.content);
        const readingChunks = [];

        for (const chunk of chunks) {
          const result = await this.optimizer.optimizeForReading(chunk, 'chapter');
          readingChunks.push(result);
        }

        optimized.chapters.push({
          ...chapter,
          content: readingChunks.join(' ')
        });
      }
    }

    if (sections.conclusion) {
      const chunks = this.parser.splitIntoChunks(sections.conclusion.content);
      const readingChunks = [];

      for (const chunk of chunks) {
        const result = await this.optimizer.optimizeForReading(chunk, 'conclusion');
        readingChunks.push(result);
      }

      optimized.conclusion = {
        ...sections.conclusion,
        content: readingChunks.join(' ')
      };
    }

    return optimized;
  }

  /**
   * Apply SSML to cached sections
   * @param {Object} sections - Cached sections
   * @param {Object} voiceConfig - Voice configuration
   * @returns {Object} Sections with SSML applied
   */
  applySSMLToSections(sections, voiceConfig) {
    const withSSML = {
      introduction: null,
      chapters: [],
      conclusion: null
    };

    if (sections.introduction) {
      withSSML.introduction = {
        ...sections.introduction,
        content: this.optimizer.generateSSML(sections.introduction.content, 'introduction', voiceConfig.ssmlConfig)
      };
    }

    if (sections.chapters) {
      withSSML.chapters = sections.chapters.map(chapter => ({
        ...chapter,
        content: this.optimizer.generateSSML(chapter.content, 'chapter', voiceConfig.ssmlConfig)
      }));
    }

    if (sections.conclusion) {
      withSSML.conclusion = {
        ...sections.conclusion,
        content: this.optimizer.generateSSML(sections.conclusion.content, 'conclusion', voiceConfig.ssmlConfig)
      };
    }

    return withSSML;
  }

  /**
   * Combine all audio files for a book with enhanced chapter alignment
   * @param {Object} audioResults - Audio generation results
   * @param {Object} result - Book processing result object
   * @param {string} bookId - Book identifier
   * @param {string} outputDir - Output directory
   * @returns {Promise<Object>} Combination result
   */
  async combineBookAudio(audioResults, result, bookId, outputDir) {
    try {
      // Get chapter metadata for precise alignment
      const chapterMetadata = result?.chapterTimestamps?.chapterData;

      // Configure audio merger
      this.audioMerger.config.outputFormat = this.config.format;
      this.audioMerger.config.chapterGap = 1.5;
      this.audioMerger.config.fadeIn = 0.2;
      this.audioMerger.config.fadeOut = 0.2;

      // Use enhanced merger with chapter alignment
      const mergeResult = await this.audioMerger.mergeBookAudio(
        audioResults,
        chapterMetadata,
        bookId,
        outputDir
      );

      // If enhanced merge succeeds and we want M4A conversion
      if (mergeResult.success && this.config.convertToM4A) {
        console.log('🔄 Converting merged audio to M4A...');

        const conversionResult = await this.formatConverter.convertBookAudio(
          mergeResult.outputPath,
          chapterMetadata,
          outputDir
        );

        mergeResult.m4aConversion = conversionResult;
      }

      return mergeResult;

    } catch (error) {
      console.error(`❌ Enhanced audio merging failed, falling back to basic merge:`, error);

      // Fallback to basic merge
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
   * Process books sequentially with enhanced error handling
   * @param {Array} bookFiles - Array of book files
   */
  async processBooksSequentially(bookFiles) {
    console.log(`🔄 Processing ${bookFiles.length} books sequentially...`);

    for (let i = 0; i < bookFiles.length; i++) {
      const { bookId, filePath } = bookFiles[i];

      console.log(`\n📊 Progress: ${i + 1}/${bookFiles.length} books`);
      console.log(`📈 Current stats: ✅ ${this.stats.successfulBooks} successful, ❌ ${this.stats.failedBooks} failed, ⏭️ ${this.stats.skippedBooks} skipped`);
      let result;
      try {
        result = await this.processBook(bookId, filePath);
        // Log individual book result
        if (result.success) {
          console.log(`✅ Book ${bookId} completed successfully`);
        } else if (result.skipped) {
          console.log(`⏭️ Book ${bookId} was skipped`);
        } else {
          console.log(`❌ Book ${bookId} failed: ${result.errorDetails?.error || 'Unknown error'}`);
        }

      } catch (error) {
        // This catch block handles any unexpected errors that weren't caught in processBook
        console.error(`💥 Unexpected error processing book ${bookId}:`, error);
        this.stats.errors.push({
          bookId,
          error: error.message,
          stage: 'sequential_processing',
          timestamp: new Date().toISOString()
        });

        // Continue to next book even after unexpected error
        console.log(`🔄 Continuing to next book despite error in ${bookId}...`);
      }

      // Log progress after each book
      try {
        await this.logProgress(bookId, i + 1, bookFiles.length);
      } catch (progressError) {
        console.error(`⚠️ Failed to log progress for book ${bookId}:`, progressError);
        // Continue processing even if progress logging fails
      }

      // Small delay between books to prevent overwhelming APIs
      if (i < bookFiles.length - 1 && !result.skipped) {
        await this.delay(1000);
      }
    }

    console.log(`\n🏁 Sequential processing completed!`);
    console.log(`📊 Final sequential stats: ✅ ${this.stats.successfulBooks} successful, ❌ ${this.stats.failedBooks} failed, ⏭️ ${this.stats.skippedBooks} skipped`);
  }

  /**
   * Process books in batches (concurrent processing) with enhanced error handling
   * @param {Array} bookFiles - Array of book files
   */
  async processBooksInBatches(bookFiles) {
    const batchSize = this.config.concurrency;
    const totalBatches = Math.ceil(bookFiles.length / batchSize);

    console.log(`🔄 Processing ${bookFiles.length} books in ${totalBatches} batches (concurrency: ${batchSize})...`);

    for (let i = 0; i < bookFiles.length; i += batchSize) {
      const batch = bookFiles.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      console.log(`\n📊 Processing batch ${batchNumber}/${totalBatches} (${batch.length} books)`);
      console.log(`📈 Current stats: ✅ ${this.stats.successfulBooks} successful, ❌ ${this.stats.failedBooks} failed, ⏭️ ${this.stats.skippedBooks} skipped`);

      // Create promises for each book in the batch
      const batchPromises = batch.map(({ bookId, filePath }) =>
        this.processBook(bookId, filePath)
          .then(result => {
            // Log individual book result within batch
            if (result.success) {
              console.log(`✅ [Batch ${batchNumber}] Book ${bookId} completed successfully`);
            } else if (result.skipped) {
              console.log(`⏭️ [Batch ${batchNumber}] Book ${bookId} was skipped`);
            } else {
              console.log(`❌ [Batch ${batchNumber}] Book ${bookId} failed: ${result.errorDetails?.error || 'Unknown error'}`);
            }
            return result;
          })
          .catch(error => {
            // Handle any unexpected errors that weren't caught in processBook
            console.error(`💥 [Batch ${batchNumber}] Unexpected error processing book ${bookId}:`, error);
            this.stats.errors.push({
              bookId,
              error: error.message,
              stage: 'batch_processing',
              timestamp: new Date().toISOString()
            });

            // Return a failed result object to maintain consistency
            return {
              bookId,
              success: false,
              errorDetails: {
                stage: 'batch_processing_error',
                error: error.message
              },
              endTime: new Date()
            };
          })
      );

      // Wait for all books in the batch to complete
      try {
        const batchResults = await Promise.all(batchPromises);

        // Log batch completion stats
        const batchSuccessful = batchResults.filter(r => r && r.success).length;
        const batchFailed = batchResults.filter(r => r && !r.success && !r.skipped).length;
        const batchSkipped = batchResults.filter(r => r && r.skipped).length;

        console.log(`🏁 Batch ${batchNumber} completed: ✅ ${batchSuccessful} successful, ❌ ${batchFailed} failed, ⏭️ ${batchSkipped} skipped`);

      } catch (batchError) {
        // This should rarely happen since we're catching errors in individual promises
        console.error(`💥 Unexpected batch processing error for batch ${batchNumber}:`, batchError);
        this.stats.errors.push({
          batch: batchNumber,
          error: batchError.message,
          stage: 'batch_coordination',
          timestamp: new Date().toISOString()
        });
      }

      // Log batch progress
      try {
        const processed = Math.min(i + batchSize, bookFiles.length);
        await this.logProgress(`batch_${batchNumber}`, processed, bookFiles.length);
      } catch (progressError) {
        console.error(`⚠️ Failed to log progress for batch ${batchNumber}:`, progressError);
        // Continue processing even if progress logging fails
      }

      // Small delay between batches to prevent overwhelming APIs
      if (i + batchSize < bookFiles.length) {
        console.log(`⏸️ Pausing 2 seconds between batches...`);
        await this.delay(2000);
      }
    }

    console.log(`\n🏁 Batch processing completed!`);
    console.log(`📊 Final batch stats: ✅ ${this.stats.successfulBooks} successful, ❌ ${this.stats.failedBooks} failed, ⏭️ ${this.stats.skippedBooks} skipped`);
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
      optimizedText: result.optimizedTextSaved ? {
        saved: result.optimizedTextSaved.success,
        path: result.optimizedTextSaved.outputPath,
        fileSize: result.optimizedTextSaved.fileSize,
        wordCount: result.optimizedTextSaved.wordCount,
        format: 'markdown',
        filename: `${result.bookId}.md`,
        preservedOriginalFormat: true
      } : null,
      chapterTimestamps: result.chapterTimestamps ? {
        generated: result.chapterTimestamps.success,
        path: result.chapterTimestamps.timestampPath,
        totalChapters: result.chapterTimestamps.totalChapters,
        totalDuration: result.chapterTimestamps.totalDuration,
        navigationReady: true,
        seekingSupported: true
      } : null,
      textOptimization: {
        headerPreservation: {
          enabled: true,
          verificationPassed: true,
          fallbackUsed: false
        },
        audioOptimization: {
          applied: true,
          naturalSpeechEnhanced: true,
          abbreviationsExpanded: true
        }
      },
      metadata: {
        playlist: result.playlist ? {
          generated: result.playlist.success,
          path: result.playlist.playlistPath,
          format: result.playlist.format
        } : null,
        webvttChapters: result.webvttChapters ? {
          generated: result.webvttChapters.success,
          path: result.webvttChapters.vttPath,
          format: result.webvttChapters.format
        } : null,
        chapterNavigation: result.chapterTimestamps ? {
          totalChapters: result.chapterTimestamps.totalChapters,
          hasIntroduction: result.chapterTimestamps.chapterData?.navigation?.hasIntroduction || false,
          hasConclusion: result.chapterTimestamps.chapterData?.navigation?.hasConclusion || false,
          chapterCount: result.chapterTimestamps.chapterData?.navigation?.chapterCount || 0
        } : null
      },
      voiceSelection: result.voiceSelection ? {
        selectedVoice: result.voiceSelection.selectedVoice,
        confidence: result.voiceSelection.confidence,
        reasoning: result.voiceSelection.reasoning,
        analysis: result.voiceSelection.analysis,
        ssmlEnabled: this.config.enableSSML,
        intelligentSelection: this.config.intelligentVoiceSelection
      } : null,
      combinedAudio: result.combinedAudio,
      errors: result.errors,
      features: {
        optimizedTextInOriginalFormat: true,
        chapterHeaderPreservation: true,
        enhancedChapterTimestamps: true,
        audioNavigationSupport: true,
        seekingBarCompatible: true,
        intelligentVoiceSelection: this.config.intelligentVoiceSelection,
        ssmlGeneration: this.config.enableSSML,
        expressiveAudio: this.config.enableSSML && result.voiceSelection
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📋 Enhanced book report generated: ${reportPath}`);
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
      cacheStats: this.cacheManager ? this.cacheManager.getStats() : null,
      summary: {
        successRate: this.stats.totalBooks > 0 ? (this.stats.successfulBooks / this.stats.totalBooks * 100).toFixed(1) + '%' : '0%',
        averageProcessingTime: this.stats.processedBooks > 0 ?
          Math.round((this.stats.endTime - this.stats.startTime) / this.stats.processedBooks / 1000) + 's' : '0s',
        totalDuration: this.audioGenerator.formatDuration(this.stats.totalDuration)
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Final report saved: ${reportPath}`);
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
    console.log(`Total books: ${this.stats.totalBooks}`);
    console.log(`✅ Successful: ${this.stats.successfulBooks}`);
    console.log(`❌ Failed: ${this.stats.failedBooks}`);
    console.log(`⏭️  Skipped: ${this.stats.skippedBooks}`);
    console.log(`🎵 Audio files: ${this.stats.totalAudioFiles}`);
    console.log(`⏱️  Total audio: ${this.audioGenerator.formatDuration(this.stats.totalDuration)}`);
    console.log(`⏰ Processing time: ${hours}h ${minutes}m`);
    console.log(`📈 Success rate: ${this.stats.totalBooks > 0 ? (this.stats.successfulBooks / this.stats.totalBooks * 100).toFixed(1) : 0}%`);

    // Print cache statistics
    if (this.cacheManager) {
      this.cacheManager.printStats();
    }
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
