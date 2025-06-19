#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { AudioMerger } from './pipeline/audioMerger.js';
import { FormatConverter } from './pipeline/formatConverter.js';

/**
 * Standalone script for merging book audio files with chapter alignment
 * Usage: node mergeBookAudio.js <bookId> [options]
 */

class BookAudioMerger {
  constructor() {
    this.audioMerger = new AudioMerger();
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
      bookId: args[0],
      outputDir: null,
      format: 'wav',
      convertToM4A: false,
      quality: 'high',
      chapterGap: 1.5,
      fadeIn: 0.2,
      fadeOut: 0.2
    };

    // Parse options
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--output' || arg === '-o') {
        config.outputDir = args[++i];
      } else if (arg === '--format' || arg === '-f') {
        config.format = args[++i];
      } else if (arg === '--m4a') {
        config.convertToM4A = true;
      } else if (arg === '--quality' || arg === '-q') {
        config.quality = args[++i];
      } else if (arg === '--gap' || arg === '-g') {
        config.chapterGap = parseFloat(args[++i]);
      } else if (arg === '--fade-in') {
        config.fadeIn = parseFloat(args[++i]);
      } else if (arg === '--fade-out') {
        config.fadeOut = parseFloat(args[++i]);
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
📚 Book Audio Merger - Merge individual audio files into a single file with chapter alignment

Usage: node mergeBookAudio.js <bookId> [options]

Arguments:
  bookId                Book identifier (e.g., "123", "rich-dad-poor-dad")

Options:
  -o, --output <dir>    Output directory (default: auto-detect from audio files)
  -f, --format <fmt>    Output format: wav, mp3 (default: wav)
  --m4a                 Also convert to M4A format with embedded chapters
  -q, --quality <q>     M4A quality: high, medium, low (default: high)
  -g, --gap <seconds>   Gap between chapters in seconds (default: 1.5)
  --fade-in <seconds>   Fade-in duration (default: 0.2)
  --fade-out <seconds>  Fade-out duration (default: 0.2)
  -h, --help           Show this help message

Examples:
  node mergeBookAudio.js 123
  node mergeBookAudio.js 123 --format mp3 --m4a
  node mergeBookAudio.js rich-dad-poor-dad -o ./output --gap 2.0
  node mergeBookAudio.js 123 --m4a --quality high

Requirements:
  - FFmpeg must be installed and available in PATH
  - Audio files should be in: scripts/Audio/output/<bookId>/
  - Chapter metadata should exist: scripts/Audio/output/<bookId>/metadata/<bookId>_chapters.json
`);
  }

  /**
   * Find book directory and validate files
   */
  findBookDirectory(bookId, outputDir) {
    const possiblePaths = [
      outputDir,
      `./scripts/Audio/output/${bookId}`,
      `./Audio/output/${bookId}`,
      `./output/${bookId}`,
      `./${bookId}`
    ].filter(Boolean);

    for (const dirPath of possiblePaths) {
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        const hasAudioFiles = files.some(f => f.endsWith('.wav') || f.endsWith('.mp3'));
        
        if (hasAudioFiles) {
          return path.resolve(dirPath);
        }
      }
    }

    throw new Error(`Could not find audio files for book ${bookId} in any of: ${possiblePaths.join(', ')}`);
  }

  /**
   * Load chapter metadata
   */
  loadChapterMetadata(bookDir, bookId) {
    const metadataPath = path.join(bookDir, 'metadata', `${bookId}_chapters.json`);
    
    if (!fs.existsSync(metadataPath)) {
      console.warn(`⚠️  Chapter metadata not found: ${metadataPath}`);
      console.warn(`⚠️  Proceeding without chapter alignment`);
      return null;
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      console.log(`📋 Loaded chapter metadata: ${metadata.chapters?.length || 0} chapters`);
      return metadata;
    } catch (error) {
      console.warn(`⚠️  Failed to parse chapter metadata: ${error.message}`);
      return null;
    }
  }

  /**
   * Collect audio files from directory
   */
  collectAudioFiles(bookDir) {
    const audioFiles = [];
    const extensions = ['.wav', '.mp3', '.m4a'];
    
    // Recursively find audio files
    const findAudioFiles = (dir, prefix = '') => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          findAudioFiles(filePath, prefix + file + '/');
        } else if (extensions.some(ext => file.endsWith(ext))) {
          // Skip already combined files
          if (!file.includes('_complete')) {
            audioFiles.push({
              path: filePath,
              name: prefix + file,
              section: this.detectSection(file),
              order: this.getFileOrder(file)
            });
          }
        }
      }
    };

    findAudioFiles(bookDir);
    
    // Sort files by order
    audioFiles.sort((a, b) => a.order - b.order);
    
    console.log(`🎵 Found ${audioFiles.length} audio files`);
    return audioFiles;
  }

  /**
   * Detect section type from filename
   */
  detectSection(filename) {
    const lower = filename.toLowerCase();
    
    if (lower.includes('introduction') || lower.includes('intro')) {
      return 'introduction';
    } else if (lower.includes('conclusion') || lower.includes('summary')) {
      return 'conclusion';
    } else if (lower.includes('chapter')) {
      return 'chapter';
    }
    
    return 'unknown';
  }

  /**
   * Get file order for sorting
   */
  getFileOrder(filename) {
    // Extract numbers from filename for ordering
    const matches = filename.match(/(\d+)/g);
    if (matches) {
      return parseInt(matches[0]);
    }
    
    // Fallback ordering
    const lower = filename.toLowerCase();
    if (lower.includes('introduction')) return 0;
    if (lower.includes('conclusion')) return 9999;
    
    return 1000; // Default for unknown files
  }

  /**
   * Create mock audio results structure
   */
  createAudioResults(audioFiles) {
    const audioResults = {
      sections: {
        introduction: null,
        chapters: [],
        conclusion: null
      },
      totalFiles: audioFiles.length,
      successfulFiles: audioFiles.length,
      failedFiles: 0,
      totalDuration: 0
    };

    // Group files by section
    const introFiles = audioFiles.filter(f => f.section === 'introduction');
    const chapterFiles = audioFiles.filter(f => f.section === 'chapter');
    const conclusionFiles = audioFiles.filter(f => f.section === 'conclusion');
    const unknownFiles = audioFiles.filter(f => f.section === 'unknown');

    // Add introduction
    if (introFiles.length > 0) {
      audioResults.sections.introduction = {
        files: introFiles.map(f => ({
          outputPath: f.path,
          success: true,
          duration: 0 // Will be detected by AudioMerger
        }))
      };
    }

    // Add chapters (including unknown files as chapters)
    const allChapterFiles = [...chapterFiles, ...unknownFiles];
    if (allChapterFiles.length > 0) {
      // Group by chapter number or treat each as separate chapter
      const chapterGroups = new Map();
      
      allChapterFiles.forEach(file => {
        const chapterNum = this.extractChapterNumber(file.name) || file.order;
        if (!chapterGroups.has(chapterNum)) {
          chapterGroups.set(chapterNum, []);
        }
        chapterGroups.get(chapterNum).push(file);
      });

      Array.from(chapterGroups.entries())
        .sort(([a], [b]) => a - b)
        .forEach(([chapterNum, files]) => {
          audioResults.sections.chapters.push({
            title: `Chapter ${chapterNum}`,
            files: files.map(f => ({
              outputPath: f.path,
              success: true,
              duration: 0
            }))
          });
        });
    }

    // Add conclusion
    if (conclusionFiles.length > 0) {
      audioResults.sections.conclusion = {
        files: conclusionFiles.map(f => ({
          outputPath: f.path,
          success: true,
          duration: 0
        }))
      };
    }

    return audioResults;
  }

  /**
   * Extract chapter number from filename
   */
  extractChapterNumber(filename) {
    const match = filename.match(/chapter[_\s]*(\d+)/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Main merge function
   */
  async merge() {
    try {
      const config = this.parseArgs();
      
      console.log(`🔗 Merging audio for book: ${config.bookId}`);
      console.log(`📊 Configuration:`, {
        format: config.format,
        convertToM4A: config.convertToM4A,
        quality: config.quality,
        chapterGap: config.chapterGap
      });

      // Find book directory
      const bookDir = this.findBookDirectory(config.bookId, config.outputDir);
      console.log(`📂 Book directory: ${bookDir}`);

      // Load chapter metadata
      const chapterMetadata = this.loadChapterMetadata(bookDir, config.bookId);

      // Collect audio files
      const audioFiles = this.collectAudioFiles(bookDir);
      
      if (audioFiles.length === 0) {
        throw new Error('No audio files found to merge');
      }

      // Create audio results structure
      const audioResults = this.createAudioResults(audioFiles);

      // Configure audio merger
      this.audioMerger.config = {
        ...this.audioMerger.config,
        outputFormat: config.format,
        chapterGap: config.chapterGap,
        fadeIn: config.fadeIn,
        fadeOut: config.fadeOut
      };

      // Perform merge
      console.log(`🔧 Starting merge process...`);
      const mergeResult = await this.audioMerger.mergeBookAudio(
        audioResults,
        chapterMetadata,
        config.bookId,
        bookDir
      );

      if (!mergeResult.success) {
        throw new Error(`Merge failed: ${mergeResult.error}`);
      }

      console.log(`✅ Merge completed successfully!`);
      console.log(`📁 Output file: ${mergeResult.outputPath}`);
      console.log(`📊 Duration: ${this.audioMerger.formatDuration(mergeResult.duration)}`);
      console.log(`📈 File size: ${(mergeResult.fileSize / 1024 / 1024).toFixed(2)} MB`);

      // Convert to M4A if requested
      if (config.convertToM4A) {
        console.log(`\n🔄 Converting to M4A...`);
        
        this.formatConverter.config.quality = config.quality;
        
        const conversionResult = await this.formatConverter.convertBookAudio(
          mergeResult.outputPath,
          chapterMetadata,
          bookDir
        );

        if (conversionResult.success) {
          console.log(`✅ M4A conversion completed!`);
          console.log(`📁 M4A file: ${conversionResult.outputPath}`);
          console.log(`📈 M4A size: ${(conversionResult.fileSize / 1024 / 1024).toFixed(2)} MB`);
        } else {
          console.error(`❌ M4A conversion failed: ${conversionResult.error}`);
        }
      }

      console.log(`\n🎉 All operations completed successfully!`);

    } catch (error) {
      console.error(`❌ Merge failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const merger = new BookAudioMerger();
  merger.merge();
}

export default BookAudioMerger;
