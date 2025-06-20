/**
 * Abstract base class for voice selection providers
 */
export class VoiceSelectionProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = 'base';
  }

  /**
   * Select optimal voice for a book based on metadata
   * @param {Object} metadata - Book metadata
   * @returns {Promise<Object>} Voice selection result
   */
  async selectVoice(metadata) {
    throw new Error('selectVoice method must be implemented by subclass');
  }

  /**
   * Check if the provider is available/configured
   * @returns {Promise<boolean>} Whether provider is available
   */
  async isAvailable() {
    return true;
  }

  /**
   * Get provider name
   * @returns {string} Provider name
   */
  getName() {
    return this.name;
  }

  /**
   * Validate provider configuration
   * @returns {Object} Validation result
   */
  validateConfig() {
    return {
      valid: true,
      errors: [],
      warnings: []
    };
  }

  /**
   * Normalize voice selection result format
   * @param {string} selectedVoice - Selected voice name
   * @param {Object} metadata - Book metadata
   * @param {number} confidence - Confidence score
   * @param {string} reasoning - Selection reasoning
   * @returns {Object} Normalized result
   */
  formatResult(selectedVoice, metadata, confidence = 70, reasoning = 'Provider selection') {
    return {
      selectedVoice,
      confidence,
      reasoning,
      provider: this.getName(),
      timestamp: new Date().toISOString(),
      metadata: {
        title: metadata.title,
        author: metadata.author,
        genre: metadata.genre
      }
    };
  }

  /**
   * Get available voices with their characteristics
   * @returns {Object} Voice characteristics mapping
   */
  getVoiceCharacteristics() {
    return {
      // Female Voices
      alloy: {
        gender: 'female',
        tone: 'warm',
        style: 'grounded',
        personality: 'conversational',
        bestFor: ['self-help', 'personal-development', 'wellness', 'general-audience']
      },
      coral: {
        gender: 'female',
        tone: 'bright',
        style: 'young',
        personality: 'emotional',
        bestFor: ['motivational', 'lifestyle', 'youth-oriented', 'inspirational']
      },
      echo: {
        gender: 'female',
        tone: 'soft',
        style: 'calm',
        personality: 'gentle',
        bestFor: ['mindfulness', 'wellness', 'spiritual', 'meditation', 'healing']
      },
      fable: {
        gender: 'female',
        tone: 'playful',
        style: 'storybook',
        personality: 'creative',
        bestFor: ['narrative', 'creative', 'storytelling', 'fiction-like']
      },
      nova: {
        gender: 'female',
        tone: 'friendly',
        style: 'expressive',
        personality: 'approachable',
        bestFor: ['general-audience', 'accessible', 'educational', 'popular']
      },
      shimmer: {
        gender: 'female',
        tone: 'clear',
        style: 'futuristic',
        personality: 'smooth',
        bestFor: ['technology', 'innovation', 'modern-business', 'science']
      },
      
      // Male Voices
      ash: {
        gender: 'male',
        tone: 'crisp',
        style: 'confident',
        personality: 'articulate',
        bestFor: ['business', 'leadership', 'professional', 'corporate', 'finance']
      },
      onyx: {
        gender: 'male',
        tone: 'deep',
        style: 'serious',
        personality: 'cinematic',
        bestFor: ['authoritative', 'biography', 'history', 'heavy-topics', 'dramatic']
      },
      sage: {
        gender: 'male',
        tone: 'mature',
        style: 'wise',
        personality: 'experienced',
        bestFor: ['philosophy', 'wisdom', 'academic', 'intellectual', 'mentorship']
      }
    };
  }
}

export default VoiceSelectionProvider;
