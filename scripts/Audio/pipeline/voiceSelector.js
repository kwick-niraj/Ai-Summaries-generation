import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { AzureVoiceSelector } from './providers/AzureVoiceSelector.js';
import { OllamaVoiceSelector } from './providers/OllamaVoiceSelector.js';
import { RuleBasedVoiceSelector } from './providers/RuleBasedVoiceSelector.js';
import { SmartVoiceSelector } from './providers/SmartVoiceSelector.js';
import { HybridVoiceSelector } from './providers/HybridVoiceSelector.js';

dotenv.config();

/**
 * Enhanced voice selection system with multiple provider support
 * Supports Azure OpenAI, Ollama, and rule-based selection with fallbacks
 */
export class VoiceSelector {
  constructor(config = {}) {
    this.config = {
      provider: 'hybrid',
      fallbackProvider: 'smart',
      azure: {
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        apiKey: process.env.AZURE_OPENAI_KEY,
        deploymentId: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT_ID,
        apiVersion: '2024-02-15-preview'
      },
      ollama: {
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'llama3.1:latest',
        timeout: 30000
      },
      ...config
    };

    // Initialize providers
    this.providers = {
      azure: new AzureVoiceSelector(this.config.azure),
      ollama: new OllamaVoiceSelector(this.config.ollama),
      'rule-based': new RuleBasedVoiceSelector(),
      'smart': new SmartVoiceSelector(),
      'hybrid': new HybridVoiceSelector({
        ollama: this.config.ollama,
        smart: {}
      })
    };

    // Cache for provider availability
    this.providerAvailability = {};
  }

  /**
   * Select optimal voice for a book based on metadata
   * @param {string} bookId - Book identifier
   * @param {string} metadataPath - Path to book metadata directory
   * @returns {Promise<Object>} Voice selection result
   */
  async selectVoiceForBook(bookId, metadataPath = '../Meta of All Books DB') {
    try {
      // Load book metadata
      const metadata = await this.loadBookMetadata(bookId, metadataPath);
      
      if (!metadata) {
        console.warn(`⚠️  No metadata found for book ${bookId}, using fallback`);
        return await this.getFallbackVoiceConfig(bookId);
      }

      // Try primary provider
      const primaryProvider = this.config.provider;
      let result = await this.tryProvider(primaryProvider, metadata, bookId);
      
      if (result) {
        return this.enhanceResult(result, metadata, bookId);
      }

      // Try fallback provider
      const fallbackProvider = this.config.fallbackProvider;
      if (fallbackProvider !== primaryProvider) {
        console.warn(`⚠️  Primary provider '${primaryProvider}' failed, trying fallback '${fallbackProvider}'`);
        result = await this.tryProvider(fallbackProvider, metadata, bookId);
        
        if (result) {
          return this.enhanceResult(result, metadata, bookId);
        }
      }

      // Ultimate fallback - rule-based
      if (fallbackProvider !== 'rule-based') {
        console.warn(`⚠️  All configured providers failed, using rule-based fallback`);
        result = await this.tryProvider('rule-based', metadata, bookId);
        
        if (result) {
          return this.enhanceResult(result, metadata, bookId);
        }
      }

      // If everything fails, return default
      console.error(`❌ All voice selection methods failed for book ${bookId}`);
      return await this.getFallbackVoiceConfig(bookId);

    } catch (error) {
      console.error(`❌ Voice selection failed for book ${bookId}:`, error);
      return await this.getFallbackVoiceConfig(bookId);
    }
  }

  /**
   * Try a specific provider for voice selection
   * @param {string} providerName - Provider name
   * @param {Object} metadata - Book metadata
   * @param {string} bookId - Book identifier
   * @returns {Promise<Object|null>} Selection result or null if failed
   */
  async tryProvider(providerName, metadata, bookId) {
    try {
      const provider = this.providers[providerName];
      if (!provider) {
        console.warn(`Unknown provider: ${providerName}`);
        return null;
      }

      // Check if provider is available (with caching)
      const isAvailable = await this.checkProviderAvailability(providerName);
      if (!isAvailable) {
        console.warn(`Provider '${providerName}' is not available`);
        return null;
      }

      // Attempt voice selection
      const result = await provider.selectVoice(metadata);
      
      if (result && result.selectedVoice) {
        console.log(`✅ Niraj Voice selected by ${providerName}: ${result.selectedVoice} (${result.confidence}% confidence)`);
        return result;
      }

      return null;

    } catch (error) {
      console.warn(`Provider '${providerName}' failed:`, error.message);
      return null;
    }
  }

  /**
   * Check if a provider is available (with caching)
   * @param {string} providerName - Provider name
   * @returns {Promise<boolean>} Whether provider is available
   */
  async checkProviderAvailability(providerName) {
    // Check cache first (valid for 5 minutes)
    const cacheKey = providerName;
    const cached = this.providerAvailability[cacheKey];
    
    if (cached && (Date.now() - cached.timestamp) < 300000) {
      return cached.available;
    }

    // Check provider availability
    try {
      const provider = this.providers[providerName];
      const available = await provider.isAvailable();
      
      // Cache result
      this.providerAvailability[cacheKey] = {
        available,
        timestamp: Date.now()
      };
      
      return available;
    } catch (error) {
      console.warn(`Failed to check availability for provider '${providerName}':`, error.message);
      return false;
    }
  }

  /**
   * Enhance the result with additional information
   * @param {Object} result - Provider result
   * @param {Object} metadata - Book metadata
   * @param {string} bookId - Book identifier
   * @returns {Object} Enhanced result
   */
  enhanceResult(result, metadata, bookId) {
    const voices = this.providers['rule-based'].getVoiceCharacteristics();
    const voiceCharacteristics = voices[result.selectedVoice] || voices.nova;
    
    return {
      bookId,
      selectedVoice: result.selectedVoice,
      voiceCharacteristics,
      confidence: result.confidence,
      reasoning: result.reasoning,
      provider: result.provider,
      timestamp: result.timestamp,
      ssmlConfig: this.generateSSMLConfig(result.selectedVoice, metadata),
      analysis: this.analyzeBookForSSML(metadata)
    };
  }

  /**
   * Generate SSML configuration for selected voice
   * @param {string} voiceName - Selected voice name
   * @param {Object} metadata - Book metadata
   * @returns {Object} SSML configuration
   */
  generateSSMLConfig(voiceName, metadata) {
    const voices = this.providers['rule-based'].getVoiceCharacteristics();
    const voiceData = voices[voiceName] || voices.nova;
    
    return {
      voice: voiceName,
      baseSettings: {
        rate: this.getOptimalRate(voiceData, metadata),
        pitch: 'medium'
      },
      sectionSettings: {
        introduction: {
          rate: '1',
          emphasis: 'moderate',
          pauseAfter: '1.5s'
        },
        chapter: {
          rate: '1.0',
          emphasis: 'moderate',
          pauseAfter: '1.0s'
        },
        conclusion: {
          rate: '1',
          emphasis: 'strong',
          pauseAfter: '2.0s'
        }
      },
      emphasisSettings: {
        keyTerms: {
          level: 'moderate',
          pauseAfter: '0.3s'
        },
        quotes: {
          rate: '0.98',
          emphasis: 'moderate'
        }
      }
    };
  }

  /**
   * Get optimal speech rate for voice and content
   * @param {Object} voiceData - Voice characteristics
   * @param {Object} metadata - Book metadata
   * @returns {string} Rate setting
   */
  getOptimalRate(voiceData, metadata) {
    // Adjust rate based on content complexity and voice characteristics
    const genres = Array.isArray(metadata.genre) ? metadata.genre : [metadata.genre || ''];
    const isComplex = genres.some(g => 
      ['philosophy', 'science', 'academic', 'technical'].includes(g?.toLowerCase())
    );
    
    if (isComplex) return '0.95';
    if (voiceData.tone === 'deep') return '0.95';
    if (voiceData.style === 'young') return '1.05';
    return '1.0';
  }

  /**
   * Analyze book for SSML generation
   * @param {Object} metadata - Book metadata
   * @returns {Object} Analysis for SSML
   */
  analyzeBookForSSML(metadata) {
    return {
      complexity: this.inferComplexity(metadata),
      tone: this.inferTone(metadata),
      pacing: this.inferPacing(metadata)
    };
  }

  /**
   * Infer content complexity
   * @param {Object} metadata - Book metadata
   * @returns {string} Complexity level
   */
  inferComplexity(metadata) {
    const genres = Array.isArray(metadata.genre) ? metadata.genre : [metadata.genre || ''];
    const isComplex = genres.some(g => 
      ['philosophy', 'science', 'academic', 'technical', 'psychology'].includes(g?.toLowerCase())
    );
    return isComplex ? 'high' : 'medium';
  }

  /**
   * Infer content tone
   * @param {Object} metadata - Book metadata
   * @returns {string} Tone
   */
  inferTone(metadata) {
    const title = (metadata.title || '').toLowerCase();
    if (title.includes('rich') || title.includes('wealth')) return 'authoritative';
    if (title.includes('mindful') || title.includes('zen')) return 'calm';
    return 'balanced';
  }

  /**
   * Infer optimal pacing
   * @param {Object} metadata - Book metadata
   * @returns {string} Pacing
   */
  inferPacing(metadata) {
    const genres = Array.isArray(metadata.genre) ? metadata.genre : [metadata.genre || ''];
    const isNarrative = genres.some(g => 
      ['biography', 'memoir', 'story'].includes(g?.toLowerCase())
    );
    return isNarrative ? 'varied' : 'steady';
  }

  /**
   * Load book metadata from JSON file
   * @param {string} bookId - Book identifier
   * @param {string} metadataPath - Path to metadata directory
   * @returns {Promise<Object>} Book metadata
   */
  async loadBookMetadata(bookId, metadataPath) {
    try {
      const metadataFile = path.join(metadataPath, `${bookId}.json`);
      
      if (!fs.existsSync(metadataFile)) {
        return null;
      }

      const rawData = fs.readFileSync(metadataFile, 'utf8');
      const metadata = JSON.parse(rawData);
      
      // Handle array format (some metadata files contain arrays)
      return Array.isArray(metadata) ? metadata[0] : metadata;

    } catch (error) {
      console.error(`Failed to load metadata for book ${bookId}:`, error);
      return null;
    }
  }

  /**
   * Get fallback voice configuration
   * @param {string} bookId - Book identifier
   * @returns {Promise<Object>} Fallback configuration
   */
  async getFallbackVoiceConfig(bookId = 'unknown') {
    const voices = this.providers['rule-based'].getVoiceCharacteristics();
    
    return {
      bookId,
      selectedVoice: 'nova',
      voiceCharacteristics: voices.nova,
      confidence: 60,
      reasoning: 'Fallback selection - no metadata or all providers failed',
      provider: 'fallback',
      timestamp: new Date().toISOString(),
      ssmlConfig: {
        voice: 'nova',
        baseSettings: { rate: '1.0', pitch: 'medium' },
        sectionSettings: {
          introduction: { rate: '0.95', emphasis: 'moderate', pauseAfter: '1.5s' },
          chapter: { rate: '1.0', emphasis: 'moderate', pauseAfter: '1.0s' },
          conclusion: { rate: '0.98', emphasis: 'strong', pauseAfter: '2.0s' }
        },
        emphasisSettings: {
          keyTerms: { level: 'moderate', pauseAfter: '0.3s' },
          quotes: { rate: '0.98', emphasis: 'moderate' }
        }
      },
      analysis: {
        complexity: 'medium',
        tone: 'balanced',
        pacing: 'steady'
      }
    };
  }

  /**
   * Batch select voices for multiple books
   * @param {Array} bookIds - Array of book identifiers
   * @param {string} metadataPath - Path to metadata directory
   * @returns {Promise<Object>} Batch selection results
   */
  async batchSelectVoices(bookIds, metadataPath = '../Meta of All Books DB') {
    const results = {};
    const errors = [];

    console.log(`🎤 Selecting voices for ${bookIds.length} books using ${this.config.provider} provider...`);

    for (const bookId of bookIds) {
      try {
        results[bookId] = await this.selectVoiceForBook(bookId, metadataPath);
      } catch (error) {
        console.error(`Voice selection failed for book ${bookId}:`, error);
        errors.push({ bookId, error: error.message });
        results[bookId] = await this.getFallbackVoiceConfig(bookId);
      }
    }

    return {
      results,
      errors,
      summary: {
        total: bookIds.length,
        successful: Object.keys(results).length - errors.length,
        failed: errors.length,
        primaryProvider: this.config.provider,
        fallbackProvider: this.config.fallbackProvider
      }
    };
  }

  /**
   * Get provider status and configuration
   * @returns {Promise<Object>} Provider status
   */
  async getProviderStatus() {
    const status = {};
    
    for (const [name, provider] of Object.entries(this.providers)) {
      try {
        const available = await provider.isAvailable();
        const validation = provider.validateConfig();
        
        status[name] = {
          available,
          validation,
          name: provider.getName()
        };
      } catch (error) {
        status[name] = {
          available: false,
          error: error.message,
          name: provider.getName()
        };
      }
    }
    
    return {
      current: this.config.provider,
      fallback: this.config.fallbackProvider,
      providers: status
    };
  }

  /**
   * Switch to a different provider
   * @param {string} providerName - New provider name
   * @param {string} fallbackProvider - New fallback provider
   */
  switchProvider(providerName, fallbackProvider = 'rule-based') {
    if (!this.providers[providerName]) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    
    this.config.provider = providerName;
    this.config.fallbackProvider = fallbackProvider;
    
    // Clear availability cache
    this.providerAvailability = {};
    
    console.log(`🔄 Switched to provider: ${providerName} (fallback: ${fallbackProvider})`);
  }
}

export default VoiceSelector;
