import fs from 'fs';
import path from 'path';

/**
 * Audio Validator - Validates audio file completeness against summary sections
 * Checks for existence and integrity of required audio files
 */
export class AudioValidator {
  constructor() {
    // Expected audio file patterns
    this.audioPatterns = {
      introduction: ['introduction.wav', 'intro.wav'],
      chapter: (number) => [`chapter_${number.toString().padStart(2, '0')}.wav`, `chapter${number}.wav`],
      conclusion: ['conclusion.wav', 'epilogue.wav', 'final.wav']
    };
  }

  /**
   * Validate audio completeness for a book (Audio-First Approach)
   * @param {string} audioPath - Path to the book's audio directory
   * @param {Array} sections - Array of sections from summary parser (optional, for reference only)
   * @returns {Object} Validation result
   */
  validateAudioCompleteness(audioPath, sections = []) {
    const result = {
      isComplete: true,
      foundFiles: [],
      missingFiles: [],
      audioSections: [],
      validationDetails: [],
      audioPath,
      totalFound: 0
    };

    // Check if audio directory exists
    if (!fs.existsSync(audioPath)) {
      result.isComplete = false;
      result.validationDetails.push({
        type: 'error',
        message: `Audio directory not found: ${audioPath}`
      });
      return result;
    }

    // Get all audio files in the directory
    const existingFiles = this.getAudioFiles(audioPath);
    
    if (existingFiles.length === 0) {
      result.isComplete = false;
      result.validationDetails.push({
        type: 'error',
        message: 'No audio files found in directory'
      });
      return result;
    }

    // Analyze what audio files exist and categorize them
    const audioSections = this.analyzeExistingAudioFiles(audioPath, existingFiles);
    result.audioSections = audioSections;
    result.foundFiles = existingFiles.filter(file => !this.isSystemFile(file));
    result.totalFound = result.foundFiles.length;

    // Log what we found
    result.validationDetails.push({
      type: 'info',
      message: `Found ${result.totalFound} audio files: ${result.foundFiles.join(', ')}`
    });

    // The main requirement: check for complete WAV file
    this.performAdditionalValidation(audioPath, result);

    // Audio is complete if we have a complete WAV file, regardless of individual sections
    result.isComplete = result.completeWavFile && result.completeWavFile.found;

    if (!result.isComplete) {
      result.validationDetails.push({
        type: 'error',
        message: 'No complete WAV file found - cannot proceed with conversion'
      });
    } else {
      result.validationDetails.push({
        type: 'success',
        message: `Ready for conversion: ${result.completeWavFile.filename}`
      });
    }

    return result;
  }

  /**
   * Validate audio for a specific section
   * @param {string} audioPath - Path to audio directory
   * @param {Object} section - Section object from parser
   * @param {Array} existingFiles - List of existing audio files
   * @returns {Object} Section validation result
   */
  validateSectionAudio(audioPath, section, existingFiles) {
    const validation = {
      section: section.type,
      sectionNumber: section.number,
      sectionTitle: section.title,
      expectedFile: section.audioFile,
      found: false,
      audioFile: null,
      filePath: null,
      fileSize: 0,
      alternatives: []
    };

    // Check for exact match first
    if (existingFiles.includes(section.audioFile)) {
      const filePath = path.join(audioPath, section.audioFile);
      validation.found = true;
      validation.audioFile = section.audioFile;
      validation.filePath = filePath;
      validation.fileSize = this.getFileSize(filePath);
      return validation;
    }

    // Check for alternative file names based on section type
    const alternatives = this.getAlternativeFileNames(section);
    
    for (const altFile of alternatives) {
      if (existingFiles.includes(altFile)) {
        const filePath = path.join(audioPath, altFile);
        validation.found = true;
        validation.audioFile = altFile;
        validation.filePath = filePath;
        validation.fileSize = this.getFileSize(filePath);
        validation.alternatives.push(altFile);
        break;
      }
    }

    return validation;
  }

  /**
   * Get alternative file names for a section
   * @param {Object} section - Section object
   * @returns {Array} Array of alternative file names
   */
  getAlternativeFileNames(section) {
    const alternatives = [];

    switch (section.type) {
      case 'introduction':
        alternatives.push(...this.audioPatterns.introduction);
        break;
        
      case 'chapter':
        if (section.number) {
          alternatives.push(...this.audioPatterns.chapter(section.number));
          // Also try without padding
          alternatives.push(`chapter_${section.number}.wav`);
          alternatives.push(`ch${section.number}.wav`);
          alternatives.push(`ch_${section.number}.wav`);
        }
        break;
        
      case 'conclusion':
        alternatives.push(...this.audioPatterns.conclusion);
        break;
    }

    return alternatives.filter(alt => alt !== section.audioFile);
  }

  /**
   * Get all audio files in a directory
   * @param {string} audioPath - Path to audio directory
   * @returns {Array} Array of audio file names
   */
  getAudioFiles(audioPath) {
    try {
      return fs.readdirSync(audioPath)
        .filter(file => this.isAudioFile(file))
        .sort();
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if a file is an audio file
   * @param {string} filename - File name to check
   * @returns {boolean} True if it's an audio file
   */
  isAudioFile(filename) {
    const audioExtensions = ['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg'];
    const ext = path.extname(filename).toLowerCase();
    return audioExtensions.includes(ext);
  }

  /**
   * Check if a file is a system/metadata file
   * @param {string} filename - File name to check
   * @returns {boolean} True if it's a system file
   */
  isSystemFile(filename) {
    const systemFiles = [
      '.DS_Store',
      'processing_report.json',
      'metadata',
      'optimized_text',
      'ssml'
    ];
    
    return systemFiles.some(sysFile => 
      filename === sysFile || 
      filename.startsWith('.') ||
      filename.endsWith('.json') ||
      filename.endsWith('.xml') ||
      filename.endsWith('.txt') ||
      filename.endsWith('.md')
    );
  }

  /**
   * Analyze existing audio files and categorize them
   * @param {string} audioPath - Path to audio directory
   * @param {Array} existingFiles - List of existing audio files
   * @returns {Array} Array of categorized audio sections
   */
  analyzeExistingAudioFiles(audioPath, existingFiles) {
    const audioSections = [];

    existingFiles.forEach(filename => {
      if (this.isSystemFile(filename)) {
        return; // Skip system files
      }

      const section = this.categorizeAudioFile(filename);
      if (section) {
        section.filePath = path.join(audioPath, filename);
        section.fileSize = this.getFileSize(section.filePath);
        audioSections.push(section);
      }
    });

    // Sort sections by type and number
    audioSections.sort((a, b) => {
      const typeOrder = { introduction: 0, chapter: 1, conclusion: 2 };
      const aOrder = typeOrder[a.type] || 3;
      const bOrder = typeOrder[b.type] || 3;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // If both are chapters, sort by number
      if (a.type === 'chapter' && b.type === 'chapter') {
        return (a.number || 0) - (b.number || 0);
      }
      
      return 0;
    });

    return audioSections;
  }

  /**
   * Categorize an audio file based on its filename
   * @param {string} filename - Audio filename
   * @returns {Object|null} Section object or null if not categorized
   */
  categorizeAudioFile(filename) {
    const baseName = filename.toLowerCase();

    // Check for introduction
    if (baseName.includes('introduction') || baseName.includes('intro')) {
      return {
        type: 'introduction',
        title: 'Introduction',
        audioFile: filename,
        detected: true
      };
    }

    // Check for conclusion
    if (baseName.includes('conclusion') || baseName.includes('epilogue') || baseName.includes('final')) {
      return {
        type: 'conclusion',
        title: 'Conclusion',
        audioFile: filename,
        detected: true
      };
    }

    // Check for chapter
    const chapterMatch = baseName.match(/chapter[_\s]*(\d+)/);
    if (chapterMatch) {
      const chapterNumber = parseInt(chapterMatch[1]);
      return {
        type: 'chapter',
        number: chapterNumber,
        title: `Chapter ${chapterNumber}`,
        audioFile: filename,
        detected: true
      };
    }

    // Check for numbered chapters without "chapter" prefix
    const numberMatch = baseName.match(/^(\d+)[\._]/);
    if (numberMatch) {
      const chapterNumber = parseInt(numberMatch[1]);
      return {
        type: 'chapter',
        number: chapterNumber,
        title: `Chapter ${chapterNumber}`,
        audioFile: filename,
        detected: true
      };
    }

    // If we can't categorize it, treat as unknown
    return {
      type: 'unknown',
      title: filename,
      audioFile: filename,
      detected: false
    };
  }

  /**
   * Get file size safely
   * @param {string} filePath - Path to file
   * @returns {number} File size in bytes
   */
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Perform additional validation checks
   * @param {string} audioPath - Path to audio directory
   * @param {Object} result - Validation result object to update
   */
  performAdditionalValidation(audioPath, result) {
    // Check for complete WAV file
    const completeWavFile = this.findCompleteWavFile(audioPath);
    if (completeWavFile) {
      result.completeWavFile = {
        found: true,
        filename: completeWavFile,
        path: path.join(audioPath, completeWavFile),
        size: this.getFileSize(path.join(audioPath, completeWavFile))
      };
    } else {
      result.completeWavFile = {
        found: false,
        message: 'No complete WAV file found'
      };
      result.validationDetails.push({
        type: 'warning',
        message: 'No complete WAV file found (e.g., {bookId}_complete.wav)'
      });
    }

    // Check for processing report
    const reportPath = path.join(audioPath, 'processing_report.json');
    if (fs.existsSync(reportPath)) {
      result.processingReport = {
        found: true,
        path: reportPath,
        valid: this.validateProcessingReport(reportPath)
      };
    } else {
      result.processingReport = {
        found: false,
        message: 'No processing report found'
      };
      result.validationDetails.push({
        type: 'info',
        message: 'No processing report found - chapter metadata may not be available'
      });
    }

    // Check for very small files (likely corrupted)
    const minFileSize = 1024; // 1KB minimum
    result.foundFiles.forEach(filename => {
      const filePath = path.join(audioPath, filename);
      const fileSize = this.getFileSize(filePath);
      
      if (fileSize < minFileSize) {
        result.validationDetails.push({
          type: 'warning',
          message: `File ${filename} is very small (${fileSize} bytes) - may be corrupted`
        });
      }
    });
  }

  /**
   * Find the complete WAV file for a book
   * @param {string} audioPath - Path to audio directory
   * @returns {string|null} Complete WAV filename or null
   */
  findCompleteWavFile(audioPath) {
    try {
      const files = fs.readdirSync(audioPath);
      
      // Look for patterns like {bookId}_complete.wav, complete.wav, merged.wav, etc.
      const completePatterns = [
        /_complete\.wav$/,
        /_merged\.wav$/,
        /_final\.wav$/,
        /^complete\.wav$/,
        /^merged\.wav$/,
        /^final\.wav$/
      ];

      for (const pattern of completePatterns) {
        const match = files.find(file => pattern.test(file));
        if (match) {
          return match;
        }
      }

      // If no pattern match, look for the largest WAV file
      const wavFiles = files
        .filter(file => file.endsWith('.wav'))
        .map(file => ({
          name: file,
          size: this.getFileSize(path.join(audioPath, file))
        }))
        .sort((a, b) => b.size - a.size);

      if (wavFiles.length > 0) {
        // Return the largest file if it's significantly larger than others
        const largest = wavFiles[0];
        if (wavFiles.length === 1 || largest.size > wavFiles[1].size * 2) {
          return largest.name;
        }
      }

    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return null;
  }

  /**
   * Validate processing report JSON
   * @param {string} reportPath - Path to processing report
   * @returns {boolean} True if valid
   */
  validateProcessingReport(reportPath) {
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      
      // Check for required fields
      const requiredFields = ['bookId', 'success', 'sections', 'audioFiles'];
      return requiredFields.every(field => field in report);
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate multiple books in batch
   * @param {string} audioOutputPath - Base audio output directory
   * @param {Array} bookIds - Array of book IDs to validate
   * @param {Function} getSections - Function to get sections for a book ID
   * @returns {Object} Batch validation results
   */
  validateBatch(audioOutputPath, bookIds, getSections) {
    const results = {
      total: bookIds.length,
      complete: 0,
      incomplete: 0,
      errors: 0,
      books: {}
    };

    bookIds.forEach(bookId => {
      try {
        const sections = getSections(bookId);
        const audioPath = path.join(audioOutputPath, bookId);
        const validation = this.validateAudioCompleteness(audioPath, sections);
        
        results.books[bookId] = validation;
        
        if (validation.isComplete) {
          results.complete++;
        } else {
          results.incomplete++;
        }
        
      } catch (error) {
        results.books[bookId] = {
          isComplete: false,
          error: error.message
        };
        results.errors++;
      }
    });

    return results;
  }

  /**
   * Generate validation report
   * @param {Object} validationResult - Result from validateAudioCompleteness
   * @returns {string} Formatted report
   */
  generateReport(validationResult) {
    let report = `📊 Audio Validation Report\n`;
    report += `${'='.repeat(50)}\n\n`;
    
    report += `📁 Audio Path: ${validationResult.audioPath}\n`;
    report += `📈 Status: ${validationResult.isComplete ? '✅ Complete' : '❌ Incomplete'}\n`;
    report += `📊 Files: ${validationResult.totalFound}/${validationResult.totalExpected}\n\n`;

    if (validationResult.foundFiles.length > 0) {
      report += `✅ Found Files (${validationResult.foundFiles.length}):\n`;
      validationResult.foundFiles.forEach(file => {
        report += `  - ${file}\n`;
      });
      report += `\n`;
    }

    if (validationResult.missingFiles.length > 0) {
      report += `❌ Missing Files (${validationResult.missingFiles.length}):\n`;
      validationResult.missingFiles.forEach(file => {
        report += `  - ${file}\n`;
      });
      report += `\n`;
    }

    if (validationResult.extraFiles.length > 0) {
      report += `ℹ️  Extra Files (${validationResult.extraFiles.length}):\n`;
      validationResult.extraFiles.forEach(file => {
        report += `  - ${file}\n`;
      });
      report += `\n`;
    }

    if (validationResult.completeWavFile) {
      if (validationResult.completeWavFile.found) {
        const sizeMB = (validationResult.completeWavFile.size / 1024 / 1024).toFixed(2);
        report += `🎵 Complete WAV: ${validationResult.completeWavFile.filename} (${sizeMB} MB)\n`;
      } else {
        report += `⚠️  Complete WAV: Not found\n`;
      }
    }

    if (validationResult.validationDetails.length > 0) {
      const warnings = validationResult.validationDetails.filter(d => d.type === 'warning');
      const errors = validationResult.validationDetails.filter(d => d.type === 'error');
      
      if (errors.length > 0) {
        report += `\n❌ Errors:\n`;
        errors.forEach(error => report += `  - ${error.message}\n`);
      }
      
      if (warnings.length > 0) {
        report += `\n⚠️  Warnings:\n`;
        warnings.forEach(warning => report += `  - ${warning.message}\n`);
      }
    }

    return report;
  }
}

export default AudioValidator;
