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
   * @param {Object} voiceConfig - Voice configuration (optional)
   * @returns {Promise<Object>} Save result
   */
  async saveOptimizedBook(optimizedSections, bookId, outputDir, voiceConfig = null) {
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
      
      const result = {
        success: true,
        outputPath,
        fileSize: stats.size,
        wordCount: this.countWords(markdownContent)
      };

      // Save SSML versions if available
      if (voiceConfig && this.hasSSMLContent(optimizedSections)) {
        console.log(`🎵 Saving SSML versions for book ${bookId}...`);
        const ssmlResult = await this.saveSSMLBook(optimizedSections, bookId, outputDir, voiceConfig);
        result.ssmlSaved = ssmlResult;
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Failed to save optimized text for ${bookId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save SSML versions of optimized sections
   * @param {Object} optimizedSections - Optimized book sections (may contain SSML)
   * @param {string} bookId - Book identifier
   * @param {string} outputDir - Base output directory
   * @param {Object} voiceConfig - Voice configuration
   * @returns {Promise<Object>} SSML save result
   */
  async saveSSMLBook(optimizedSections, bookId, outputDir, voiceConfig) {
    try {
      // Create SSML directory
      const ssmlDir = path.join(outputDir, 'ssml');
      if (!fs.existsSync(ssmlDir)) {
        fs.mkdirSync(ssmlDir, { recursive: true });
      }

      const savedFiles = [];
      let totalSize = 0;

      // Save complete SSML file
      const completeSSML = this.generateCompleteSSML(optimizedSections, bookId, voiceConfig);
      const completeSSMLPath = path.join(outputDir, `${bookId}_ssml.xml`);
      fs.writeFileSync(completeSSMLPath, completeSSML, 'utf-8');
      
      const completeStats = fs.statSync(completeSSMLPath);
      totalSize += completeStats.size;
      savedFiles.push({
        type: 'complete',
        path: completeSSMLPath,
        size: completeStats.size
      });

      // Save individual section SSML files
      if (optimizedSections.introduction && this.isSSMLContent(optimizedSections.introduction.content)) {
        const introPath = path.join(ssmlDir, 'introduction.xml');
        const introSSML = this.generateSectionSSML(optimizedSections.introduction.content, 'introduction', voiceConfig);
        fs.writeFileSync(introPath, introSSML, 'utf-8');
        
        const introStats = fs.statSync(introPath);
        totalSize += introStats.size;
        savedFiles.push({
          type: 'introduction',
          path: introPath,
          size: introStats.size
        });
      }

      // Save chapter SSML files
      if (optimizedSections.chapters && optimizedSections.chapters.length > 0) {
        optimizedSections.chapters.forEach((chapter, index) => {
          if (this.isSSMLContent(chapter.content)) {
            const chapterNum = String(chapter.number || index + 1).padStart(2, '0');
            const chapterPath = path.join(ssmlDir, `chapter_${chapterNum}.xml`);
            const chapterSSML = this.generateSectionSSML(chapter.content, 'chapter', voiceConfig, chapter.title);
            fs.writeFileSync(chapterPath, chapterSSML, 'utf-8');
            
            const chapterStats = fs.statSync(chapterPath);
            totalSize += chapterStats.size;
            savedFiles.push({
              type: 'chapter',
              number: chapter.number || index + 1,
              path: chapterPath,
              size: chapterStats.size
            });
          }
        });
      }

      // Save conclusion SSML file
      if (optimizedSections.conclusion && this.isSSMLContent(optimizedSections.conclusion.content)) {
        const conclusionPath = path.join(ssmlDir, 'conclusion.xml');
        const conclusionSSML = this.generateSectionSSML(optimizedSections.conclusion.content, 'conclusion', voiceConfig);
        fs.writeFileSync(conclusionPath, conclusionSSML, 'utf-8');
        
        const conclusionStats = fs.statSync(conclusionPath);
        totalSize += conclusionStats.size;
        savedFiles.push({
          type: 'conclusion',
          path: conclusionPath,
          size: conclusionStats.size
        });
      }

      console.log(`✅ SSML files saved: ${savedFiles.length} files (${(totalSize / 1024).toFixed(1)} KB total)`);

      return {
        success: true,
        savedFiles,
        totalSize,
        ssmlDirectory: ssmlDir,
        completeSSMLPath: completeSSMLPath
      };

    } catch (error) {
      console.error(`❌ Failed to save SSML for ${bookId}:`, error);
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

  /**
   * Check if optimized sections contain SSML content
   * @param {Object} sections - Optimized sections
   * @returns {boolean} Whether any section contains SSML
   */
  hasSSMLContent(sections) {
    if (sections.introduction && this.isSSMLContent(sections.introduction.content)) {
      return true;
    }
    
    if (sections.chapters && sections.chapters.some(chapter => this.isSSMLContent(chapter.content))) {
      return true;
    }
    
    if (sections.conclusion && this.isSSMLContent(sections.conclusion.content)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if content is SSML
   * @param {string} content - Content to check
   * @returns {boolean} Whether content is SSML
   */
  isSSMLContent(content) {
    return content && content.includes('<speak') && content.includes('</speak>');
  }

  /**
   * Generate complete SSML file with all sections
   * @param {Object} sections - Optimized sections
   * @param {string} bookId - Book identifier
   * @param {Object} voiceConfig - Voice configuration
   * @returns {string} Complete SSML content
   */
  generateCompleteSSML(sections, bookId, voiceConfig) {
    const timestamp = new Date().toISOString();
    const voiceInfo = voiceConfig ? `${voiceConfig.selectedVoice} (${voiceConfig.confidence}% confidence)` : 'unknown';
    
    let ssmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated SSML for Book ID: ${bookId} -->
<!-- Voice: ${voiceInfo} -->
<!-- Generated: ${timestamp} -->
<!-- Reasoning: ${voiceConfig?.reasoning || 'N/A'} -->

`;

    // Add introduction
    if (sections.introduction && this.isSSMLContent(sections.introduction.content)) {
      ssmlContent += `<!-- INTRODUCTION -->\n`;
      ssmlContent += this.formatSSMLForFile(sections.introduction.content) + '\n\n';
    }

    // Add chapters
    if (sections.chapters && sections.chapters.length > 0) {
      sections.chapters.forEach((chapter, index) => {
        if (this.isSSMLContent(chapter.content)) {
          const chapterTitle = chapter.title || `Chapter ${chapter.number || index + 1}`;
          ssmlContent += `<!-- CHAPTER: ${chapterTitle} -->\n`;
          ssmlContent += this.formatSSMLForFile(chapter.content) + '\n\n';
        }
      });
    }

    // Add conclusion
    if (sections.conclusion && this.isSSMLContent(sections.conclusion.content)) {
      ssmlContent += `<!-- CONCLUSION -->\n`;
      ssmlContent += this.formatSSMLForFile(sections.conclusion.content) + '\n\n';
    }

    return ssmlContent.trim();
  }

  /**
   * Generate SSML for individual section
   * @param {string} content - Section content (SSML)
   * @param {string} sectionType - Section type
   * @param {Object} voiceConfig - Voice configuration
   * @param {string} title - Section title (optional)
   * @returns {string} Formatted SSML
   */
  generateSectionSSML(content, sectionType, voiceConfig, title = null) {
    const timestamp = new Date().toISOString();
    const voiceInfo = voiceConfig ? `${voiceConfig.selectedVoice} (${voiceConfig.confidence}% confidence)` : 'unknown';
    
    let ssmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Section: ${sectionType} -->`;
    
    if (title) {
      ssmlContent += `\n<!-- Title: ${title} -->`;
    }
    
    ssmlContent += `
<!-- Voice: ${voiceInfo} -->
<!-- Generated: ${timestamp} -->
<!-- Reasoning: ${voiceConfig?.reasoning || 'N/A'} -->

`;

    ssmlContent += this.formatSSMLForFile(content);
    
    return ssmlContent;
  }

  /**
   * Format SSML content for file output with proper indentation
   * @param {string} ssmlContent - Raw SSML content
   * @returns {string} Formatted SSML
   */
  formatSSMLForFile(ssmlContent) {
    try {
      // Basic SSML formatting - add proper indentation
      let formatted = ssmlContent
        .replace(/<speak([^>]*)>/g, '<speak$1>')
        .replace(/<\/speak>/g, '</speak>')
        .replace(/<prosody([^>]*)>/g, '  <prosody$1>')
        .replace(/<\/prosody>/g, '  </prosody>')
        .replace(/<emphasis([^>]*)>/g, '    <emphasis$1>')
        .replace(/<\/emphasis>/g, '</emphasis>')
        .replace(/<break([^>]*)\/>/g, '    <break$1/>');

      // Clean up extra whitespace
      formatted = formatted
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');

      return formatted;
    } catch (error) {
      console.warn('SSML formatting failed, returning original content:', error);
      return ssmlContent;
    }
  }

  /**
   * Extract plain text from SSML for comparison
   * @param {string} ssmlContent - SSML content
   * @returns {string} Plain text content
   */
  extractTextFromSSML(ssmlContent) {
    try {
      return ssmlContent
        .replace(/<speak[^>]*>/gi, '')
        .replace(/<\/speak>/gi, '')
        .replace(/<prosody[^>]*>/gi, '')
        .replace(/<\/prosody>/gi, '')
        .replace(/<emphasis[^>]*>/gi, '')
        .replace(/<\/emphasis>/gi, '')
        .replace(/<break[^>]*\/>/gi, ' ')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error) {
      console.warn('Failed to extract text from SSML:', error);
      return ssmlContent;
    }
  }
}

export default OptimizedTextSaver;
