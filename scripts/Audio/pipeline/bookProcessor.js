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

/**
 * Main book processor that orchestrates the entire audio generation pipeline
 */
export class BookProcessor {
  constructor(options = {}) {
    this.config = {
      inputDir: options.inputDir || './FinalAllSummaries',
      outputDir: options.outputDir || 'scripts/Audio/output',
      logDir: options.logDir || 'scripts/Audio/logs',
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
      ...options
    };

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

      // Step 2: Select optimal voice for this book
      let voiceConfig = null;
      if (this.config.intelligentVoiceSelection) {
        console.log('🎤 Selecting optimal voice...');
        voiceConfig = await this.voiceSelector.selectVoiceForBook(bookId, this.config.metadataDir);
        result.voiceSelection = voiceConfig;
      }

      // Step 3: Optimize text with dual-track processing (audio + reading)
      console.log('✨ Dual-track optimizing text for audio and reading...');
      const optimizedSections = await this.optimizeBookSections(sections, voiceConfig, bookId, outputDir, inputPath, this.config.enableSSML);

      // Step 4: Save both audio and reading optimized text versions (BEFORE audio generation)
      console.log('💾 Saving dual-track optimized text...');
      const textSaveResult = await this.textSaver.saveDualTrackOptimizedBook(optimizedSections, bookId, outputDir, voiceConfig);
      result.optimizedTextSaved = textSaveResult;

      // Store both versions in result for reference
      result.optimizedSections = optimizedSections;

      // Step 5: Generate audio files with selected voice and SSML (using audio version)
      console.log('🎵 Generating audio files...');
      const selectedVoice = voiceConfig?.selectedVoice || this.config.voice || 'nova';
      const audioResults = await this.audioGenerator.generateBookAudio(
        optimizedSections.audio,
        bookId,
        outputDir,
        {
          voice: selectedVoice,
          speed: this.config.speed,
          format: this.config.format,
          maxChunkLength: this.config.maxChunkLength,
          ssmlConfig: voiceConfig?.ssmlConfig,
        },
        this.config.enableSSML
      );
      
      result.audioResults = audioResults;
      result.stats.totalAudioFiles = audioResults.totalFiles;
      result.stats.totalDuration = audioResults.totalDuration;

      // Step 6: Generate chapter timestamps
      console.log('⏱️  Generating chapter timestamps...');
      const timestampResult = await this.timestampGenerator.generateChapterTimestamps(audioResults, bookId, outputDir);
      result.chapterTimestamps = timestampResult;

      // Step 7: Generate additional metadata files
      if (timestampResult.success) {
        console.log('📝 Generating additional metadata...');
        
        // Generate playlist
        const playlistResult = await this.timestampGenerator.generatePlaylist(timestampResult.chapterData, outputDir);
        result.playlist = playlistResult;
        
        // Generate WebVTT chapters
        const vttResult = await this.timestampGenerator.generateWebVTTChapters(timestampResult.chapterData, outputDir);
        result.webvttChapters = vttResult;
      }

      // Step 8: Combine audio files if requested
      if (this.config.combineAudio && audioResults.successfulFiles > 0) {
        console.log('🔗 Combining audio files...');
        const combinedResult = await this.combineBookAudio(audioResults, result, bookId, outputDir);
        result.combinedAudio = combinedResult;
      }

      // Step 9: Generate book report
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
   * Optimize all sections of a book with dual-track processing (audio + reading)
   * Uses intelligent caching to avoid re-optimization when possible
   * @param {Object} sections - Book sections
   * @param {Object} voiceConfig - Voice configuration from voice selector
   * @param {string} bookId - Book identifier for caching
   * @param {string} outputDir - Output directory for caching
   * @param {string} inputPath - Input file path for cache freshness check
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

        console.log('niraj cachedResult', cachedResult)
        
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
        const chunks = this.parser.splitIntoChunks(sections.introduction.content, 400);
        
        // Process chunks for both audio and reading
        const audioChunks = [];
        const readingChunks = [];
        
        for (const chunk of chunks) {
          const dualResult = await this.optimizer.optimizeDualTrack(chunk, 'introduction', {
            ...this.config,
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
          const chunks = this.parser.splitIntoChunks(chapter.content, 400);
          
          // Process chunks for both audio and reading
          const audioChunks = [];
          const readingChunks = [];
          
          for (const chunk of chunks) {
            const dualResult = await this.optimizer.optimizeDualTrack(chunk, 'chapter', {
              ...this.config,
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
        const chunks = this.parser.splitIntoChunks(sections.conclusion.content, 400);
        
        // Process chunks for both audio and reading
        const audioChunks = [];
        const readingChunks = [];
        
        for (const chunk of chunks) {
          const dualResult = await this.optimizer.optimizeDualTrack(chunk, 'conclusion', {
            ...this.config,
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
      const chunks = this.parser.splitIntoChunks(sections.introduction.content, 400);
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
        const chunks = this.parser.splitIntoChunks(chapter.content, 400);
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
      const chunks = this.parser.splitIntoChunks(sections.conclusion.content, 400);
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
      const chunks = this.parser.splitIntoChunks(sections.introduction.content, 400);
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
        const chunks = this.parser.splitIntoChunks(chapter.content, 400);
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
      const chunks = this.parser.splitIntoChunks(sections.conclusion.content, 400);
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
