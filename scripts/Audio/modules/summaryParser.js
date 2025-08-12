import fs from 'fs';
import path from 'path';

/**
 * Summary Parser - Extracts sections from markdown summary files
 * Handles various header formats and identifies all content sections
 */
export class SummaryParser {
  constructor() {
    // Regex patterns for different header formats
    this.patterns = {
      // ## Introduction, ## Chapter 1, ## Chapter 2 "Title"
      hashHeaders: /^##\s+(.+)$/gm,
      
      // **Introduction**, **Chapter 1**, **Conclusion: Title**
      boldHeaders: /^\*\*(.+?)\*\*$/gm,
      
      // # Introduction (single hash)
      singleHashHeaders: /^#\s+(.+)$/gm,
      
      // ### Chapter headers (triple hash)
      tripleHashHeaders: /^###\s+(.+)$/gm
    };

    // Section type patterns
    this.sectionTypes = {
      introduction: /^(introduction|intro)$/i,
      chapter: /^chapter\s+(\d+)/i,
      conclusion: /^(conclusion|epilogue|final\s+thoughts?|summary)$/i
    };
  }

  /**
   * Parse a summary file and extract all sections
   * @param {string} summaryPath - Path to the summary markdown file
   * @returns {Object} Parsed summary data with sections
   */
  parseSummary(summaryPath) {
    try {
      const content = fs.readFileSync(summaryPath, 'utf8');
      const sections = this.extractSections(content);
      
      return {
        filePath: summaryPath,
        bookId: path.basename(summaryPath, '.md'),
        sections,
        totalSections: sections.length,
        hasIntroduction: sections.some(s => s.type === 'introduction'),
        hasConclusion: sections.some(s => s.type === 'conclusion'),
        chapterCount: sections.filter(s => s.type === 'chapter').length
      };
    } catch (error) {
      throw new Error(`Failed to parse summary ${summaryPath}: ${error.message}`);
    }
  }

  /**
   * Extract sections from markdown content
   * @param {string} content - Markdown content
   * @returns {Array} Array of section objects
   */
  extractSections(content) {
    const sections = [];
    const allHeaders = [];

    // Extract headers using all patterns
    Object.entries(this.patterns).forEach(([patternName, regex]) => {
      let match;
      while ((match = regex.exec(content)) !== null) {
        allHeaders.push({
          text: match[1].trim(),
          index: match.index,
          patternType: patternName
        });
      }
    });

    // Sort headers by their position in the document
    allHeaders.sort((a, b) => a.index - b.index);

    // Process each header to determine section type
    allHeaders.forEach((header, index) => {
      const section = this.parseHeaderText(header.text, index);
      if (section) {
        sections.push({
          ...section,
          originalText: header.text,
          patternType: header.patternType,
          position: index + 1
        });
      }
    });

    return sections;
  }

  /**
   * Parse header text to determine section type and details
   * @param {string} headerText - The header text to parse
   * @param {number} index - Position index of the header
   * @returns {Object|null} Section object or null if not recognized
   */
  parseHeaderText(headerText, index) {
    // Clean the header text
    const cleanText = headerText
      .replace(/^#+\s*/, '') // Remove hash symbols
      .replace(/^\*\*|\*\*$/g, '') // Remove bold markers
      .trim();

    // Check for introduction
    if (this.sectionTypes.introduction.test(cleanText)) {
      return {
        type: 'introduction',
        title: cleanText,
        audioFile: 'introduction.wav'
      };
    }

    // Check for chapter
    const chapterMatch = cleanText.match(this.sectionTypes.chapter);
    if (chapterMatch) {
      const chapterNumber = parseInt(chapterMatch[1]);
      const title = cleanText.replace(/^chapter\s+\d+\s*/i, '').replace(/^["']|["']$/g, '').trim();
      
      return {
        type: 'chapter',
        number: chapterNumber,
        title: title || `Chapter ${chapterNumber}`,
        audioFile: `chapter_${chapterNumber.toString().padStart(2, '0')}.wav`
      };
    }

    // Check for conclusion
    if (this.sectionTypes.conclusion.test(cleanText)) {
      return {
        type: 'conclusion',
        title: cleanText,
        audioFile: 'conclusion.wav'
      };
    }

    // If it contains "Chapter" but doesn't match the pattern, try to extract number
    if (/chapter/i.test(cleanText)) {
      const numberMatch = cleanText.match(/(\d+)/);
      if (numberMatch) {
        const chapterNumber = parseInt(numberMatch[1]);
        return {
          type: 'chapter',
          number: chapterNumber,
          title: cleanText,
          audioFile: `chapter_${chapterNumber.toString().padStart(2, '0')}.wav`
        };
      }
    }

    // If it looks like a conclusion but doesn't match pattern
    if (/conclusion|epilogue|final|summary/i.test(cleanText)) {
      return {
        type: 'conclusion',
        title: cleanText,
        audioFile: 'conclusion.wav'
      };
    }

    // Default: treat as a chapter if it's not the first section
    if (index > 0) {
      // Try to infer chapter number from position
      const inferredNumber = index; // Assuming introduction is first
      return {
        type: 'chapter',
        number: inferredNumber,
        title: cleanText,
        audioFile: `chapter_${inferredNumber.toString().padStart(2, '0')}.wav`,
        inferred: true
      };
    }

    // If it's the first section and not recognized as introduction, might be introduction
    if (index === 0 && !this.sectionTypes.introduction.test(cleanText)) {
      return {
        type: 'introduction',
        title: cleanText,
        audioFile: 'introduction.wav',
        inferred: true
      };
    }

    return null;
  }

  /**
   * Validate parsed sections for completeness
   * @param {Array} sections - Array of parsed sections
   * @returns {Object} Validation result
   */
  validateSections(sections) {
    const validation = {
      isValid: true,
      warnings: [],
      errors: [],
      summary: {
        hasIntroduction: false,
        hasConclusion: false,
        chapterCount: 0,
        totalSections: sections.length
      }
    };

    // Check for introduction
    const introSections = sections.filter(s => s.type === 'introduction');
    if (introSections.length === 0) {
      validation.warnings.push('No introduction section found');
    } else if (introSections.length > 1) {
      validation.warnings.push('Multiple introduction sections found');
    } else {
      validation.summary.hasIntroduction = true;
    }

    // Check for conclusion
    const conclusionSections = sections.filter(s => s.type === 'conclusion');
    if (conclusionSections.length === 0) {
      validation.warnings.push('No conclusion section found');
    } else if (conclusionSections.length > 1) {
      validation.warnings.push('Multiple conclusion sections found');
    } else {
      validation.summary.hasConclusion = true;
    }

    // Check chapters
    const chapters = sections.filter(s => s.type === 'chapter');
    validation.summary.chapterCount = chapters.length;

    if (chapters.length === 0) {
      validation.errors.push('No chapters found');
      validation.isValid = false;
    } else {
      // Check for sequential chapter numbering
      const chapterNumbers = chapters
        .filter(c => c.number)
        .map(c => c.number)
        .sort((a, b) => a - b);

      if (chapterNumbers.length > 0) {
        for (let i = 0; i < chapterNumbers.length - 1; i++) {
          if (chapterNumbers[i + 1] - chapterNumbers[i] > 1) {
            validation.warnings.push(`Gap in chapter numbering: ${chapterNumbers[i]} to ${chapterNumbers[i + 1]}`);
          }
        }
      }
    }

    // Check for duplicate audio files
    const audioFiles = sections.map(s => s.audioFile);
    const duplicates = audioFiles.filter((file, index) => audioFiles.indexOf(file) !== index);
    if (duplicates.length > 0) {
      validation.errors.push(`Duplicate audio files: ${duplicates.join(', ')}`);
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * Get expected audio files for a summary
   * @param {string} summaryPath - Path to summary file
   * @returns {Array} Array of expected audio filenames
   */
  getExpectedAudioFiles(summaryPath) {
    const summaryData = this.parseSummary(summaryPath);
    return summaryData.sections.map(section => section.audioFile);
  }

  /**
   * Parse multiple summary files
   * @param {string} summariesDir - Directory containing summary files
   * @returns {Object} Results for all summaries
   */
  parseAllSummaries(summariesDir) {
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      summaries: {},
      errors: []
    };

    try {
      const files = fs.readdirSync(summariesDir)
        .filter(file => file.endsWith('.md'));

      results.total = files.length;

      files.forEach(file => {
        const filePath = path.join(summariesDir, file);
        const bookId = path.basename(file, '.md');

        try {
          const summaryData = this.parseSummary(filePath);
          const validation = this.validateSections(summaryData.sections);
          
          results.summaries[bookId] = {
            ...summaryData,
            validation
          };
          results.successful++;
        } catch (error) {
          results.errors.push({
            bookId,
            file,
            error: error.message
          });
          results.failed++;
        }
      });

    } catch (error) {
      throw new Error(`Failed to read summaries directory: ${error.message}`);
    }

    return results;
  }

  /**
   * Debug: Show parsing results for a summary
   * @param {string} summaryPath - Path to summary file
   */
  debugParsing(summaryPath) {
    console.log(`\n🔍 Debug parsing for: ${path.basename(summaryPath)}`);
    
    try {
      const summaryData = this.parseSummary(summaryPath);
      const validation = this.validateSections(summaryData.sections);

      console.log(`📊 Summary: ${summaryData.totalSections} sections found`);
      console.log(`📖 Introduction: ${summaryData.hasIntroduction ? '✅' : '❌'}`);
      console.log(`📚 Chapters: ${summaryData.chapterCount}`);
      console.log(`📝 Conclusion: ${summaryData.hasConclusion ? '✅' : '❌'}`);

      console.log(`\n📋 Sections:`);
      summaryData.sections.forEach((section, index) => {
        const typeEmoji = {
          introduction: '📖',
          chapter: '📚',
          conclusion: '📝'
        }[section.type] || '❓';
        
        console.log(`  ${index + 1}. ${typeEmoji} ${section.type}${section.number ? ` ${section.number}` : ''}: ${section.title}`);
        console.log(`     Audio: ${section.audioFile}${section.inferred ? ' (inferred)' : ''}`);
      });

      if (validation.warnings.length > 0) {
        console.log(`\n⚠️  Warnings:`);
        validation.warnings.forEach(warning => console.log(`  - ${warning}`));
      }

      if (validation.errors.length > 0) {
        console.log(`\n❌ Errors:`);
        validation.errors.forEach(error => console.log(`  - ${error}`));
      }

    } catch (error) {
      console.error(`❌ Parsing failed:`, error.message);
    }
  }
}

export default SummaryParser;
