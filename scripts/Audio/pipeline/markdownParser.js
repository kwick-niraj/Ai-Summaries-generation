import fs from 'fs';

/**
 * Enhanced markdown parser that identifies book structure
 * Separates Introduction, Chapters, and Conclusion for audio generation
 */
export class MarkdownParser {
  constructor() {
    this.sections = {
      introduction: null,
      chapters: [],
      conclusion: null
    };
  }

  /**
   * Parse markdown file and extract structured sections
   * @param {string} filePath - Path to the markdown file
   * @returns {Object} Structured sections object
   */
  parseBookStructure(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return this.extractSections(content);
    } catch (error) {
      throw new Error(`Failed to read markdown file: ${error.message}`);
    }
  }

  /**
   * Extract sections from markdown content
   * @param {string} content - Raw markdown content
   * @returns {Object} Structured sections
   */
  extractSections(content) {
    const lines = content.split('\n');
    const sections = {
      introduction: null,
      chapters: [],
      conclusion: null
    };

    let currentSection = null;
    let currentContent = [];
    let chapterNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for section headers
      if (line.startsWith('## ')) {
        // Save previous section if exists
        if (currentSection && currentContent.length > 0) {
          this.saveSection(sections, currentSection, currentContent.join('\n').trim(), chapterNumber);
        }

        // Determine section type
        const headerText = line.substring(3).trim();
        currentSection = this.identifySectionType(headerText);
        currentContent = [line]; // Include the header in content
        
        if (currentSection === 'chapter') {
          chapterNumber++;
        }
      } else {
        // Add content to current section
        if (currentSection) {
          currentContent.push(line);
        }
      }
    }

    // Save the last section
    if (currentSection && currentContent.length > 0) {
      this.saveSection(sections, currentSection, currentContent.join('\n').trim(), chapterNumber);
    }

    return sections;
  }

  /**
   * Identify the type of section based on header text
   * @param {string} headerText - The header text without ##
   * @returns {string} Section type: 'introduction', 'chapter', or 'conclusion'
   */
  identifySectionType(headerText) {
    const lowerHeader = headerText.toLowerCase();
    
    if (lowerHeader.includes('introduction')) {
      return 'introduction';
    } else if (lowerHeader.includes('conclusion') || lowerHeader.includes('carrying the story forward')) {
      return 'conclusion';
    } else if (lowerHeader.includes('chapter') || lowerHeader.match(/^chapter \d+/i)) {
      return 'chapter';
    } else {
      // Default to chapter for other sections
      return 'chapter';
    }
  }

  /**
   * Save section content to appropriate category
   * @param {Object} sections - Sections object to populate
   * @param {string} sectionType - Type of section
   * @param {string} content - Section content
   * @param {number} chapterNumber - Current chapter number
   */
  saveSection(sections, sectionType, content, chapterNumber) {
    switch (sectionType) {
      case 'introduction':
        sections.introduction = {
          title: 'Introduction',
          content: content,
          wordCount: this.countWords(content)
        };
        break;
      case 'chapter':
        sections.chapters.push({
          number: chapterNumber,
          title: this.extractChapterTitle(content),
          content: content,
          wordCount: this.countWords(content)
        });
        break;
      case 'conclusion':
        sections.conclusion = {
          title: 'Conclusion',
          content: content,
          wordCount: this.countWords(content)
        };
        break;
    }
  }

  /**
   * Extract chapter title from content
   * @param {string} content - Chapter content
   * @returns {string} Chapter title
   */
  extractChapterTitle(content) {
    const lines = content.split('\n');
    const headerLine = lines.find(line => line.startsWith('## '));
    if (headerLine) {
      return headerLine.substring(3).trim();
    }
    return 'Chapter';
  }

  /**
   * Count words in content (excluding markdown formatting)
   * @param {string} content - Text content
   * @returns {number} Word count
   */
  countWords(content) {
    // Remove markdown formatting and count words
    const cleanText = content
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
      .replace(/`(.*?)`/g, '$1') // Remove code
      .replace(/---+/g, '') // Remove horizontal rules
      .trim();
    
    return cleanText.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Split large sections into smaller chunks for TTS processing
   * @param {string} content - Section content
   * @param {number} maxWords - Maximum words per chunk
   * @returns {Array} Array of content chunks
   */
  splitIntoChunks(content, maxWords = 400) {
    const words = content.split(/\s+/);
    const chunks = [];
    
    if (words.length <= maxWords) {
      return [content];
    }

    // Split by sentences first, then by word count
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    let currentChunk = '';
    let currentWordCount = 0;

    for (const sentence of sentences) {
      const sentenceWordCount = sentence.trim().split(/\s+/).length;
      
      if (currentWordCount + sentenceWordCount > maxWords && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
        currentWordCount = sentenceWordCount;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentWordCount += sentenceWordCount;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Get processing summary for a book
   * @param {Object} sections - Parsed sections
   * @returns {Object} Processing summary
   */
  getProcessingSummary(sections) {
    const summary = {
      totalSections: 0,
      totalWords: 0,
      structure: {}
    };

    if (sections.introduction) {
      summary.totalSections++;
      summary.totalWords += sections.introduction.wordCount;
      summary.structure.introduction = {
        wordCount: sections.introduction.wordCount,
        estimatedChunks: Math.ceil(sections.introduction.wordCount / 400)
      };
    }

    if (sections.chapters.length > 0) {
      summary.totalSections += sections.chapters.length;
      const chaptersWordCount = sections.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
      summary.totalWords += chaptersWordCount;
      summary.structure.chapters = {
        count: sections.chapters.length,
        totalWordCount: chaptersWordCount,
        averageWordCount: Math.round(chaptersWordCount / sections.chapters.length),
        estimatedChunks: sections.chapters.reduce((sum, ch) => sum + Math.ceil(ch.wordCount / 400), 0)
      };
    }

    if (sections.conclusion) {
      summary.totalSections++;
      summary.totalWords += sections.conclusion.wordCount;
      summary.structure.conclusion = {
        wordCount: sections.conclusion.wordCount,
        estimatedChunks: Math.ceil(sections.conclusion.wordCount / 400)
      };
    }

    summary.estimatedTotalChunks = (summary.structure.introduction?.estimatedChunks || 0) +
                                   (summary.structure.chapters?.estimatedChunks || 0) +
                                   (summary.structure.conclusion?.estimatedChunks || 0);

    return summary;
  }
}

export default MarkdownParser;
