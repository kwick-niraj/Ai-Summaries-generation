import fs from 'fs';
import path from 'path';

/**
 * Utility class to save optimized text in markdown format
 * Preserves the original book structure with optimized content
 */
export class OptimizedTextSaver {
  constructor() {
    this.outputSubDir = 'optimized_text';
  }

  /**
   * Save optimized sections as a complete markdown file
   * @param {Object} optimizedSections - Optimized book sections
   * @param {string} bookId - Book identifier
   * @param {string} outputDir - Base output directory
   * @returns {Promise<Object>} Save result
   */
  async saveOptimizedBook(optimizedSections, bookId, outputDir) {
    try {
      console.log(`💾 Saving optimized text for book ${bookId}...`);
      
      // Create optimized text directory
      const optimizedDir = path.join(outputDir, this.outputSubDir);
      if (!fs.existsSync(optimizedDir)) {
        fs.mkdirSync(optimizedDir, { recursive: true });
      }

      // Generate markdown content
      const markdownContent = this.generateMarkdownContent(optimizedSections, bookId);
      
      // Save to file
      const outputPath = path.join(optimizedDir, `${bookId}.md`);
      fs.writeFileSync(outputPath, markdownContent, 'utf-8');
      
      // Get file stats
      const stats = fs.statSync(outputPath);
      
      console.log(`✅ Optimized text saved: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
      
      return {
        success: true,
        outputPath,
        fileSize: stats.size,
        wordCount: this.countWords(markdownContent)
      };
      
    } catch (error) {
      console.error(`❌ Failed to save optimized text for ${bookId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate complete markdown content from optimized sections
   * @param {Object} sections - Optimized sections
   * @param {string} bookId - Book identifier
   * @returns {string} Complete markdown content
   */
  generateMarkdownContent(sections, bookId) {
    let content = '';

    // Add introduction
    if (sections.introduction) {
      content += `## Introduction\n\n`;
      content += `${sections.introduction.content}\n\n`;
    }

    // Add chapters
    if (sections.chapters && sections.chapters.length > 0) {
      sections.chapters.forEach((chapter, index) => {
        const chapterTitle = chapter.title || `Chapter ${chapter.number || index + 1}`;
        content += `## ${chapterTitle}\n\n`;
        content += `${chapter.content}\n\n`;
      });
    }

    // Add conclusion
    if (sections.conclusion) {
      content += `## Conclusion\n\n`;
      content += `${sections.conclusion.content}\n\n`;
    }

    return content.trim();
  }

  /**
   * Count total sections in the book
   * @param {Object} sections - Book sections
   * @returns {number} Total section count
   */
  getSectionCount(sections) {
    let count = 0;
    if (sections.introduction) count++;
    if (sections.chapters) count += sections.chapters.length;
    if (sections.conclusion) count++;
    return count;
  }

  /**
   * Count words in text content
   * @param {string} text - Text content
   * @returns {number} Word count
   */
  countWords(text) {
    // Remove markdown formatting and count words
    const cleanText = text
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
      .replace(/`(.*?)`/g, '$1') // Remove code
      .replace(/---+/g, '') // Remove horizontal rules
      .replace(/\*.*?\*/g, '') // Remove metadata lines
      .trim();
    
    return cleanText.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Validate optimized content structure
   * @param {Object} sections - Optimized sections
   * @returns {Object} Validation result
   */
  validateOptimizedContent(sections) {
    const validation = {
      valid: true,
      warnings: [],
      errors: []
    };

    // Check if at least one section exists
    const hasContent = sections.introduction || 
                      (sections.chapters && sections.chapters.length > 0) || 
                      sections.conclusion;
    
    if (!hasContent) {
      validation.valid = false;
      validation.errors.push('No content sections found');
    }

    // Validate chapters
    if (sections.chapters) {
      sections.chapters.forEach((chapter, index) => {
        if (!chapter.content || chapter.content.trim().length === 0) {
          validation.warnings.push(`Chapter ${index + 1} has empty content`);
        }
        
        if (!chapter.title || chapter.title.trim().length === 0) {
          validation.warnings.push(`Chapter ${index + 1} has no title`);
        }
      });
    }

    // Check for very short content
    const totalWords = this.getTotalWords(sections);
    if (totalWords < 100) {
      validation.warnings.push(`Very short content: only ${totalWords} words`);
    }

    return validation;
  }

  /**
   * Get total word count from all sections
   * @param {Object} sections - Book sections
   * @returns {number} Total word count
   */
  getTotalWords(sections) {
    let totalWords = 0;
    
    if (sections.introduction) {
      totalWords += this.countWords(sections.introduction.content);
    }
    
    if (sections.chapters) {
      sections.chapters.forEach(chapter => {
        totalWords += this.countWords(chapter.content);
      });
    }
    
    if (sections.conclusion) {
      totalWords += this.countWords(sections.conclusion.content);
    }
    
    return totalWords;
  }

  /**
   * Create a comparison report between original and optimized text
   * @param {Object} originalSections - Original sections
   * @param {Object} optimizedSections - Optimized sections
   * @param {string} bookId - Book identifier
   * @param {string} outputDir - Output directory
   * @returns {Promise<Object>} Comparison result
   */
  async createComparisonReport(originalSections, optimizedSections, bookId, outputDir) {
    try {
      const report = {
        bookId,
        timestamp: new Date().toISOString(),
        original: {
          sections: this.getSectionCount(originalSections),
          words: this.getTotalWords(originalSections)
        },
        optimized: {
          sections: this.getSectionCount(optimizedSections),
          words: this.getTotalWords(optimizedSections)
        },
        changes: {
          wordDifference: this.getTotalWords(optimizedSections) - this.getTotalWords(originalSections),
          compressionRatio: this.getTotalWords(optimizedSections) / this.getTotalWords(originalSections)
        },
        validation: this.validateOptimizedContent(optimizedSections)
      };

      // Save comparison report
      const reportPath = path.join(outputDir, this.outputSubDir, `${bookId}_comparison.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`📊 Comparison report saved: ${reportPath}`);
      
      return {
        success: true,
        reportPath,
        report
      };
      
    } catch (error) {
      console.error(`❌ Failed to create comparison report:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default OptimizedTextSaver;
