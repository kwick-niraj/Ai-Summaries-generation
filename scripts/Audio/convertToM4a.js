#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { FormatConverter } from './pipeline/formatConverter.js';

/**
 * Universal audio format converter - Convert MP3, WAV, and other formats to M4A
 * Usage: node convertToM4a.js <input> [options]
 */

class UniversalAudioConverter {
  constructor() {
    this.formatConverter = new FormatConverter();
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      this.showUsage();
      process.exit(1);
    }

    const config = {
      input: args[0],
      output: null,
      quality: 'high',
      preserveOriginal: true,
      embedChapters: true,
      batch: false,
      recursive: false,
      sampleRate: 44100,
      channels: 1
    };

    // Parse options
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--output' || arg === '-o') {
        config.output = args[++i];
      } else if (arg === '--quality' || arg === '-q') {
        config.quality = args[++i];
      } else if (arg === '--no-preserve') {
        config.preserveOriginal = false;
      } else if (arg === '--no-chapters') {
        config.embedChapters = false;
      } else if (arg === '--batch' || arg === '-b') {
        config.batch = true;
      } else if (arg === '--recursive' || arg === '-r') {
        config.recursive = true;
      } else if (arg === '--sample-rate') {
        config.sampleRate = parseInt(args[++i]);
      } else if (arg === '--channels') {
        config.channels = parseInt(args[++i]);
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
🔄 Universal Audio Converter - Convert audio files to M4A format

Usage: node convertToM4a.js <input> [options]

Arguments:
  input                 Input file or directory path

Options:
  -o, --output <path>   Output file or directory (default: same as input)
  -q, --quality <q>     Quality: high, medium, low, veryLow, ultraLow (default: high)
  --no-preserve         Don't preserve original files (delete after conversion)
  --no-chapters         Don't embed chapter metadata
  -b, --batch           Batch mode: convert all audio files in directory
  -r, --recursive       Recursive: include subdirectories in batch mode
  --sample-rate <rate>  Sample rate in Hz (default: 44100)
  --channels <num>      Number of channels (default: 1)
  -h, --help           Show this help message

Quality Settings:
  high                  256kbps AAC, best quality
  medium                192kbps AAC, balanced
  low                   128kbps AAC, smaller files

Supported Input Formats:
  MP3, WAV, FLAC, AAC, OGG, WMA, M4A

Examples:
  # Convert single file
  node convertToM4a.js audio.mp3
  node convertToM4a.js audio.wav -o output.m4a --quality high
  
  # Convert with book metadata
  node convertToM4a.js book_complete.wav --embed-chapters
  
  # Batch convert directory
  node convertToM4a.js ./audio_files --batch
  node convertToM4a.js ./books --batch --recursive
  
  # Convert and don't preserve original
  node convertToM4a.js audio.mp3 --no-preserve

Requirements:
  - FFmpeg must be installed and available in PATH
  - For chapter embedding: metadata JSON file should exist alongside audio
`);
  }

  /**
   * Check if FFmpeg is available
   */
  checkRequirements() {
    if (!this.formatConverter.checkFFmpegAvailability()) {
      console.error('❌ FFmpeg is required but not found in PATH');
      console.error('Please install FFmpeg: https://ffmpeg.org/download.html');
      process.exit(1);
    }
  }

  /**
   * Find chapter metadata for a file
   */
  findChapterMetadata(audioPath) {
    const dir = path.dirname(audioPath);
    const basename = path.basename(audioPath, path.extname(audioPath));
    
    // Remove common suffixes
    const cleanBasename = basename.replace(/_complete$|_merged$|_final$/, '');
    
    const possiblePaths = [
      path.join(dir, `${cleanBasename}_chapters.json`),
      path.join(dir, 'metadata', `${cleanBasename}_chapters.json`),
      path.join(dir, `${basename}_chapters.json`),
      path.join(dir, 'metadata', `${basename}_chapters.json`)
    ];

    for (const metadataPath of possiblePaths) {
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          console.log(`📋 Found chapter metadata: ${metadataPath}`);
          return metadata;
        } catch (error) {
          console.warn(`⚠️  Failed to parse metadata ${metadataPath}: ${error.message}`);
        }
      }
    }

    return null;
  }

  /**
   * Convert single file
   */
  async convertSingleFile(inputPath, outputPath, config) {
    try {
      console.log(`🔄 Converting: ${path.basename(inputPath)}`);
      
      // Check if input file exists and is supported
      if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
      }

      if (!this.formatConverter.isFormatSupported(inputPath)) {
        throw new Error(`Unsupported format: ${path.extname(inputPath)}`);
      }

      // Find chapter metadata if embedding is enabled
      let chapterMetadata = null;
      if (config.embedChapters) {
        chapterMetadata = this.findChapterMetadata(inputPath);
      }

      // Configure converter
      this.formatConverter.config = {
        ...this.formatConverter.config,
        quality: config.quality,
        preserveOriginal: config.preserveOriginal,
        embedChapters: config.embedChapters,
        sampleRate: config.sampleRate,
        channels: config.channels
      };

      // Perform conversion
      const result = await this.formatConverter.convertToM4A(inputPath, outputPath, chapterMetadata);

      if (result.success) {
        console.log(`✅ Converted successfully: ${result.outputPath}`);
        console.log(`📊 Size: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
        
        if (result.compressionRatio) {
          console.log(`📈 Compression: ${(result.compressionRatio * 100).toFixed(1)}% of original`);
        }

        // Delete original if not preserving
        if (!config.preserveOriginal && inputPath !== result.outputPath) {
          try {
            fs.unlinkSync(inputPath);
            console.log(`🗑️  Removed original: ${inputPath}`);
          } catch (error) {
            console.warn(`⚠️  Could not remove original: ${error.message}`);
          }
        }

        return result;
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error(`❌ Conversion failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get audio files from directory
   */
  getAudioFiles(dirPath, recursive = false) {
    const audioFiles = [];
    const supportedFormats = this.formatConverter.getSupportedFormats();

    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && recursive) {
          scanDirectory(filePath);
        } else if (stat.isFile()) {
          const ext = path.extname(file).toLowerCase().substring(1);
          if (supportedFormats.includes(ext) && ext !== 'm4a') {
            audioFiles.push(filePath);
          }
        }
      }
    };

    scanDirectory(dirPath);
    return audioFiles;
  }

  /**
   * Batch convert files
   */
  async convertBatch(inputDir, outputDir, config) {
    try {
      console.log(`🔄 Starting batch conversion...`);
      console.log(`📂 Input directory: ${inputDir}`);
      console.log(`📁 Output directory: ${outputDir}`);
      
      // Get audio files
      const audioFiles = this.getAudioFiles(inputDir, config.recursive);
      
      if (audioFiles.length === 0) {
        console.log('ℹ️  No audio files found to convert');
        return { total: 0, successful: 0, failed: 0 };
      }

      console.log(`🎵 Found ${audioFiles.length} audio files`);

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Configure converter for batch mode
      this.formatConverter.config = {
        ...this.formatConverter.config,
        quality: config.quality,
        preserveOriginal: config.preserveOriginal,
        embedChapters: config.embedChapters,
        sampleRate: config.sampleRate,
        channels: config.channels
      };

      // Perform batch conversion
      const result = await this.formatConverter.batchConvert(audioFiles, outputDir);

      console.log(`\n🎉 Batch conversion completed!`);
      console.log(`✅ Successful: ${result.successful}`);
      console.log(`❌ Failed: ${result.failed}`);
      console.log(`📊 Success rate: ${((result.successful / result.total) * 100).toFixed(1)}%`);

      if (result.errors.length > 0) {
        console.log(`\n❌ Errors:`);
        result.errors.forEach(error => {
          console.log(`  ${path.basename(error.file)}: ${error.error}`);
        });
      }

      return result;

    } catch (error) {
      console.error(`❌ Batch conversion failed: ${error.message}`);
      return { total: 0, successful: 0, failed: 1, errors: [{ error: error.message }] };
    }
  }

  /**
   * Generate output path for single file
   */
  generateOutputPath(inputPath, outputPath) {
    if (outputPath) {
      return outputPath;
    }

    const dir = path.dirname(inputPath);
    const name = path.basename(inputPath, path.extname(inputPath));
    return path.join(dir, `${name}.m4a`);
  }

  /**
   * Main conversion function
   */
  async convert() {
    try {
      const config = this.parseArgs();
      
      console.log(`🔄 Universal Audio Converter`);
      console.log(`📊 Configuration:`, {
        quality: config.quality,
        preserveOriginal: config.preserveOriginal,
        embedChapters: config.embedChapters,
        batch: config.batch
      });

      // Check requirements
      this.checkRequirements();

      // Validate input
      if (!fs.existsSync(config.input)) {
        throw new Error(`Input not found: ${config.input}`);
      }

      const inputStat = fs.statSync(config.input);

      if (inputStat.isDirectory()) {
        // Directory input - batch mode
        const outputDir = config.output || config.input;
        await this.convertBatch(config.input, outputDir, config);
        
      } else if (inputStat.isFile()) {
        // File input - single conversion
        if (config.batch) {
          throw new Error('Batch mode requires directory input');
        }
        
        const outputPath = this.generateOutputPath(config.input, config.output);
        await this.convertSingleFile(config.input, outputPath, config);
        
      } else {
        throw new Error('Input must be a file or directory');
      }

      console.log(`\n🎉 Conversion completed successfully!`);

    } catch (error) {
      console.error(`❌ Conversion failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const converter = new UniversalAudioConverter();
  converter.convert();
}

export default UniversalAudioConverter;
