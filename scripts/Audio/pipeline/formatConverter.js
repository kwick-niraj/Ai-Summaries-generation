import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Universal audio format converter with support for multiple input formats
 * Specializes in converting to M4A with chapter metadata preservation
 */
export class FormatConverter {
  constructor(options = {}) {
    this.config = {
      outputFormat: options.outputFormat || 'm4a',
      quality: options.quality || 'high', // high, medium, low
      preserveOriginal: options.preserveOriginal !== false,
      embedChapters: options.embedChapters !== false,
      sampleRate: options.sampleRate || 44100,
      channels: options.channels || 1,
      ...options
    };

    // Quality presets
    this.qualityPresets = {
      high: { bitrate: '256k', vbr: 5 },
      medium: { bitrate: '192k', vbr: 4 },
      low: { bitrate: '128k', vbr: 3 }
    };
  }

  /**
   * Convert audio file to M4A format
   * @param {string} inputPath - Path to input audio file
   * @param {string} outputPath - Path for output M4A file (optional)
   * @param {Object} chapterMetadata - Chapter metadata for embedding (optional)
   * @returns {Promise<Object>} Conversion result
   */
  async convertToM4A(inputPath, outputPath = null, chapterMetadata = null) {
    try {
      console.log(`🔄 Converting ${path.basename(inputPath)} to M4A...`);
      
      // Validate input file
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
      }

      // Determine output path if not provided
      if (!outputPath) {
        outputPath = this.generateOutputPath(inputPath);
      }

      // Detect input format and get file info
      const inputInfo = await this.getAudioInfo(inputPath);
      
      // Build conversion command
      const command = this.buildConversionCommand(inputPath, outputPath, inputInfo, chapterMetadata);
      
      console.log(`📊 Input: ${inputInfo.format} (${inputInfo.duration}s, ${inputInfo.bitrate || 'unknown'} bitrate)`);
      console.log(`🎯 Output: M4A (${this.config.quality} quality)`);
      
      // Execute conversion
      execSync(command, { stdio: 'inherit' });
      
      // Verify output
      const outputInfo = await this.getAudioInfo(outputPath);
      const outputStats = fs.statSync(outputPath);
      
      console.log(`✅ Conversion completed: ${outputPath}`);
      console.log(`📈 Size: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);
      
      return {
        success: true,
        inputPath,
        outputPath,
        inputInfo,
        outputInfo,
        fileSize: outputStats.size,
        compressionRatio: inputInfo.fileSize ? (outputStats.size / inputInfo.fileSize) : null
      };
      
    } catch (error) {
      console.error(`❌ Conversion failed for ${inputPath}:`, error);
      return {
        success: false,
        error: error.message,
        inputPath,
        outputPath
      };
    }
  }

  /**
   * Batch convert multiple audio files
   * @param {Array} inputFiles - Array of input file paths
   * @param {string} outputDir - Output directory
   * @param {Object} chapterMetadata - Chapter metadata (optional)
   * @returns {Promise<Object>} Batch conversion result
   */
  async batchConvert(inputFiles, outputDir, chapterMetadata = null) {
    console.log(`🔄 Starting batch conversion of ${inputFiles.length} files...`);
    
    const results = {
      total: inputFiles.length,
      successful: 0,
      failed: 0,
      conversions: [],
      errors: []
    };

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (let i = 0; i < inputFiles.length; i++) {
      const inputFile = inputFiles[i];
      const outputFile = path.join(outputDir, this.generateOutputFilename(inputFile));
      
      console.log(`\n📊 Progress: ${i + 1}/${inputFiles.length} - ${path.basename(inputFile)}`);
      
      try {
        const result = await this.convertToM4A(inputFile, outputFile, chapterMetadata);
        results.conversions.push(result);
        
        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push({
            file: inputFile,
            error: result.error
          });
        }
        
      } catch (error) {
        results.failed++;
        results.errors.push({
          file: inputFile,
          error: error.message
        });
        console.error(`❌ Failed to convert ${inputFile}:`, error);
      }
    }

    console.log(`\n🎉 Batch conversion completed!`);
    console.log(`✅ Successful: ${results.successful}`);
    console.log(`❌ Failed: ${results.failed}`);
    
    return results;
  }

  /**
   * Convert book's complete audio file with chapter metadata
   * @param {string} inputPath - Path to complete audio file
   * @param {Object} chapterMetadata - Chapter metadata
   * @param {string} outputDir - Output directory
   * @returns {Promise<Object>} Conversion result with embedded chapters
   */
  async convertBookAudio(inputPath, chapterMetadata, outputDir) {
    try {
      console.log(`📚 Converting book audio with chapter metadata...`);
      
      const bookId = path.basename(inputPath, path.extname(inputPath)).replace('_complete', '');
      const outputPath = path.join(outputDir, `${bookId}_complete.m4a`);
      
      // Convert with chapter embedding
      const result = await this.convertToM4A(inputPath, outputPath, chapterMetadata);
      
      if (result.success && chapterMetadata) {
        // Create additional metadata files
        await this.createMetadataFiles(chapterMetadata, outputDir, bookId);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Book audio conversion failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get detailed audio file information
   * @param {string} filePath - Path to audio file
   * @returns {Promise<Object>} Audio file information
   */
  async getAudioInfo(filePath) {
    try {
      const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;
      const output = execSync(command, { encoding: 'utf8' });
      const info = JSON.parse(output);
      
      const audioStream = info.streams.find(s => s.codec_type === 'audio');
      const format = info.format;
      
      return {
        format: format.format_name,
        duration: parseFloat(format.duration) || 0,
        bitrate: format.bit_rate ? `${Math.round(format.bit_rate / 1000)}k` : null,
        sampleRate: audioStream?.sample_rate || null,
        channels: audioStream?.channels || null,
        codec: audioStream?.codec_name || null,
        fileSize: fs.statSync(filePath).size
      };
      
    } catch (error) {
      console.warn(`⚠️  Could not get audio info for ${filePath}:`, error.message);
      return {
        format: 'unknown',
        duration: 0,
        fileSize: fs.statSync(filePath).size
      };
    }
  }

  /**
   * Build FFmpeg conversion command
   * @param {string} inputPath - Input file path
   * @param {string} outputPath - Output file path
   * @param {Object} inputInfo - Input file information
   * @param {Object} chapterMetadata - Chapter metadata
   * @returns {string} FFmpeg command
   */
  buildConversionCommand(inputPath, outputPath, inputInfo, chapterMetadata) {
    const preset = this.qualityPresets[this.config.quality];
    
    // Start with the main input file
    let command = `ffmpeg -i "${inputPath}"`;
    
    // Add chapter file as second input if available (must come before encoding options)
    let chapterFile = null;
    if (chapterMetadata && this.config.embedChapters) {
      chapterFile = this.createChapterFile(chapterMetadata, outputPath);
      
      // Only add chapter metadata if file was successfully created
      if (chapterFile && fs.existsSync(chapterFile)) {
        command += ` -i "${chapterFile}"`;
      } else {
        chapterFile = null; // Reset if file doesn't exist
      }
    }
    
    // Audio codec and quality settings
    command += ` -c:a aac`;
    command += ` -b:a ${preset.bitrate}`;
    command += ` -ar ${this.config.sampleRate}`;
    command += ` -ac ${this.config.channels}`;
    
    // Quality settings for AAC
    command += ` -profile:a aac_low`;
    command += ` -movflags +faststart`; // Optimize for streaming
    
    // Add metadata
    command += ` -metadata:s:a:0 language=eng`;
    
    // Add mapping options if chapter file was included
    if (chapterFile) {
      command += ` -map 0:a -map 1 -c:c copy`;
    }
    
    // Smart quality adjustment based on input
    if (inputInfo.format && inputInfo.format.includes('mp3')) {
      // For MP3 input, avoid over-compression
      if (inputInfo.bitrate && parseInt(inputInfo.bitrate) < 192) {
        command = command.replace(preset.bitrate, Math.min(parseInt(inputInfo.bitrate) + 32, 192) + 'k');
      }
    }
    
    command += ` -y "${outputPath}"`;
    
    return command;
  }

  /**
   * Create FFmpeg chapter file for embedding
   * @param {Object} chapterMetadata - Chapter metadata
   * @param {string} outputPath - Output file path (for temp file naming)
   * @returns {string} Path to chapter file
   */
  createChapterFile(chapterMetadata, outputPath) {
    const chapterFile = outputPath.replace(/\.[^.]+$/, '_chapters.txt');
    
    // Detailed logging of input metadata
    console.log('📋 Creating chapter metadata file');
    console.log('Metadata input:', JSON.stringify(chapterMetadata, null, 2));
    
    let content = ';FFMETADATA1\n';
    content += `title=${chapterMetadata?.bookId || 'Audiobook'}\n`;
    content += `artist=AI Generated Audiobook\n`;
    content += `album=Book Summaries\n\n`;
    
    // Safely handle chapters with multiple validation checks
    try {
      // Validate input metadata structure
      if (!chapterMetadata || typeof chapterMetadata !== 'object') {
        throw new Error('Invalid chapter metadata: not an object');
      }
      
      const chapters = Array.isArray(chapterMetadata.chapters) 
        ? chapterMetadata.chapters 
        : [];
      
      console.log(`📊 Found ${chapters.length} chapters`);
      
      if (chapters.length > 0) {
        let totalDuration = 0;
        
        chapters.forEach((chapter, index) => {
          // Validate chapter object
          if (!chapter || typeof chapter !== 'object') {
            console.warn(`⚠️ Invalid chapter at index ${index}`);
            return;
          }
          
          // Robust time validation
          const startTime = this.validateChapterTime(chapter.startTime, index * 60000);
          const endTime = this.validateChapterTime(
            chapter.endTime, 
            (index + 1) * 60000, 
            startTime + 60000  // Ensure end time is after start time
          );
          
          // Update total duration tracking
          totalDuration = Math.max(totalDuration, endTime);
          
          // Sanitize title with fallback
          const sanitizedTitle = this.sanitizeChapterTitle(
            chapter.title || `Chapter ${index + 1}`, 
            index + 1
          );
          
          console.log(`📝 Chapter ${index + 1}: ${sanitizedTitle} (${startTime}ms - ${endTime}ms)`);
          
          content += `[CHAPTER]\n`;
          content += `TIMEBASE=1/1000\n`;
          content += `START=${startTime}\n`;
          content += `END=${endTime}\n`;
          content += `title=${sanitizedTitle}\n\n`;
        });
      } else {
        console.warn('⚠️ No chapters found, using default chapter');
        
        // Fallback chapter if no metadata
        content += `[CHAPTER]\n`;
        content += `TIMEBASE=1/1000\n`;
        content += `START=0\n`;
        content += `END=3600000\n`; // 1 hour default
        content += `title=Full Audiobook\n\n`;
      }
    } catch (processError) {
      console.error(`❌ Error processing chapter metadata: ${processError.message}`);
      console.error('Full error details:', processError);
      
      // Ultimate fallback
      content += `[CHAPTER]\n`;
      content += `TIMEBASE=1/1000\n`;
      content += `START=0\n`;
      content += `END=3600000\n`; // 1 hour default
      content += `title=Full Audiobook\n\n`;
    }
    
    try {
      // Ensure directory exists
      const chapterDir = path.dirname(chapterFile);
      if (!fs.existsSync(chapterDir)) {
        fs.mkdirSync(chapterDir, { recursive: true });
      }
      
      fs.writeFileSync(chapterFile, content);
      
      console.log(`✅ Chapter metadata file created: ${chapterFile}`);
      
      // Schedule cleanup
      setTimeout(() => {
        try {
          fs.unlinkSync(chapterFile);
          console.log(`🗑️ Temporary chapter file deleted: ${chapterFile}`);
        } catch (error) {
          console.warn(`⚠️  Could not clean up chapter file: ${chapterFile}`);
        }
      }, 60000);
      
      return chapterFile;
    } catch (error) {
      console.error(`❌ Failed to create chapter file: ${error.message}`);
      console.error('Full error details:', error);
      return null;
    }
  }

  /**
   * Validate and normalize chapter time
   * @param {number} time - Input time
   * @param {number} defaultTime - Default time if invalid
   * @param {number} maxTime - Maximum allowed time
   * @returns {number} Validated time in milliseconds
   */
  validateChapterTime(time, defaultTime, maxTime = 3600000) {
    // Convert to number and check for validity
    const validatedTime = Number(time);
    
    // Check if time is a valid number and positive
    if (!isNaN(validatedTime) && validatedTime >= 0) {
      // Convert to milliseconds if not already
      const timeInMs = validatedTime < 1000 ? validatedTime * 1000 : validatedTime;
      
      // Ensure time doesn't exceed max
      return Math.min(Math.round(timeInMs), maxTime);
    }
    
    // Return default time
    return defaultTime;
  }

  /**
   * Sanitize chapter title
   * @param {string} title - Input title
   * @param {number} fallbackNumber - Fallback chapter number
   * @returns {string} Sanitized title
   */
  sanitizeChapterTitle(title, fallbackNumber) {
    // Remove invalid characters
    const sanitized = title
      .replace(/[<>:"/\\|?*]/g, '')  // Remove invalid filename characters
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim();
    
    // Use fallback if title is empty
    return sanitized || `Chapter ${fallbackNumber}`;
  }

  /**
   * Create additional metadata files
   * @param {Object} chapterMetadata - Chapter metadata
   * @param {string} outputDir - Output directory
   * @param {string} bookId - Book identifier
   */
  async createMetadataFiles(chapterMetadata, outputDir, bookId) {
    try {
      // Create M4A-specific chapter file
      const m4aChapterFile = path.join(outputDir, `${bookId}_m4a_chapters.json`);
      const m4aMetadata = {
        ...chapterMetadata,
        format: 'm4a',
        embedded: true,
        createdAt: new Date().toISOString()
      };
      
      fs.writeFileSync(m4aChapterFile, JSON.stringify(m4aMetadata, null, 2));
      console.log(`📝 M4A metadata saved: ${m4aChapterFile}`);
      
    } catch (error) {
      console.warn(`⚠️  Could not create metadata files:`, error.message);
    }
  }

  /**
   * Generate output path for converted file
   * @param {string} inputPath - Input file path
   * @returns {string} Output file path
   */
  generateOutputPath(inputPath) {
    const dir = path.dirname(inputPath);
    const name = path.basename(inputPath, path.extname(inputPath));
    return path.join(dir, `${name}.m4a`);
  }

  /**
   * Generate output filename for converted file
   * @param {string} inputPath - Input file path
   * @returns {string} Output filename
   */
  generateOutputFilename(inputPath) {
    const name = path.basename(inputPath, path.extname(inputPath));
    return `${name}.m4a`;
  }

  /**
   * Check if FFmpeg is available
   * @returns {boolean} Whether FFmpeg is available
   */
  checkFFmpegAvailability() {
    try {
      execSync('ffmpeg -version', { stdio: 'pipe' });
      return true;
    } catch (error) {
      console.error('❌ FFmpeg not found. Please install FFmpeg to use format conversion.');
      return false;
    }
  }

  /**
   * Get supported input formats
   * @returns {Array} Array of supported formats
   */
  getSupportedFormats() {
    return ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'];
  }

  /**
   * Validate input file format
   * @param {string} filePath - Path to input file
   * @returns {boolean} Whether format is supported
   */
  isFormatSupported(filePath) {
    const ext = path.extname(filePath).toLowerCase().substring(1);
    return this.getSupportedFormats().includes(ext);
  }
}

export default FormatConverter;
