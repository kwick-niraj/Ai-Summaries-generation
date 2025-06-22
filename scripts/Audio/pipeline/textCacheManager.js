import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: 'text',
  preserveOrder: true
});


/**
 * Text Cache Manager for optimized text caching
 * Handles cache validation, retrieval, and management
 */
export class TextCacheManager {
  constructor(config = {}) {
    this.config = {
      useOptimizedTextCache: config.useOptimizedTextCache ?? true,
      cacheValidityDays: config.cacheValidityDays ?? 30,
      forceReoptimization: config.forceReoptimization ?? false,
      cacheStrategy: config.cacheStrategy ?? 'smart',
      verboseLogging: config.verboseLogging ?? true,
      ...config
    };

    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      cacheInvalidations: 0,
      totalChecks: 0,
      timeSaved: 0 // Estimated time saved in milliseconds
    };
  }

  /**
   * Check if cached optimized text exists and is valid
   * @param {string} bookId - Book identifier
   * @param {string} outputDir - Output directory for the book
   * @param {string} sourceFilePath - Path to original source file
   * @returns {Promise<Object>} Cache check result
   */
  async checkCache(bookId, outputDir, sourceFilePath = null) {
    this.stats.totalChecks++;

    try {
      // If caching is disabled or force reoptimization is enabled
      if (!this.config.useOptimizedTextCache || this.config.forceReoptimization) {
        if (this.config.verboseLogging) {
          console.log(`💾 Cache disabled or force reoptimization enabled for ${bookId}`);
        }
        this.stats.cacheMisses++;
        return {
          valid: false,
          reason: this.config.forceReoptimization ? 'force_reoptimization' : 'cache_disabled',
          cacheFiles: null
        };
      }

      // Apply cache strategy
      const strategyResult = await this.applyCacheStrategy(bookId, outputDir, sourceFilePath);
      
      if (strategyResult.valid) {
        this.stats.cacheHits++;
        // Estimate time saved (typical optimization takes 30-60 seconds per book)
        this.stats.timeSaved += 45000; // 45 seconds average
        
        if (this.config.verboseLogging) {
          console.log(`✅ Cache HIT for ${bookId} - using cached optimized text`);
        }
      } else {
        this.stats.cacheMisses++;
        
        if (this.config.verboseLogging) {
          console.log(`❌ Cache MISS for ${bookId} - ${strategyResult.reason}`);
        }
      }

      return strategyResult;

    } catch (error) {
      console.error(`❌ Cache check failed for ${bookId}:`, error);
      this.stats.cacheMisses++;
      return {
        valid: false,
        reason: 'cache_check_error',
        error: error.message,
        cacheFiles: null
      };
    }
  }

  /**
   * Apply the configured cache strategy
   * @param {string} bookId - Book identifier
   * @param {string} outputDir - Output directory
   * @param {string} sourceFilePath - Source file path
   * @returns {Promise<Object>} Strategy result
   */
  async applyCacheStrategy(bookId, outputDir, sourceFilePath) {
    const optimizedDir = path.join(outputDir, 'optimized_text');
    const cacheFiles = this.getCacheFilePaths(bookId, optimizedDir);

    switch (this.config.cacheStrategy) {
      case 'always':
        return this.alwaysStrategy(cacheFiles);
      
      case 'smart':
        return this.smartStrategy(cacheFiles, sourceFilePath);
      
      case 'never':
        return {
          valid: false,
          reason: 'cache_strategy_never',
          cacheFiles: null
        };
      
      default:
        console.warn(`Unknown cache strategy: ${this.config.cacheStrategy}, falling back to 'smart'`);
        return this.smartStrategy(cacheFiles, sourceFilePath);
    }
  }

  /**
   * Always use cache if files exist (fastest strategy)
   * @param {Object} cacheFiles - Cache file paths
   * @returns {Promise<Object>} Strategy result
   */
  async alwaysStrategy(cacheFiles) {
    // Check if at least one cache file exists
    const existingFiles = [];
    
    if (fs.existsSync(cacheFiles.reading)) {
      existingFiles.push('reading');
    }
    
    if (fs.existsSync(cacheFiles.audio)) {
      existingFiles.push('audio');
    }

    if (existingFiles.length > 0) {
      // Basic validation - check if files are not empty
      const validFiles = [];
      
      for (const fileType of existingFiles) {
        const filePath = cacheFiles[fileType];
        try {
          const stats = fs.statSync(filePath);
          if (stats.size > 100) { // Minimum 100 bytes
            validFiles.push(fileType);
          }
        } catch (error) {
          console.warn(`Cache file validation failed for ${filePath}:`, error);
        }
      }

      if (validFiles.length > 0) {
        return {
          valid: true,
          reason: 'always_strategy_valid',
          cacheFiles,
          availableFiles: validFiles,
          strategy: 'always'
        };
      }
    }

    return {
      valid: false,
      reason: 'always_strategy_no_valid_files',
      cacheFiles
    };
  }

  /**
   * Smart strategy - check validity, age, and source file modification
   * @param {Object} cacheFiles - Cache file paths
   * @param {string} sourceFilePath - Source file path
   * @returns {Promise<Object>} Strategy result
   */
  async smartStrategy(cacheFiles, sourceFilePath) {
    const validation = await this.validateCacheFiles(cacheFiles);
    
    if (!validation.valid) {
      return {
        valid: false,
        reason: validation.reason,
        cacheFiles,
        validation
      };
    }

    // Check cache age
    const ageCheck = this.checkCacheAge(validation.availableFiles, cacheFiles);
    if (!ageCheck.valid) {
      return {
        valid: false,
        reason: ageCheck.reason,
        cacheFiles,
        ageCheck
      };
    }

    // Check if source file is newer than cache (if source file provided)
    if (sourceFilePath && fs.existsSync(sourceFilePath)) {
      const freshnessCheck = this.checkCacheFreshness(validation.availableFiles, cacheFiles, sourceFilePath);
      if (!freshnessCheck.valid) {
        return {
          valid: false,
          reason: freshnessCheck.reason,
          cacheFiles,
          freshnessCheck
        };
      }
    }

    return {
      valid: true,
      reason: 'smart_strategy_valid',
      cacheFiles,
      availableFiles: validation.availableFiles,
      strategy: 'smart',
      validation,
      ageCheck
    };
  }

  /**
   * Get cache file paths for a book
   * @param {string} bookId - Book identifier
   * @param {string} optimizedDir - Optimized text directory
   * @returns {Object} Cache file paths
   */
  getCacheFilePaths(bookId, optimizedDir) {
    return {
      reading: path.join(optimizedDir, `${bookId}.md`),
      audio: path.join(optimizedDir, `${bookId}_audio.md`)
    };
  }

  

  /**
   * Validate cache files exist and have valid content
   * @param {Object} cacheFiles - Cache file paths
   * @returns {Promise<Object>} Validation result
   */
  async validateCacheFiles(cacheFiles) {
    const availableFiles = [];
    const validationErrors = [];

    // Check reading version
    if (fs.existsSync(cacheFiles.reading)) {
      const readingValidation = await this.validateSingleCacheFile(cacheFiles.reading, 'reading');
      if (readingValidation.valid) {
        availableFiles.push('reading');
      } else {
        validationErrors.push(`Reading: ${readingValidation.reason}`);
      }
    }

    // Check audio version
    if (fs.existsSync(cacheFiles.audio)) {
      const audioValidation = await this.validateSingleCacheFile(cacheFiles.audio, 'audio');
      if (audioValidation.valid) {
        availableFiles.push('audio');
      } else {
        validationErrors.push(`Audio: ${audioValidation.reason}`);
      }
    }

    if (availableFiles.length === 0) {
      return {
        valid: false,
        reason: 'no_valid_cache_files',
        availableFiles: [],
        errors: validationErrors
      };
    }

    return {
      valid: true,
      availableFiles,
      errors: validationErrors
    };
  }

  /**
   * Validate a single cache file
   * @param {string} filePath - File path to validate
   * @param {string} fileType - Type of file (reading/audio)
   * @returns {Promise<Object>} Validation result
   */
  async validateSingleCacheFile(filePath, fileType) {
    try {
      const stats = fs.statSync(filePath);
      
      // Check file size (minimum 100 bytes)
      if (stats.size < 100) {
        return {
          valid: false,
          reason: 'file_too_small',
          size: stats.size
        };
      }

      // Read and validate content
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check for minimum content length
      if (content.trim().length < 50) {
        return {
          valid: false,
          reason: 'content_too_short',
          contentLength: content.trim().length
        };
      }

      // Check for basic structure (should have some text content)
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      if (wordCount < 10) {
        return {
          valid: false,
          reason: 'insufficient_word_count',
          wordCount
        };
      }

      // Additional validation for audio files
      if (fileType === 'audio') {
        // Audio files should have conversational markers or be clearly optimized
        const hasAudioMarkers = content.includes('Audio Script') || 
                               content.includes('audio-optimized') ||
                               content.includes('conversational');
        
        if (!hasAudioMarkers && content.length < 200) {
          return {
            valid: false,
            reason: 'audio_file_not_optimized',
            hasMarkers: hasAudioMarkers
          };
        }
      }

      return {
        valid: true,
        size: stats.size,
        wordCount,
        lastModified: stats.mtime
      };

    } catch (error) {
      return {
        valid: false,
        reason: 'file_read_error',
        error: error.message
      };
    }
  }

  /**
   * Check if cache files are within the validity period
   * @param {Array} availableFiles - Available file types
   * @param {Object} cacheFiles - Cache file paths
   * @returns {Object} Age check result
   */
  checkCacheAge(availableFiles, cacheFiles) {
    const maxAge = this.config.cacheValidityDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
    const now = new Date().getTime();
    
    for (const fileType of availableFiles) {
      try {
        const stats = fs.statSync(cacheFiles[fileType]);
        const fileAge = now - stats.mtime.getTime();
        
        if (fileAge > maxAge) {
          return {
            valid: false,
            reason: 'cache_expired',
            fileType,
            ageInDays: Math.round(fileAge / (24 * 60 * 60 * 1000)),
            maxAgeInDays: this.config.cacheValidityDays
          };
        }
      } catch (error) {
        return {
          valid: false,
          reason: 'age_check_error',
          fileType,
          error: error.message
        };
      }
    }

    return {
      valid: true,
      reason: 'within_validity_period'
    };
  }

  /**
   * Check if cache is fresher than source file
   * @param {Array} availableFiles - Available file types
   * @param {Object} cacheFiles - Cache file paths
   * @param {string} sourceFilePath - Source file path
   * @returns {Object} Freshness check result
   */
  checkCacheFreshness(availableFiles, cacheFiles, sourceFilePath) {
    try {
      const sourceStats = fs.statSync(sourceFilePath);
      const sourceModTime = sourceStats.mtime.getTime();

      for (const fileType of availableFiles) {
        const cacheStats = fs.statSync(cacheFiles[fileType]);
        const cacheModTime = cacheStats.mtime.getTime();

        // If source file is newer than cache, cache is stale
        if (sourceModTime > cacheModTime) {
          return {
            valid: false,
            reason: 'source_file_newer',
            fileType,
            sourceModified: sourceStats.mtime,
            cacheModified: cacheStats.mtime
          };
        }
      }

      return {
        valid: true,
        reason: 'cache_is_fresh'
      };

    } catch (error) {
      return {
        valid: false,
        reason: 'freshness_check_error',
        error: error.message
      };
    }
  }

  /**
   * Load cached optimized text
   * @param {string} bookId - Book identifier
   * @param {string} outputDir - Output directory
   * @returns {Promise<Object>} Loaded cache result
   */
  async loadCachedText(bookId, outputDir, enableSSML) {
    console.log('Load Cached Text Input:', bookId, outputDir, enableSSML)
    try {
      const optimizedDir = path.join(outputDir, 'optimized_text');
      const ssmlDir = outputDir;
      const cacheFiles = this.getCacheFilePaths(bookId, optimizedDir);
      
      const result = {
        success: true,
        bookId,
        audio: null,
        reading: null,
        loadedFrom: 'cache'
      };

      // Load reading version
      if (fs.existsSync(cacheFiles.reading)) {
        const readingContent = fs.readFileSync(cacheFiles.reading, 'utf-8');
        result.reading = this.parseMarkdownToSections(readingContent, 'reading');
      }

      // Load audio version
      if(enableSSML) {
        const audioContent = fs.readFileSync(ssmlDir + `/${bookId}_ssml.xml`, 'utf-8');
        // console.log('niraj audiocontent', audioContent)
        result.audio = this.parseXmlToSections(audioContent, 'audio')
      }else {
        if (fs.existsSync(cacheFiles.audio)) {
          const audioContent = fs.readFileSync(cacheFiles.audio, 'utf-8');
          result.audio = this.parseMarkdownToSections(audioContent, 'audio');
        }
      }

      // If we don't have both versions, we need to generate the missing one
      if (!result.reading || !result.audio) {
        result.partialCache = true;
        result.missingVersions = [];
        if (!result.reading) result.missingVersions.push('reading');
        if (!result.audio) result.missingVersions.push('audio');
      }

      if (this.config.verboseLogging) {
        console.log(`📖 Loaded cached text for ${bookId}:`, {
          hasReading: !!result.reading,
          hasAudio: !!result.audio,
          partialCache: result.partialCache
        });
      }

      // console.log('niraj parsed result', result)

      return result;

    } catch (error) {
      console.error(`❌ Failed to load cached text for ${bookId}:`, error);
      return {
        success: false,
        error: error.message,
        bookId
      };
    }
  }

  /**
   * Parse markdown content back to sections structure
   * @param {string} content - Markdown content
   * @param {string} type - Type (reading/audio)
   * @returns {Object} Parsed sections
   */
  parseMarkdownToSections(content, type) {
    const sections = {
      introduction: null,
      chapters: [],
      conclusion: null
    };

    try {
      // Split content by headers
      const lines = content.split('\n');
      let currentSection = null;
      let currentContent = [];

      for (const line of lines) {
        // Check for headers
        const headerMatch = line.match(/^#{1,6}\s+(.+)$/);
        
        if (headerMatch) {
          // Save previous section
          if (currentSection && currentContent.length > 0) {
            this.addParsedSection(sections, currentSection, currentContent.join('\n').trim());
          }

          // Start new section
          const title = headerMatch[1].trim();
          currentSection = this.identifySectionType(title);
          currentContent = [];
        } else if (line.trim() && !line.startsWith('*') && !line.startsWith('---')) {
          // Add content line (skip metadata and separators)
          currentContent.push(line);
        }
      }

      // Add final section
      if (currentSection && currentContent.length > 0) {
        this.addParsedSection(sections, currentSection, currentContent.join('\n').trim());
      }

      return sections;

    } catch (error) {
      console.error('Failed to parse markdown content:', error);
      return sections;
    }
  }


/**
 * Parse SSML-based XML content into structured sections
 * @param {string} xmlContent - Raw SSML XML content
 * @returns {{ introduction: object|null, chapters: object[], conclusion: object|null }}
 */
parseXmlToSections(xmlContent) {
  const sections = {
    introduction: null,
    chapters: [],
    conclusion: null
  };

  try {
    const speakBlocks = xmlContent
      .split(/<!--\s*(INTRODUCTION|CHAPTER:.*?)\s*-->/gi)
      .map(str => str.trim())
      .filter(Boolean);

    let currentSection = null;

    for (let i = 0; i < speakBlocks.length; i++) {
      const block = speakBlocks[i];

      if (block.toUpperCase() === 'INTRODUCTION') {
        currentSection = 'introduction';
        continue;
      }

      const chapterMatch = block.match(/^CHAPTER:\s*(.+)$/i);
      if (chapterMatch) {
        currentSection = 'chapter';
        var currentChapterTitle = chapterMatch[1].trim();
        continue;
      }

      if (block.startsWith('<speak')) {
        const rawSSML = block;

        if (currentSection === 'introduction') {
          sections.introduction = {
            title: 'Introduction',
            content: rawSSML
          };
        } else if (currentSection === 'chapter') {
          sections.chapters.push({
            title: currentChapterTitle || `Chapter ${sections.chapters.length + 1}`,
            content: rawSSML
          });
        }
      }
    }

    // Optional: move last chapter to conclusion if its title suggests so
    const lastChapter = sections.chapters.at(-1);
    if (lastChapter && /conclusion/i.test(lastChapter.title)) {
      sections.conclusion = sections.chapters.pop();
    }

    return sections;

  } catch (err) {
    console.error('❌ Failed to parse XML SSML sections:', err);
    return sections;
  }
}

/**
 * Recursively extract visible text from SSML XML AST (fast-xml-parser format)
 */
extractTextFromSSML(nodes) {
  let text = '';

  for (const node of nodes) {
    if (node.text) {
      text += node.text;
    } else if (Array.isArray(node.children)) {
      text += this.extractTextFromSSML(node.children); // ✅ fixed
    } else if (typeof node === 'object') {
      const nested = Object.values(node).find(v => Array.isArray(v));
      if (nested) {
        text += this.extractTextFromSSML(nested); // ✅ fixed
      }
    }
  }

  return text;
}

  /**
   * Identify section type from title
   * @param {string} title - Section title
   * @returns {Object} Section info
   */
  identifySectionType(title) {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('introduction') || lowerTitle.includes('intro')) {
      return { type: 'introduction', title };
    }
    
    if (lowerTitle.includes('conclusion') || lowerTitle.includes('summary')) {
      return { type: 'conclusion', title };
    }
    
    if (lowerTitle.includes('chapter') || lowerTitle.match(/\d+/)) {
      const chapterMatch = title.match(/chapter\s+(\d+)/i) || title.match(/(\d+)/);
      const number = chapterMatch ? parseInt(chapterMatch[1]) : null;
      return { type: 'chapter', title, number };
    }
    
    // Default to chapter
    return { type: 'chapter', title };
  }

  /**
   * Add parsed section to sections object
   * @param {Object} sections - Sections object
   * @param {Object} sectionInfo - Section information
   * @param {string} content - Section content
   */
  addParsedSection(sections, sectionInfo, content) {
    if (sectionInfo.type === 'introduction') {
      sections.introduction = {
        title: sectionInfo.title,
        content
      };
    } else if (sectionInfo.type === 'conclusion') {
      sections.conclusion = {
        title: sectionInfo.title,
        content
      };
    } else if (sectionInfo.type === 'chapter') {
      sections.chapters.push({
        title: sectionInfo.title,
        number: sectionInfo.number,
        content
      });
    }
  }

  /**
   * Invalidate cache for a specific book
   * @param {string} bookId - Book identifier
   * @param {string} outputDir - Output directory
   * @returns {Promise<Object>} Invalidation result
   */
  async invalidateCache(bookId, outputDir) {
    try {
      const optimizedDir = path.join(outputDir, 'optimized_text');
      const cacheFiles = this.getCacheFilePaths(bookId, optimizedDir);
      
      const deletedFiles = [];
      
      // Delete reading version
      if (fs.existsSync(cacheFiles.reading)) {
        fs.unlinkSync(cacheFiles.reading);
        deletedFiles.push('reading');
      }
      
      // Delete audio version
      if (fs.existsSync(cacheFiles.audio)) {
        fs.unlinkSync(cacheFiles.audio);
        deletedFiles.push('audio');
      }

      this.stats.cacheInvalidations++;

      if (this.config.verboseLogging && deletedFiles.length > 0) {
        console.log(`🗑️  Invalidated cache for ${bookId}: ${deletedFiles.join(', ')}`);
      }

      return {
        success: true,
        deletedFiles,
        bookId
      };

    } catch (error) {
      console.error(`❌ Failed to invalidate cache for ${bookId}:`, error);
      return {
        success: false,
        error: error.message,
        bookId
      };
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const totalChecks = this.stats.totalChecks;
    const hitRate = totalChecks > 0 ? (this.stats.cacheHits / totalChecks * 100).toFixed(1) : 0;
    const timeSavedMinutes = Math.round(this.stats.timeSaved / 60000);

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      timeSavedMinutes,
      timeSavedFormatted: this.formatDuration(this.stats.timeSaved)
    };
  }

  /**
   * Format duration in milliseconds to human readable format
   * @param {number} ms - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      cacheInvalidations: 0,
      totalChecks: 0,
      timeSaved: 0
    };
  }

  /**
   * Print cache statistics
   */
  printStats() {
    const stats = this.getStats();
    
    console.log('\n💾 CACHE STATISTICS');
    console.log('==================');
    console.log(`📊 Total Checks: ${stats.totalChecks}`);
    console.log(`✅ Cache Hits: ${stats.cacheHits}`);
    console.log(`❌ Cache Misses: ${stats.cacheMisses}`);
    console.log(`🗑️  Invalidations: ${stats.cacheInvalidations}`);
    console.log(`📈 Hit Rate: ${stats.hitRate}`);
    console.log(`⏰ Time Saved: ${stats.timeSavedFormatted}`);
    
    if (stats.cacheHits > 0) {
      console.log(`💰 Estimated API Calls Saved: ${stats.cacheHits * 10}`); // Rough estimate
    }
  }
}

export default TextCacheManager;
