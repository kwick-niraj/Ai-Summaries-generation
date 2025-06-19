import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);

/**
 * Enhanced audio generator with TTS and audio combination capabilities
 */
export class AudioGenerator {
  constructor() {
    // Use the TTS-specific endpoint and credentials
    this.azureEndpoint = process.env.AZURE_TTS_ENDPOINT;
    this.azureKey = process.env.AZURE_TTS_KEY;
    this.deploymentId = process.env.AZURE_TTS_DEPLOYMENT_ID;
    this.apiVersion = '2024-02-15-preview';
    
    // Default TTS settings
    this.defaultSettings = {
      voice: 'nova',
      format: 'mp3',
      speed: 1.0
    };
  }

  /**
   * Generate TTS audio for a single text chunk with SSML support
   * @param {string} text - Text or SSML to convert to speech
   * @param {string} outputPath - Path to save the audio file
   * @param {Object} options - TTS options
   * @returns {Promise<Object>} Generation result
   */
  async generateTTS(text, outputPath, options = {}) {
    const settings = { ...this.defaultSettings, ...options };
    
    const url = `${this.azureEndpoint}/openai/deployments/${this.deploymentId}/audio/speech?api-version=${this.apiVersion}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'api-key': this.azureKey
    };

    // Determine if input is SSML or plain text
    const isSSML = this.isSSMLInput(text);
    const inputText = isSSML ? text : text;

    const body = {
      input: inputText,
      voice: settings.voice,
      response_format: settings.format,
      speed: settings.speed
    };

    try {
      const voiceInfo = settings.voice ? ` (${settings.voice})` : '';
      const ssmlInfo = isSSML ? ' [SSML]' : '';
      console.log(`🎵 Generating TTS for: ${path.basename(outputPath)}${voiceInfo}${ssmlInfo}`);
      
      const response = await axios.post(url, body, {
        headers,
        responseType: 'arraybuffer',
        timeout: 60000 // 60 second timeout
      });

      // Ensure output directory exists
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      
      // Write audio file
      fs.writeFileSync(outputPath, response.data);
      
      // Get file stats
      const stats = fs.statSync(outputPath);
      
      console.log(`✅ Audio saved: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
      
      return {
        success: true,
        outputPath,
        fileSize: stats.size,
        duration: await this.getAudioDuration(outputPath),
        isSSML,
        voice: settings.voice
      };
      
    } catch (error) {
      console.error(`❌ TTS generation failed for ${outputPath}:`, error?.response?.data || error.message);
      
      // If SSML failed, try with plain text as fallback
      if (isSSML && !options.isRetry) {
        console.log(`🔄 SSML failed, retrying with plain text...`);
        const plainText = this.extractTextFromSSML(text);
        return await this.generateTTS(plainText, outputPath, { ...options, isRetry: true });
      }
      
      return {
        success: false,
        error: error.message,
        outputPath,
        isSSML,
        voice: settings.voice
      };
    }
  }

  /**
   * Check if input text is SSML
   * @param {string} text - Input text
   * @returns {boolean} Whether text is SSML
   */
  isSSMLInput(text) {
    return text && text.includes('<speak') && text.includes('</speak>');
  }

  /**
   * Extract plain text from SSML for fallback
   * @param {string} ssml - SSML text
   * @returns {string} Plain text
   */
  extractTextFromSSML(ssml) {
    try {
      // Remove all SSML tags but keep the text content
      return ssml
        .replace(/<speak[^>]*>/gi, '')
        .replace(/<\/speak>/gi, '')
        .replace(/<prosody[^>]*>/gi, '')
        .replace(/<\/prosody>/gi, '')
        .replace(/<emphasis[^>]*>/gi, '')
        .replace(/<\/emphasis>/gi, '')
        .replace(/<break[^>]*\/>/gi, ' ')
        .replace(/<[^>]*>/g, '') // Remove any remaining tags
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error) {
      console.warn('Failed to extract text from SSML:', error);
      return ssml;
    }
  }

  /**
   * Generate TTS for multiple sections of a book
   * @param {Object} sections - Book sections (introduction, chapters, conclusion)
   * @param {string} bookId - Book identifier
   * @param {string} outputDir - Output directory
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation results
   */
  async generateBookAudio(sections, bookId, outputDir, options = {}) {
    const results = {
      bookId,
      outputDir,
      sections: {},
      totalFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      totalDuration: 0,
      errors: []
    };

    console.log(`\n🎧 Starting audio generation for book ${bookId}`);
    console.log(`📁 Output directory: ${outputDir}`);

    try {
      // Generate introduction
      if (sections.introduction) {
        console.log('\n📖 Processing Introduction...');
        const introResult = await this.generateSectionAudio(
          sections.introduction,
          'introduction',
          bookId,
          outputDir,
          options
        );
        results.sections.introduction = introResult;
        this.updateResults(results, introResult);
      }

      // Generate chapters
      if (sections.chapters && sections.chapters.length > 0) {
        console.log(`\n📚 Processing ${sections.chapters.length} chapters...`);
        results.sections.chapters = [];
        
        for (let i = 0; i < sections.chapters.length; i++) {
          const chapter = sections.chapters[i];
          console.log(`\n📄 Processing Chapter ${chapter.number}: ${chapter.title}`);
          
          const chapterResult = await this.generateSectionAudio(
            chapter,
            'chapter',
            bookId,
            outputDir,
            { ...options, chapterNumber: chapter.number }
          );
          
          results.sections.chapters.push(chapterResult);
          this.updateResults(results, chapterResult);
          
          // Add delay between chapters to respect rate limits
          if (i < sections.chapters.length - 1) {
            await this.delay(2000);
          }
        }
      }

      // Generate conclusion
      if (sections.conclusion) {
        console.log('\n🎯 Processing Conclusion...');
        const conclusionResult = await this.generateSectionAudio(
          sections.conclusion,
          'conclusion',
          bookId,
          outputDir,
          options
        );
        results.sections.conclusion = conclusionResult;
        this.updateResults(results, conclusionResult);
      }

      console.log(`\n✅ Audio generation completed for book ${bookId}`);
      console.log(`📊 Success: ${results.successfulFiles}/${results.totalFiles} files`);
      
      if (results.failedFiles > 0) {
        console.log(`⚠️  Failed: ${results.failedFiles} files`);
      }

      return results;

    } catch (error) {
      console.error(`❌ Book audio generation failed for ${bookId}:`, error);
      results.errors.push({
        type: 'book_generation',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      return results;
    }
  }

  /**
   * Generate audio for a single section
   * @param {Object} section - Section data
   * @param {string} sectionType - Type of section
   * @param {string} bookId - Book identifier
   * @param {string} outputDir - Output directory
   * @param {Object} options - Options
   * @returns {Promise<Object>} Section generation result
   */
  async generateSectionAudio(section, sectionType, bookId, outputDir, options = {}) {
    const result = {
      sectionType,
      title: section.title,
      files: [],
      totalDuration: 0,
      success: true,
      errors: []
    };

    try {
      // Split section into chunks if needed
      const chunks = this.splitSectionForTTS(section.content, options.maxChunkLength || 4000);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const fileName = this.generateFileName(sectionType, section, i, chunks.length, options);
        const outputPath = path.join(outputDir, fileName);
        
        const ttsResult = await this.generateTTS(chunk, outputPath, options);
        result.files.push(ttsResult);
        
        if (ttsResult.success) {
          result.totalDuration += ttsResult.duration || 0;
        } else {
          result.success = false;
          result.errors.push(ttsResult.error);
        }
        
        // Add delay between chunks
        if (i < chunks.length - 1) {
          await this.delay(1000);
        }
      }

      return result;

    } catch (error) {
      console.error(`Section audio generation failed for ${sectionType}:`, error);
      result.success = false;
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Generate appropriate filename for audio file
   * @param {string} sectionType - Section type
   * @param {Object} section - Section data
   * @param {number} chunkIndex - Chunk index
   * @param {number} totalChunks - Total chunks
   * @param {Object} options - Options
   * @returns {string} Generated filename
   */
  generateFileName(sectionType, section, chunkIndex, totalChunks, options = {}) {
    const ext = options.format || 'mp3';
    
    switch (sectionType) {
      case 'introduction':
        return totalChunks > 1 ? `introduction_part${chunkIndex + 1}.${ext}` : `introduction.${ext}`;
      
      case 'chapter':
        const chapterNum = String(section.number).padStart(2, '0');
        return totalChunks > 1 
          ? `chapter_${chapterNum}_part${chunkIndex + 1}.${ext}`
          : `chapter_${chapterNum}.${ext}`;
      
      case 'conclusion':
        return totalChunks > 1 ? `conclusion_part${chunkIndex + 1}.${ext}` : `conclusion.${ext}`;
      
      default:
        return `section_${chunkIndex + 1}.${ext}`;
    }
  }

  /**
   * Split section content for TTS processing
   * @param {string} content - Section content
   * @param {number} maxLength - Maximum length per chunk
   * @returns {Array} Array of content chunks
   */
  splitSectionForTTS(content, maxLength = 4000) {
    if (content.length <= maxLength) {
      return [content];
    }

    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxLength && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Combine multiple audio files into one
   * @param {Array} inputFiles - Array of input file paths
   * @param {string} outputPath - Output file path
   * @param {Object} options - Combination options
   * @returns {Promise<Object>} Combination result
   */
  async combineAudioFiles(inputFiles, outputPath, options = {}) {
    const { addSilence = 1.0, fadeIn = 0.1, fadeOut = 0.1 } = options;
    
    try {
      console.log(`🔗 Combining ${inputFiles.length} audio files...`);
      
      // Check if ffmpeg is available
      try {
        await execAsync('ffmpeg -version');
      } catch (error) {
        throw new Error('FFmpeg is required for audio combination. Please install FFmpeg.');
      }

      // Filter out non-existent files
      const existingFiles = inputFiles.filter(file => fs.existsSync(file));
      
      if (existingFiles.length === 0) {
        throw new Error('No valid input files found for combination');
      }

      if (existingFiles.length === 1) {
        // If only one file, just copy it
        fs.copyFileSync(existingFiles[0], outputPath);
        console.log(`✅ Single file copied to: ${outputPath}`);
        return { success: true, outputPath, inputCount: 1 };
      }

      // Create temporary file list for ffmpeg
      const fileListPath = path.join(path.dirname(outputPath), 'temp_filelist.txt');
      const fileListContent = existingFiles
        .map(file => `file '${path.resolve(file)}'`)
        .join('\n');
      
      fs.writeFileSync(fileListPath, fileListContent);

      // Ensure output directory exists
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      // Build ffmpeg command
      let ffmpegCmd = `ffmpeg -f concat -safe 0 -i "${fileListPath}"`;
      
      // Add silence between files if requested
      if (addSilence > 0) {
        ffmpegCmd += ` -af "apad=pad_dur=${addSilence}"`;
      }
      
      // Add fade effects if requested
      if (fadeIn > 0 || fadeOut > 0) {
        const filters = [];
        if (fadeIn > 0) filters.push(`afade=t=in:ss=0:d=${fadeIn}`);
        if (fadeOut > 0) filters.push(`afade=t=out:st=0:d=${fadeOut}`);
        
        if (filters.length > 0) {
          ffmpegCmd += ` -af "${filters.join(',')}"`;
        }
      }
      
      ffmpegCmd += ` -c:a libmp3lame -b:a 128k "${outputPath}" -y`;

      // Execute ffmpeg command
      await execAsync(ffmpegCmd);

      // Clean up temporary file
      if (fs.existsSync(fileListPath)) {
        fs.unlinkSync(fileListPath);
      }

      // Verify output file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error('Combined audio file was not created');
      }

      const stats = fs.statSync(outputPath);
      console.log(`✅ Combined audio saved: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);

      return {
        success: true,
        outputPath,
        inputCount: existingFiles.length,
        fileSize: stats.size,
        duration: await this.getAudioDuration(outputPath)
      };

    } catch (error) {
      console.error('❌ Audio combination failed:', error.message);
      return {
        success: false,
        error: error.message,
        outputPath
      };
    }
  }

  /**
   * Get audio file duration using ffprobe
   * @param {string} filePath - Path to audio file
   * @returns {Promise<number>} Duration in seconds
   */
  async getAudioDuration(filePath) {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`
      );
      return parseFloat(stdout.trim()) || 0;
    } catch (error) {
      console.warn(`Could not get duration for ${filePath}:`, error.message);
      return 0;
    }
  }

  /**
   * Update results object with section results
   * @param {Object} results - Main results object
   * @param {Object} sectionResult - Section result
   */
  updateResults(results, sectionResult) {
    results.totalFiles += sectionResult.files.length;
    results.successfulFiles += sectionResult.files.filter(f => f.success).length;
    results.failedFiles += sectionResult.files.filter(f => !f.success).length;
    results.totalDuration += sectionResult.totalDuration;
    
    if (sectionResult.errors.length > 0) {
      results.errors.push(...sectionResult.errors.map(error => ({
        section: sectionResult.sectionType,
        error,
        timestamp: new Date().toISOString()
      })));
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

  /**
   * Clean up temporary files
   * @param {string} directory - Directory to clean
   * @param {Array} patterns - File patterns to clean
   */
  cleanupTempFiles(directory, patterns = ['temp_*', '*.tmp']) {
    try {
      const files = fs.readdirSync(directory);
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        const shouldDelete = patterns.some(pattern => {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(file);
        });
        
        if (shouldDelete && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  Cleaned up: ${file}`);
        }
      }
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }
}

export default AudioGenerator;
