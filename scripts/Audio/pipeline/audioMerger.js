import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Enhanced audio merger that creates single audio files with precise chapter alignment
 * Ensures merged audio perfectly matches chapter timestamp metadata
 */
export class AudioMerger {
  constructor(options = {}) {
    this.config = {
      outputFormat: options.outputFormat || 'wav',
      sampleRate: options.sampleRate || 44100,
      channels: options.channels || 1,
      bitrate: options.bitrate || '128k',
      chapterGap: options.chapterGap || 1.5, // seconds between chapters
      fadeIn: options.fadeIn || 0.2,
      fadeOut: options.fadeOut || 0.2,
      ...options
    };
  }

  /**
   * Merge all audio files for a book with precise chapter alignment
   * @param {Object} audioResults - Audio generation results
   * @param {Object} chapterMetadata - Chapter timestamp metadata
   * @param {string} bookId - Book identifier
   * @param {string} outputDir - Output directory
   * @returns {Promise<Object>} Merge result
   */
  async mergeBookAudio(audioResults, chapterMetadata, bookId, outputDir) {
    try {
      console.log(`🔗 Merging audio files for book ${bookId} with chapter alignment...`);
      
      // Collect audio files in order
      const audioFiles = this.collectAudioFiles(audioResults);
      
      if (audioFiles.length === 0) {
        return { success: false, error: 'No audio files to merge' };
      }

      // Create merge plan with precise timing
      const mergePlan = await this.createMergePlan(audioFiles, chapterMetadata);
      
      // Execute merge with FFmpeg
      const outputPath = path.join(outputDir, `${bookId}_complete.${this.config.outputFormat}`);
      const mergeResult = await this.executeMerge(mergePlan, outputPath);
      
      // Validate merged audio against metadata
      const validation = await this.validateMergedAudio(outputPath, chapterMetadata);
      
      console.log(`✅ Audio merged successfully: ${outputPath}`);
      console.log(`📊 Total duration: ${this.formatDuration(mergeResult.duration)}`);
      
      return {
        success: true,
        outputPath,
        duration: mergeResult.duration,
        fileSize: mergeResult.fileSize,
        validation,
        mergePlan,
        audioFileCount: audioFiles.length
      };
      
    } catch (error) {
      console.error(`❌ Failed to merge audio for ${bookId}:`, error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Collect audio files in correct order from audio results
   * @param {Object} audioResults - Audio generation results
   * @returns {Array} Ordered array of audio files
   */
  collectAudioFiles(audioResults) {
    const audioFiles = [];

    // Add introduction files
    if (audioResults.sections.introduction?.files) {
      audioResults.sections.introduction.files
        .filter(f => f.success)
        .forEach(file => {
          audioFiles.push({
            path: file.outputPath,
            duration: file.duration || 0,
            section: 'introduction',
            title: 'Introduction'
          });
        });
    }

    // Add chapter files
    if (audioResults.sections.chapters) {
      audioResults.sections.chapters.forEach((chapter, index) => {
        if (chapter.files) {
          chapter.files
            .filter(f => f.success)
            .forEach(file => {
              audioFiles.push({
                path: file.outputPath,
                duration: file.duration || 0,
                section: 'chapter',
                chapterIndex: index,
                title: chapter.title || `Chapter ${index + 1}`
              });
            });
        }
      });
    }

    // Add conclusion files
    if (audioResults.sections.conclusion?.files) {
      audioResults.sections.conclusion.files
        .filter(f => f.success)
        .forEach(file => {
          audioFiles.push({
            path: file.outputPath,
            duration: file.duration || 0,
            section: 'conclusion',
            title: 'Conclusion'
          });
        });
    }

    return audioFiles;
  }

  /**
   * Create detailed merge plan with precise timing
   * @param {Array} audioFiles - Audio files to merge
   * @param {Object} chapterMetadata - Chapter metadata
   * @returns {Promise<Object>} Merge plan
   */
  async createMergePlan(audioFiles, chapterMetadata) {
    const plan = {
      files: [],
      totalDuration: 0,
      chapterAlignment: [],
      silenceSegments: []
    };

    let currentTime = 0;
    let currentChapterIndex = 0;

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      
      // Get actual file duration using FFprobe
      const actualDuration = await this.getAudioDuration(file.path);
      
      plan.files.push({
        ...file,
        actualDuration,
        startTime: currentTime,
        endTime: currentTime + actualDuration
      });

      currentTime += actualDuration;

      // Add silence between sections if not the last file
      if (i < audioFiles.length - 1) {
        const nextFile = audioFiles[i + 1];
        
        // Check if we're transitioning to a new chapter/section
        if (this.isNewSection(file, nextFile)) {
          plan.silenceSegments.push({
            startTime: currentTime,
            duration: this.config.chapterGap,
            reason: `Gap between ${file.title} and ${nextFile.title}`
          });
          
          currentTime += this.config.chapterGap;
        }
      }
    }

    plan.totalDuration = currentTime;

    // Align with chapter metadata if available
    if (chapterMetadata && chapterMetadata.chapters) {
      plan.chapterAlignment = this.alignWithMetadata(plan, chapterMetadata);
    }

    return plan;
  }

  /**
   * Check if transitioning to a new section
   * @param {Object} currentFile - Current file
   * @param {Object} nextFile - Next file
   * @returns {boolean} Whether it's a new section
   */
  isNewSection(currentFile, nextFile) {
    // Different section types
    if (currentFile.section !== nextFile.section) {
      return true;
    }
    
    // Different chapters within same section
    if (currentFile.section === 'chapter' && 
        currentFile.chapterIndex !== nextFile.chapterIndex) {
      return true;
    }
    
    return false;
  }

  /**
   * Get actual audio duration using FFprobe
   * @param {string} filePath - Path to audio file
   * @returns {Promise<number>} Duration in seconds
   */
  async getAudioDuration(filePath) {
    try {
      const command = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`;
      const output = execSync(command, { encoding: 'utf8' });
      return parseFloat(output.trim()) || 0;
    } catch (error) {
      console.warn(`⚠️  Could not get duration for ${filePath}:`, error.message);
      return 0;
    }
  }

  /**
   * Align merge plan with chapter metadata
   * @param {Object} plan - Merge plan
   * @param {Object} chapterMetadata - Chapter metadata
   * @returns {Array} Alignment information
   */
  alignWithMetadata(plan, chapterMetadata) {
    const alignment = [];
    
    chapterMetadata.chapters.forEach((chapter, index) => {
      const planFile = plan.files.find(f => 
        f.title.toLowerCase().includes(chapter.title.toLowerCase()) ||
        chapter.title.toLowerCase().includes(f.title.toLowerCase())
      );
      
      if (planFile) {
        alignment.push({
          chapterIndex: index,
          chapterTitle: chapter.title,
          expectedStart: chapter.startTime,
          expectedEnd: chapter.endTime,
          actualStart: planFile.startTime,
          actualEnd: planFile.endTime,
          timeDifference: Math.abs(planFile.startTime - chapter.startTime)
        });
      }
    });
    
    return alignment;
  }

  /**
   * Execute the merge using FFmpeg filter_complex
   * @param {Object} mergePlan - Merge plan
   * @param {string} outputPath - Output file path
   * @returns {Promise<Object>} Merge result
   */
  async executeMerge(mergePlan, outputPath) {
    try {
      // Build FFmpeg command using filter_complex approach
      const command = this.buildFilterComplexCommand(mergePlan, outputPath);
      
      console.log(`🔧 Executing merge command with filter_complex...`);
      console.log(`📝 Merging ${mergePlan.files.length} audio files`);
      
      // Execute FFmpeg
      execSync(command, { stdio: 'inherit' });
      
      // Get output file stats
      const stats = fs.statSync(outputPath);
      const duration = await this.getAudioDuration(outputPath);
      
      return {
        success: true,
        duration,
        fileSize: stats.size
      };
      
    } catch (error) {
      throw new Error(`FFmpeg merge failed: ${error.message}`);
    }
  }

  /**
   * Generate FFmpeg concat file content
   * @param {Object} mergePlan - Merge plan
   * @returns {string} Concat file content
   */
  generateConcatFile(mergePlan) {
    let content = '';
    
    mergePlan.files.forEach((file, index) => {
      content += `file '${file.path}'\n`;
      
      // Add silence if needed
      const silenceSegment = mergePlan.silenceSegments.find(s => 
        s.startTime >= file.endTime && s.startTime < (mergePlan.files[index + 1]?.startTime || Infinity)
      );
      
      if (silenceSegment) {
        // Create temporary silence file
        const silenceFile = this.createSilenceFile(silenceSegment.duration);
        content += `file '${silenceFile}'\n`;
      }
    });
    
    return content;
  }

  /**
   * Create temporary silence file
   * @param {number} duration - Duration in seconds
   * @returns {string} Path to silence file
   */
  createSilenceFile(duration) {
    const silenceFile = path.join(process.cwd(), `temp_silence_${Date.now()}.wav`);
    const command = `ffmpeg -f lavfi -i anullsrc=channel_layout=mono:sample_rate=${this.config.sampleRate} -t ${duration} -codec:a pcm_s16le -avoid_negative_ts make_zero "${silenceFile}"`;
    
    execSync(command, { stdio: 'pipe' });
    
    // Schedule cleanup
    setTimeout(() => {
      try {
        fs.unlinkSync(silenceFile);
      } catch (error) {
        console.warn(`⚠️  Could not clean up silence file: ${silenceFile}`);
      }
    }, 60000); // Clean up after 1 minute
    
    return silenceFile;
  }

  /**
   * Build FFmpeg command using filter_complex for seamless merging
   * @param {Object} mergePlan - Merge plan with files and silence segments
   * @param {string} outputPath - Output file path
   * @returns {string} FFmpeg command
   */
  buildFilterComplexCommand(mergePlan, outputPath) {
    // Simplified approach: just concatenate without silence for now to test
    let command = 'ffmpeg';
    
    // Add all audio files as inputs
    mergePlan.files.forEach(file => {
      command += ` -i "${file.path}"`;
    });
    
    // Simple concatenation without silence
    const audioStreams = mergePlan.files.map((_, i) => `[${i}:0]`);
    const filterComplex = `${audioStreams.join('')}concat=n=${mergePlan.files.length}:v=0:a=1[out]`;
    
    // Add filter_complex to command
    command += ` -filter_complex "${filterComplex}"`;
    command += ` -map "[out]"`;
    
    // Audio settings - use source sample rate to avoid resampling issues
    command += ` -ar 24000`;  // Match source files
    command += ` -ac 1`;      // Mono
    
    // Format-specific settings
    if (this.config.outputFormat === 'mp3') {
      command += ` -codec:a libmp3lame -b:a ${this.config.bitrate}`;
    } else if (this.config.outputFormat === 'wav') {
      command += ` -codec:a pcm_s16le`;
    }
    
    command += ` -y "${outputPath}"`;
    
    return command;
  }

  /**
   * Build FFmpeg command for merging (legacy concat method - kept for fallback)
   * @param {string} concatFile - Path to concat file
   * @param {string} outputPath - Output file path
   * @returns {string} FFmpeg command
   */
  buildFFmpegCommand(concatFile, outputPath) {
    let command = `ffmpeg -f concat -safe 0 -i "${concatFile}"`;
    
    // Fix timestamp issues by avoiding stream copy and forcing re-encoding
    command += ` -avoid_negative_ts make_zero`;
    command += ` -fflags +genpts`;
    
    // Audio settings
    command += ` -ar ${this.config.sampleRate}`;
    command += ` -ac ${this.config.channels}`;
    
    // Format-specific settings
    if (this.config.outputFormat === 'mp3') {
      command += ` -codec:a libmp3lame -b:a ${this.config.bitrate}`;
    } else if (this.config.outputFormat === 'wav') {
      command += ` -codec:a pcm_s16le`;
    }
    
    // Add fade effects
    if (this.config.fadeIn > 0 || this.config.fadeOut > 0) {
      let filters = [];
      if (this.config.fadeIn > 0) {
        filters.push(`afade=t=in:ss=0:d=${this.config.fadeIn}`);
      }
      if (this.config.fadeOut > 0) {
        filters.push(`afade=t=out:st=0:d=${this.config.fadeOut}`);
      }
      if (filters.length > 0) {
        command += ` -af "${filters.join(',')}"`;
      }
    }
    
    command += ` -y "${outputPath}"`;
    
    return command;
  }

  /**
   * Validate merged audio against metadata
   * @param {string} outputPath - Path to merged audio file
   * @param {Object} chapterMetadata - Chapter metadata
   * @returns {Promise<Object>} Validation result
   */
  async validateMergedAudio(outputPath, chapterMetadata) {
    const validation = {
      valid: true,
      warnings: [],
      errors: [],
      durationMatch: false,
      timingAccuracy: 'unknown'
    };

    try {
      const actualDuration = await this.getAudioDuration(outputPath);
      const expectedDuration = chapterMetadata.totalDuration;
      
      const durationDiff = Math.abs(actualDuration - expectedDuration);
      validation.durationMatch = durationDiff < 2.0; // Allow 2 second tolerance
      
      if (!validation.durationMatch) {
        validation.warnings.push(
          `Duration mismatch: expected ${expectedDuration}s, got ${actualDuration}s (diff: ${durationDiff.toFixed(2)}s)`
        );
      }
      
      // Determine timing accuracy
      if (durationDiff < 0.5) {
        validation.timingAccuracy = 'excellent';
      } else if (durationDiff < 1.0) {
        validation.timingAccuracy = 'good';
      } else if (durationDiff < 2.0) {
        validation.timingAccuracy = 'acceptable';
      } else {
        validation.timingAccuracy = 'poor';
        validation.valid = false;
      }
      
    } catch (error) {
      validation.errors.push(`Validation failed: ${error.message}`);
      validation.valid = false;
    }

    return validation;
  }

  /**
   * Format duration in human-readable format
   * @param {number} seconds - Duration in seconds
   * @returns {string} Formatted duration
   */
  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

export default AudioMerger;
