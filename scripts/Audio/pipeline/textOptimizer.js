import { AzureOpenAI } from 'openai';
import { DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Enhanced text optimizer for audio-friendly content
 * Converts markdown text to natural speech patterns with SSML
 */
export class TextOptimizer {
  constructor() {
    // Use the same configuration as your existing generateSummariesAzureOpenAi.js
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiVersion = '2025-01-01-preview';
    const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT_ID || 'gpt-4.1';

    // Initialize Azure Credential (same as your existing code)
    const credential = new DefaultAzureCredential();
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(credential, scope);

    // Azure OpenAI Client
    this.client = new AzureOpenAI({ 
      endpoint, 
      azureADTokenProvider, 
      apiVersion, 
      deployment 
    });
    
    this.deployment = deployment;
  }

  /**
   * Optimize text for audio narration
   * @param {string} text - Raw text content
   * @param {string} sectionType - Type of section (introduction, chapter, conclusion)
   * @param {Object} options - Optimization options
   * @returns {Promise<string>} Optimized text
   */
  async optimizeForAudio(text, sectionType = 'chapter', options = {}) {
    try {
      // Extract chapter headers before optimization
      const extractedHeaders = this.extractChapterHeaders(text);
      
      // First, clean and prepare the text
      const cleanedText = this.cleanMarkdownText(text);
      
      // Apply AI-based optimization for natural speech
      const optimizedText = await this.applyAIOptimization(cleanedText, sectionType);
      
      // Verify and restore headers if needed
      const verifiedText = this.verifyAndRestoreHeaders(optimizedText, extractedHeaders);
      
      // Apply final audio-specific formatting
      const audioReadyText = this.applyAudioFormatting(verifiedText, sectionType);
      
      return audioReadyText;
    } catch (error) {
      console.error('Text optimization failed:', error);
      // Fallback to basic cleaning if AI optimization fails
      return this.applyAudioFormatting(this.cleanMarkdownText(text), sectionType);
    }
  }

  /**
   * Clean markdown formatting and prepare for audio
   * @param {string} text - Raw markdown text
   * @returns {string} Cleaned text
   */
  cleanMarkdownText(text) {
    return text
      // Convert markdown headers to plain text but preserve them
      .replace(/^#{1,6}\s+(.+)$/gm, '$1')
      // Remove bold/italic formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      // Remove links but keep text
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      // Remove code formatting
      .replace(/`(.*?)`/g, '$1')
      // Remove horizontal rules
      .replace(/^---+$/gm, '')
      // Clean up multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove extra spaces
      .replace(/[ \t]+/g, ' ')
      // Trim each line
      .split('\n').map(line => line.trim()).join('\n')
      .trim();
  }

  /**
   * Apply AI-based optimization for natural speech
   * @param {string} text - Cleaned text
   * @param {string} sectionType - Section type
   * @returns {Promise<string>} AI-optimized text
   */
  async applyAIOptimization(text, sectionType) {
    const systemPrompt = this.getSystemPrompt(sectionType);
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.deployment,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('AI optimization failed:', error);
      throw error;
    }
  }

  /**
   * Get system prompt based on section type
   * @param {string} sectionType - Section type
   * @returns {string} System prompt
   */
  getSystemPrompt(sectionType) {
    const basePrompt = `You are an expert audio script editor. Transform the given text for natural audio narration. Make it conversational, engaging, and easy to listen to.

CRITICAL: Always preserve chapter titles and section headers exactly as they appear. These are essential for navigation and structure.

Guidelines:
- PRESERVE all chapter titles and section headers exactly as provided
- Use natural, flowing language that sounds good when spoken aloud
- Break up long sentences into shorter, more digestible ones
- Add transitional phrases where appropriate
- Replace complex punctuation with natural pauses
- Convert abbreviations to full words (e.g., "e.g." → "for example")
- Make the tone warm and engaging
- Remove meta-commentary like "this chapter discusses" or "in this section"
- Ensure smooth flow between ideas
- Keep chapter titles at the beginning of each section for audio navigation`;

    const sectionSpecific = {
      introduction: `
- Create an inviting opening that draws listeners in
- Set the tone for the entire audiobook
- Use welcoming, inclusive language`,
      
      chapter: `
- Maintain narrative flow and engagement
- Use natural transitions between concepts
- Keep the listener engaged with varied sentence structure`,
      
      conclusion: `
- Create a satisfying sense of closure
- Summarize key insights naturally
- End with inspiration or actionable takeaways`
    };

    return basePrompt + (sectionSpecific[sectionType] || sectionSpecific.chapter);
  }

  /**
   * Apply final audio-specific formatting
   * @param {string} text - AI-optimized text
   * @param {string} sectionType - Section type
   * @returns {string} Audio-ready text
   */
  applyAudioFormatting(text, sectionType) {
    let formatted = text
      // Convert common abbreviations
      .replace(/\be\.g\./gi, 'for example')
      .replace(/\bi\.e\./gi, 'that is')
      .replace(/\betc\./gi, 'and so on')
      .replace(/\bvs\./gi, 'versus')
      .replace(/\bDr\./gi, 'Doctor')
      .replace(/\bMr\./gi, 'Mister')
      .replace(/\bMrs\./gi, 'Missus')
      .replace(/\bMs\./gi, 'Miss')
      
      // Handle numbers and dates
      .replace(/\b(\d+)%/g, '$1 percent')
      .replace(/\$(\d+)/g, '$1 dollars')
      
      // Improve punctuation for speech
      .replace(/([.!?])\s*(?=[A-Z])/g, '$1 ')
      .replace(/;\s*/g, '. ')
      .replace(/:\s*([A-Z])/g, ': $1')
      
      // Handle quotes for speech
      .replace(/"/g, '')
      .replace(/'/g, "'")
      
      // Clean up spacing
      .replace(/\s{2,}/g, ' ')
      .trim();

    return formatted;
  }

  /**
   * Generate advanced SSML markup for OpenAI TTS with strategic breaks and emphasis
   * @param {string} text - Audio-ready text
   * @param {string} sectionType - Section type
   * @param {Object} ssmlConfig - SSML configuration from voice selector
   * @returns {string} SSML formatted text
   */
  generateSSML(text, sectionType = 'chapter', ssmlConfig = {}) {
    try {
      // Validate and prepare text
      if (!text || typeof text !== 'string') {
        console.warn('Invalid text provided for SSML generation');
        return text || '';
      }

      // Get section-specific settings
      const sectionSettings = ssmlConfig.sectionSettings?.[sectionType] || {
        rate: '1.0',
        emphasis: 'moderate',
        pauseAfter: '1.0s'
      };

      // Escape XML characters first
      const escapedText = this.escapeXML(text.trim());
      
      // Apply content-aware SSML formatting
      const formattedText = this.applyContentAwareSSML(
        escapedText, 
        sectionType, 
        ssmlConfig
      );

      // Validate SSML before returning
      const ssmlOutput = this.buildSSMLDocument(formattedText, sectionSettings);
      
      if (!this.validateSSML(ssmlOutput)) {
        console.warn('SSML validation failed, returning plain text');
        return text;
      }

      return ssmlOutput;

    } catch (error) {
      console.error('SSML generation failed:', error);
      return text; // Fallback to plain text
    }
  }

  /**
   * Get section-specific intro pause
   * @param {string} sectionType - Section type
   * @returns {string} SSML pause markup
   */
  getSectionIntroPause(sectionType) {
    switch (sectionType) {
      case 'introduction':
        return '<break time="1s"/>'; // Longer pause before introduction
      case 'conclusion':
        return '<break time="1.5s"/>'; // Longest pause before conclusion
      default:
        return '<break time="0.8s"/>'; // Standard pause for chapters
    }
  }

  /**
   * Escape XML characters for SSML
   * @param {string} text - Text to escape
   * @returns {string} XML-escaped text
   */
  escapeXML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Batch optimize multiple text chunks
   * @param {Array} chunks - Array of text chunks
   * @param {string} sectionType - Section type
   * @param {Object} options - Options
   * @returns {Promise<Array>} Array of optimized chunks
   */
  async batchOptimize(chunks, sectionType = 'chapter', options = {}) {
    const optimizedChunks = [];
    const { concurrency = 3 } = options;
    
    // Process chunks in batches to avoid rate limits
    for (let i = 0; i < chunks.length; i += concurrency) {
      const batch = chunks.slice(i, i + concurrency);
      const batchPromises = batch.map(chunk => 
        this.optimizeForAudio(chunk, sectionType, options)
      );
      
      try {
        const batchResults = await Promise.all(batchPromises);
        optimizedChunks.push(...batchResults);
        
        // Add delay between batches to respect rate limits
        if (i + concurrency < chunks.length) {
          await this.delay(1000);
        }
      } catch (error) {
        console.error(`Batch optimization failed for chunks ${i}-${i + concurrency}:`, error);
        // Add fallback processing for failed chunks
        const fallbackResults = batch.map(chunk => 
          this.applyAudioFormatting(this.cleanMarkdownText(chunk), sectionType)
        );
        optimizedChunks.push(...fallbackResults);
      }
    }
    
    return optimizedChunks;
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
   * Validate text length for TTS processing
   * @param {string} text - Text to validate
   * @param {number} maxLength - Maximum character length
   * @returns {boolean} Whether text is within limits
   */
  validateTextLength(text, maxLength = 4000) {
    return text.length <= maxLength;
  }

  /**
   * Split text if it exceeds TTS limits
   * @param {string} text - Text to split
   * @param {number} maxLength - Maximum length per chunk
   * @returns {Array} Array of text chunks
   */
  splitTextForTTS(text, maxLength = 4000) {
    if (text.length <= maxLength) {
      return [text];
    }

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
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
   * Extract chapter headers from text before optimization
   * @param {string} text - Original text
   * @returns {Array} Array of extracted headers
   */
  extractChapterHeaders(text) {
    const headers = [];
    const headerRegex = /^#{1,6}\s+(.+)$/gm;
    let match;

    while ((match = headerRegex.exec(text)) !== null) {
      headers.push({
        original: match[0],
        title: match[1].trim(),
        level: match[0].match(/^#+/)[0].length
      });
    }

    // Also look for common chapter patterns
    const chapterPatterns = [
      /^(Chapter\s+\d+[:\-\s]*.*?)$/gmi,
      /^(Introduction)$/gmi,
      /^(Conclusion)$/gmi,
      /^(Summary)$/gmi,
      /^(Overview)$/gmi
    ];

    chapterPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const title = match[1].trim();
        // Avoid duplicates
        if (!headers.some(h => h.title.toLowerCase() === title.toLowerCase())) {
          headers.push({
            original: match[0],
            title: title,
            level: 1,
            isPattern: true
          });
        }
      }
    });

    console.log(`📋 Extracted ${headers.length} headers:`, headers.map(h => h.title));
    return headers;
  }

  /**
   * Verify headers are preserved and restore if missing
   * @param {string} optimizedText - AI-optimized text
   * @param {Array} originalHeaders - Original extracted headers
   * @returns {string} Text with verified/restored headers
   */
  verifyAndRestoreHeaders(optimizedText, originalHeaders) {
    if (!originalHeaders || originalHeaders.length === 0) {
      return optimizedText;
    }

    let verifiedText = optimizedText;
    const missingHeaders = [];

    // Check each original header
    originalHeaders.forEach(header => {
      const headerExists = this.checkHeaderExists(verifiedText, header.title);
      
      if (!headerExists) {
        missingHeaders.push(header);
        console.warn(`⚠️  Missing header after optimization: "${header.title}"`);
      }
    });

    // Restore missing headers
    if (missingHeaders.length > 0) {
      console.log(`🔧 Restoring ${missingHeaders.length} missing headers...`);
      verifiedText = this.restoreMissingHeaders(verifiedText, missingHeaders, originalHeaders);
    }

    return verifiedText;
  }

  /**
   * Check if a header exists in the text
   * @param {string} text - Text to search
   * @param {string} headerTitle - Header title to find
   * @returns {boolean} Whether header exists
   */
  checkHeaderExists(text, headerTitle) {
    // Check for exact title match (case insensitive)
    const exactMatch = new RegExp(`\\b${this.escapeRegex(headerTitle)}\\b`, 'i');
    if (exactMatch.test(text)) {
      return true;
    }

    // Check for partial matches for chapter numbers
    if (headerTitle.toLowerCase().includes('chapter')) {
      const chapterMatch = /chapter\s+(\d+)/i.exec(headerTitle);
      if (chapterMatch) {
        const chapterNum = chapterMatch[1];
        const chapterPattern = new RegExp(`chapter\\s+${chapterNum}`, 'i');
        if (chapterPattern.test(text)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Restore missing headers to the text
   * @param {string} text - Text to restore headers to
   * @param {Array} missingHeaders - Headers that need to be restored
   * @param {Array} allHeaders - All original headers for context
   * @returns {string} Text with restored headers
   */
  restoreMissingHeaders(text, missingHeaders, allHeaders) {
    let restoredText = text;

    // For each missing header, try to find the best insertion point
    missingHeaders.forEach(header => {
      const insertionPoint = this.findHeaderInsertionPoint(restoredText, header, allHeaders);
      
      if (insertionPoint !== -1) {
        // Insert the header at the found position
        const beforeText = restoredText.substring(0, insertionPoint);
        const afterText = restoredText.substring(insertionPoint);
        
        // Add proper spacing
        const headerText = `${header.title}\n\n`;
        restoredText = beforeText + headerText + afterText;
        
        console.log(`✅ Restored header: "${header.title}"`);
      } else {
        console.warn(`❌ Could not find insertion point for header: "${header.title}"`);
      }
    });

    return restoredText;
  }

  /**
   * Find the best insertion point for a missing header
   * @param {string} text - Text to search
   * @param {Object} header - Header to insert
   * @param {Array} allHeaders - All original headers
   * @returns {number} Insertion point index, -1 if not found
   */
  findHeaderInsertionPoint(text, header, allHeaders) {
    // Find the index of this header in the original list
    const headerIndex = allHeaders.findIndex(h => h.title === header.title);
    
    if (headerIndex === -1) return -1;

    // Look for content that might belong to this section
    const lines = text.split('\n');
    
    // Try to find contextual clues based on header type
    if (header.title.toLowerCase().includes('introduction')) {
      // Introduction should be at the beginning
      return 0;
    }
    
    if (header.title.toLowerCase().includes('conclusion')) {
      // Conclusion should be near the end
      return Math.max(0, text.length - 100);
    }
    
    if (header.title.toLowerCase().includes('chapter')) {
      // For chapters, try to find content that might belong to this chapter
      const chapterMatch = /chapter\s+(\d+)/i.exec(header.title);
      if (chapterMatch) {
        const chapterNum = parseInt(chapterMatch[1]);
        
        // Look for references to this chapter number in the text
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].toLowerCase();
          if (line.includes(`chapter ${chapterNum}`) || 
              line.includes(`${chapterNum}.`) ||
              line.includes(`${chapterNum}:`)) {
            return text.indexOf(lines[i]);
          }
        }
      }
    }

    // Default: insert at the beginning of a paragraph that seems relevant
    return 0;
  }

  /**
   * Escape special regex characters
   * @param {string} string - String to escape
   * @returns {string} Escaped string
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Apply content-aware SSML formatting with strategic breaks and emphasis
   * @param {string} text - Escaped text
   * @param {string} sectionType - Section type
   * @param {Object} ssmlConfig - SSML configuration
   * @returns {string} Formatted SSML content
   */
  applyContentAwareSSML(text, sectionType, ssmlConfig = {}) {
    let formattedText = text;

    // Apply section-specific formatting
    switch (sectionType) {
      case 'introduction':
        formattedText = this.formatIntroductionSSML(formattedText, ssmlConfig);
        break;
      case 'chapter':
        formattedText = this.formatChapterSSML(formattedText, ssmlConfig);
        break;
      case 'conclusion':
        formattedText = this.formatConclusionSSML(formattedText, ssmlConfig);
        break;
      default:
        formattedText = this.formatDefaultSSML(formattedText, ssmlConfig);
    }

    // Apply emphasis to key terms and concepts
    formattedText = this.addKeyTermEmphasis(formattedText, ssmlConfig);
    
    // Add strategic paragraph breaks (minimal, only between major concepts)
    formattedText = this.addStrategicBreaks(formattedText);

    return formattedText;
  }

  /**
   * Format introduction with welcoming tone and slower pace
   * @param {string} text - Text to format
   * @param {Object} ssmlConfig - SSML configuration
   * @returns {string} Formatted introduction
   */
  formatIntroductionSSML(text, ssmlConfig) {
    const settings = ssmlConfig.sectionSettings?.introduction || {};
    const rate = settings.rate || '0.95';
    
    // Wrap introduction in prosody for welcoming tone
    return `<prosody rate="${rate}" pitch="medium">
${text}
</prosody>`;
  }

  /**
   * Format chapter with balanced pace and emphasis
   * @param {string} text - Text to format
   * @param {Object} ssmlConfig - SSML configuration
   * @returns {string} Formatted chapter
   */
  formatChapterSSML(text, ssmlConfig) {
    const settings = ssmlConfig.sectionSettings?.chapter || {};
    const rate = settings.rate || '1.0';
    
    // Apply balanced formatting for chapters
    return `<prosody rate="${rate}" pitch="medium">
${text}
</prosody>`;
  }

  /**
   * Format conclusion with authoritative, inspiring tone
   * @param {string} text - Text to format
   * @param {Object} ssmlConfig - SSML configuration
   * @returns {string} Formatted conclusion
   */
  formatConclusionSSML(text, ssmlConfig) {
    const settings = ssmlConfig.sectionSettings?.conclusion || {};
    const rate = settings.rate || '0.98';
    
    // Slightly slower and more emphatic for conclusions
    return `<prosody rate="${rate}" pitch="medium">
${text}
</prosody>`;
  }

  /**
   * Format default content with standard settings
   * @param {string} text - Text to format
   * @param {Object} ssmlConfig - SSML configuration
   * @returns {string} Formatted content
   */
  formatDefaultSSML(text, ssmlConfig) {
    const rate = ssmlConfig.baseSettings?.rate || '1.0';
    
    return `<prosody rate="${rate}" pitch="medium">
${text}
</prosody>`;
  }

  /**
   * Add emphasis to key terms and concepts
   * @param {string} text - Text to process
   * @param {Object} ssmlConfig - SSML configuration
   * @returns {string} Text with emphasis added
   */
  addKeyTermEmphasis(text, ssmlConfig) {
    const emphasisSettings = ssmlConfig.emphasisSettings?.keyTerms || {};
    const emphasisLevel = emphasisSettings.level || 'moderate';

    // Key financial and business terms that should be emphasized
    const keyTerms = [
      'assets', 'liabilities', 'cash flow', 'passive income', 'financial freedom',
      'investment', 'entrepreneur', 'mindset', 'wealth building', 'financial education',
      'rich dad', 'poor dad', 'financial literacy', 'money management', 'business owner',
      'employee', 'self-employed', 'investor', 'quadrant', 'leverage'
    ];

    let processedText = text;

    // Add emphasis to key terms (but not too many to avoid over-emphasis)
    keyTerms.forEach(term => {
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      processedText = processedText.replace(regex, (match) => {
        // Only emphasize if not already in SSML tags
        if (processedText.indexOf(`<emphasis`) > -1 && 
            processedText.indexOf(match) > processedText.lastIndexOf(`<emphasis`)) {
          return match; // Already emphasized
        }
        return `<emphasis level="${emphasisLevel}">${match}</emphasis>`;
      });
    });

    return processedText;
  }

  /**
   * Add strategic breaks only between major concepts/paragraphs
   * @param {string} text - Text to process
   * @returns {string} Text with strategic breaks
   */
  addStrategicBreaks(text) {
    // Only add breaks between paragraphs (double newlines) and after major statements
    let processedText = text;

    // Add breaks between paragraphs (major concept transitions)
    processedText = processedText.replace(/\n\n+/g, '\n<break time="1.2s"/>\n');
    
    // Add strategic breaks after key statements (but minimal)
    const keyStatementPatterns = [
      /(\. This is (?:the )?(?:key|important|crucial|fundamental))/gi,
      /(\. (?:Remember|Understand|The point is))/gi,
      /(\. Here's (?:the|what|why))/gi
    ];

    keyStatementPatterns.forEach(pattern => {
      processedText = processedText.replace(pattern, '$1<break time="0.8s"/>');
    });

    return processedText;
  }

  /**
   * Build complete SSML document with proper structure
   * @param {string} content - Formatted SSML content
   * @param {Object} sectionSettings - Section-specific settings
   * @returns {string} Complete SSML document
   */
  buildSSMLDocument(content, sectionSettings) {
    const pauseAfter = sectionSettings.pauseAfter || '1.0s';
    
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
${content}
<break time="${pauseAfter}"/>
</speak>`;
  }

  /**
   * Validate SSML structure and syntax
   * @param {string} ssml - SSML to validate
   * @returns {boolean} Whether SSML is valid
   */
  validateSSML(ssml) {
    try {
      // Basic validation checks
      if (!ssml.includes('<speak') || !ssml.includes('</speak>')) {
        return false;
      }

      // Check for balanced tags
      const openTags = (ssml.match(/<[^/][^>]*>/g) || []).length;
      const closeTags = (ssml.match(/<\/[^>]*>/g) || []).length;
      const selfClosingTags = (ssml.match(/<[^>]*\/>/g) || []).length;
      
      // Should have balanced tags (accounting for self-closing tags)
      if (openTags - selfClosingTags !== closeTags) {
        console.warn('SSML validation failed: unbalanced tags');
        return false;
      }

      // Check for invalid characters that might cause TTS to speak the tags
      if (ssml.includes('&lt;') || ssml.includes('&gt;')) {
        console.warn('SSML validation failed: double-escaped characters');
        return false;
      }

      return true;

    } catch (error) {
      console.error('SSML validation error:', error);
      return false;
    }
  }
}

export default TextOptimizer;
