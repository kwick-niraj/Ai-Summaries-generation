import fs from 'fs';
import path from 'path';

/**
 * Generates chapter timestamps and metadata for audio navigation
 * Creates seeking information for audio players
 */
export class ChapterTimestampGenerator {
  constructor() {
    this.metadataSubDir = 'metadata';
  }

  /**
   * Generate chapter timestamps from audio results
   * @param {Object} audioResults - Audio generation results
   * @param {string} bookId - Book identifier
   * @param {string} outputDir - Base output directory
   * @returns {Promise<Object>} Timestamp generation result
   */
  async generateChapterTimestamps(audioResults, bookId, outputDir) {
    try {
      console.log(`⏱️  Generating chapter timestamps for book ${bookId}...`);
      
      // Create metadata directory
      const metadataDir = path.join(outputDir, this.metadataSubDir);
      if (!fs.existsSync(metadataDir)) {
        fs.mkdirSync(metadataDir, { recursive: true });
      }

      // Build chapter metadata
      const chapterData = await this.buildChapterMetadata(audioResults, bookId);
      
      // Save chapter timestamps
      const timestampPath = path.join(metadataDir, `${bookId}_chapters.json`);
      fs.writeFileSync(timestampPath, JSON.stringify(chapterData, null, 2));
      
      console.log(`✅ Chapter timestamps saved: ${timestampPath}`);
      console.log(`📊 Generated ${chapterData.chapters.length} chapter markers`);
      
      return {
        success: true,
        timestampPath,
        chapterData,
        totalChapters: chapterData.chapters.length,
        totalDuration: chapterData.totalDuration
      };
      
    } catch (error) {
      console.error(`❌ Failed to generate chapter timestamps for ${bookId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build comprehensive chapter metadata
   * @param {Object} audioResults - Audio generation results
   * @param {string} bookId - Book identifier
   * @returns {Promise<Object>} Chapter metadata
   */
  async buildChapterMetadata(audioResults, bookId) {
    const metadata = {
      bookId,
      version: '1.0',
      generatedAt: new Date().toISOString(),
      totalDuration: audioResults.totalDuration || 0,
      totalChapters: 0,
      chapters: [],
      audioFiles: {
        individual: [],
        combined: null
      },
      navigation: {
        hasIntroduction: false,
        hasConclusion: false,
        chapterCount: 0
      }
    };

    let currentTime = 0;

    // Process introduction
    if (audioResults.sections.introduction) {
      const introChapter = await this.processSection(
        audioResults.sections.introduction,
        'introduction',
        'Introduction',
        currentTime,
        bookId
      );
      
      if (introChapter) {
        metadata.chapters.push(introChapter);
        currentTime = introChapter.endTime;
        metadata.navigation.hasIntroduction = true;
      }
    }

    // Process chapters
    if (audioResults.sections.chapters && audioResults.sections.chapters.length > 0) {
      for (const chapterResult of audioResults.sections.chapters) {
        const chapterData = await this.processSection(
          chapterResult,
          'chapter',
          chapterResult.title || `Chapter ${metadata.navigation.chapterCount + 1}`,
          currentTime,
          bookId
        );
        
        if (chapterData) {
          metadata.chapters.push(chapterData);
          currentTime = chapterData.endTime;
          metadata.navigation.chapterCount++;
        }
      }
    }

    // Process conclusion
    if (audioResults.sections.conclusion) {
      const conclusionChapter = await this.processSection(
        audioResults.sections.conclusion,
        'conclusion',
        'Conclusion',
        currentTime,
        bookId
      );
      
      if (conclusionChapter) {
        metadata.chapters.push(conclusionChapter);
        currentTime = conclusionChapter.endTime;
        metadata.navigation.hasConclusion = true;
      }
    }

    // Update totals
    metadata.totalChapters = metadata.chapters.length;
    metadata.totalDuration = currentTime;

    // Add audio file information
    metadata.audioFiles.individual = this.extractAudioFileList(audioResults);
    
    return metadata;
  }

  /**
   * Process a single section to create chapter metadata
   * @param {Object} sectionResult - Section audio result
   * @param {string} sectionType - Type of section
   * @param {string} title - Section title
   * @param {number} startTime - Start time in seconds
   * @param {string} bookId - Book identifier
   * @returns {Promise<Object>} Chapter metadata
   */
  async processSection(sectionResult, sectionType, title, startTime, bookId) {
    if (!sectionResult || !sectionResult.files || sectionResult.files.length === 0) {
      return null;
    }

    // Calculate section duration from successful files
    const successfulFiles = sectionResult.files.filter(f => f.success);
    const sectionDuration = successfulFiles.reduce((total, file) => total + (file.duration || 0), 0);
    
    if (sectionDuration === 0) {
      console.warn(`⚠️  Section ${title} has no duration data`);
    }

    const chapterMetadata = {
      id: this.generateChapterId(sectionType, title),
      type: sectionType,
      title: title,
      startTime: Math.round(startTime * 100) / 100, // Round to 2 decimal places
      endTime: Math.round((startTime + sectionDuration) * 100) / 100,
      duration: Math.round(sectionDuration * 100) / 100,
      audioFiles: successfulFiles.map(file => ({
        filename: path.basename(file.outputPath),
        path: file.outputPath,
        duration: file.duration || 0,
        fileSize: file.fileSize || 0
      })),
      metadata: {
        wordCount: this.estimateWordCount(sectionDuration),
        fileCount: successfulFiles.length,
        hasMultipleParts: successfulFiles.length > 1,
        averageWordsPerMinute: this.calculateWPM(sectionDuration)
      }
    };

    return chapterMetadata;
  }

  /**
   * Generate a unique chapter ID
   * @param {string} sectionType - Section type
   * @param {string} title - Section title
   * @returns {string} Chapter ID
   */
  generateChapterId(sectionType, title) {
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
    
    return `${sectionType}_${cleanTitle}`;
  }

  /**
   * Extract list of all audio files from results
   * @param {Object} audioResults - Audio generation results
   * @returns {Array} List of audio files
   */
  extractAudioFileList(audioResults) {
    const audioFiles = [];

    // Helper function to add files from a section
    const addSectionFiles = (section, sectionType) => {
      if (section && section.files) {
        section.files
          .filter(f => f.success)
          .forEach(file => {
            audioFiles.push({
              section: sectionType,
              filename: path.basename(file.outputPath),
              path: file.outputPath,
              duration: file.duration || 0,
              fileSize: file.fileSize || 0
            });
          });
      }
    };

    // Add files from all sections
    addSectionFiles(audioResults.sections.introduction, 'introduction');
    
    if (audioResults.sections.chapters) {
      audioResults.sections.chapters.forEach((chapter, index) => {
        addSectionFiles(chapter, `chapter_${index + 1}`);
      });
    }
    
    addSectionFiles(audioResults.sections.conclusion, 'conclusion');

    return audioFiles;
  }

  /**
   * Estimate word count based on audio duration
   * @param {number} duration - Duration in seconds
   * @returns {number} Estimated word count
   */
  estimateWordCount(duration) {
    // Average speaking rate is about 150-160 words per minute
    const wordsPerMinute = 155;
    const minutes = duration / 60;
    return Math.round(minutes * wordsPerMinute);
  }

  /**
   * Calculate words per minute based on duration
   * @param {number} duration - Duration in seconds
   * @returns {number} Words per minute
   */
  calculateWPM(duration) {
    if (duration === 0) return 0;
    const estimatedWords = this.estimateWordCount(duration);
    const minutes = duration / 60;
    return Math.round(estimatedWords / minutes);
  }

  /**
   * Generate a playlist file (M3U format) for the audio files
   * @param {Object} chapterData - Chapter metadata
   * @param {string} outputDir - Output directory
   * @returns {Promise<Object>} Playlist generation result
   */
  async generatePlaylist(chapterData, outputDir) {
    try {
      const playlistPath = path.join(outputDir, this.metadataSubDir, `${chapterData.bookId}_playlist.m3u`);
      
      let playlistContent = `#EXTM3U\n`;
      playlistContent += `#PLAYLIST:${chapterData.bookId}\n\n`;

      chapterData.chapters.forEach(chapter => {
        chapter.audioFiles.forEach(audioFile => {
          const durationSeconds = Math.round(audioFile.duration);
          playlistContent += `#EXTINF:${durationSeconds},${chapter.title}\n`;
          playlistContent += `${audioFile.filename}\n`;
        });
      });

      fs.writeFileSync(playlistPath, playlistContent);
      
      console.log(`🎵 Playlist generated: ${playlistPath}`);
      
      return {
        success: true,
        playlistPath,
        format: 'M3U'
      };
      
    } catch (error) {
      console.error('❌ Failed to generate playlist:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate WebVTT chapters file for web players
   * @param {Object} chapterData - Chapter metadata
   * @param {string} outputDir - Output directory
   * @returns {Promise<Object>} WebVTT generation result
   */
  async generateWebVTTChapters(chapterData, outputDir) {
    try {
      const vttPath = path.join(outputDir, this.metadataSubDir, `${chapterData.bookId}_chapters.vtt`);
      
      let vttContent = `WEBVTT\n\n`;
      
      chapterData.chapters.forEach((chapter, index) => {
        const startTime = this.formatTimeForVTT(chapter.startTime);
        const endTime = this.formatTimeForVTT(chapter.endTime);
        
        vttContent += `${index + 1}\n`;
        vttContent += `${startTime} --> ${endTime}\n`;
        vttContent += `${chapter.title}\n\n`;
      });

      fs.writeFileSync(vttPath, vttContent);
      
      console.log(`📝 WebVTT chapters generated: ${vttPath}`);
      
      return {
        success: true,
        vttPath,
        format: 'WebVTT'
      };
      
    } catch (error) {
      console.error('❌ Failed to generate WebVTT chapters:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format time in seconds to WebVTT format (HH:MM:SS.mmm)
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
   */
  formatTimeForVTT(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
  }

  /**
   * Validate chapter timestamp data
   * @param {Object} chapterData - Chapter metadata
   * @returns {Object} Validation result
   */
  validateChapterData(chapterData) {
    const validation = {
      valid: true,
      warnings: [],
      errors: []
    };

    // Check basic structure
    if (!chapterData.chapters || chapterData.chapters.length === 0) {
      validation.valid = false;
      validation.errors.push('No chapters found in metadata');
      return validation;
    }

    // Validate each chapter
    let previousEndTime = 0;
    chapterData.chapters.forEach((chapter, index) => {
      // Check time continuity
      if (chapter.startTime < previousEndTime) {
        validation.warnings.push(`Chapter ${index + 1} starts before previous chapter ends`);
      }
      
      // Check duration
      if (chapter.duration <= 0) {
        validation.warnings.push(`Chapter ${index + 1} has zero or negative duration`);
      }
      
      // Check title
      if (!chapter.title || chapter.title.trim().length === 0) {
        validation.warnings.push(`Chapter ${index + 1} has no title`);
      }
      
      // Check audio files
      if (!chapter.audioFiles || chapter.audioFiles.length === 0) {
        validation.errors.push(`Chapter ${index + 1} has no audio files`);
      }
      
      previousEndTime = chapter.endTime;
    });

    // Check total duration consistency
    const calculatedDuration = chapterData.chapters[chapterData.chapters.length - 1]?.endTime || 0;
    if (Math.abs(calculatedDuration - chapterData.totalDuration) > 1) {
      validation.warnings.push('Total duration mismatch between calculated and reported values');
    }

    return validation;
  }
}

export default ChapterTimestampGenerator;
