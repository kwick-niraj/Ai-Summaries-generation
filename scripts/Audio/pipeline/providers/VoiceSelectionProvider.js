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
      metadata,
    };
  }

  /**
   * Get available voices with their characteristics (Azure Speech compatible)
   * @returns {Object} Voice characteristics mapping
   */
  getVoiceCharacteristics() {
    return {
      'alloy-turbo-multilingual': {
      azureVoiceId: 'en-US-AlloyTurboMultilingualNeural',
      gender: 'female',
      tone: 'versatile',
      style: 'adaptive',
      personality: 'flexible',
      bestFor: ['general-purpose', 'chat', 'multilingual', 'educational']
    },
    'andrew-dragon-hd-latest': {
        azureVoiceId: 'en-US-AndrewDragonHDNeural',
        gender: 'male',
        tone: 'natural',
        style: 'authentic',
        personality: 'engaging',
        bestFor: ['chat', 'podcasts', 'audiobooks', 'general']
      },
      'andrew-multilingual': {
        azureVoiceId: 'en-US-AndrewMultilingualNeural',
        gender: 'male',
        tone: 'professional',
        style: 'authoritative',
        personality: 'confident',
        bestFor: ['business', 'professional', 'educational', 'leadership']
      },
      'brandon-multilingual': {
        azureVoiceId: 'en-US-BrandonMultilingualNeural',
        gender: 'male',
        tone: 'warm',
        style: 'friendly',
        personality: 'conversational',
        bestFor: ['storytelling', 'casual', 'self-help', 'personal-development']
      },
      'emma-multilingual': {
        azureVoiceId: 'en-US-EmmaMultilingualNeural',
        gender: 'female',
        tone: 'empathetic',
        style: 'warm',
        personality: 'caring',
        bestFor: ['emotional', 'wellness', 'mindfulness', 'healing']
      },
      'nova-turbo-multilingual': {
        azureVoiceId: 'en-US-NovaTurboMultilingualNeural',
        gender: 'female',
        tone: 'energetic',
        style: 'dynamic',
        personality: 'engaging',
        bestFor: ['motivational', 'dynamic', 'educational', 'popular']
      },
      'adam-multilingual': {
        azureVoiceId: 'en-US-AdamMultilingualNeural',
        gender: 'male',
        tone: 'deep',
        style: 'serious',
        personality: 'authoritative',
        bestFor: ['documentary', 'serious', 'biography', 'history']
      },
      'amanda-multilingual': {
        azureVoiceId: 'en-US-AmandaMultilingualNeural',
        gender: 'female',
        tone: 'professional',
        style: 'clear',
        personality: 'articulate',
        bestFor: ['business', 'educational', 'professional', 'corporate']
      },
      'steffan-multilingual': {
        azureVoiceId: 'en-US-SteffanMultilingualNeural',
        gender: 'male',
        tone: 'smooth',
        style: 'conversational',
        personality: 'narrator',
        bestFor: ['audiobooks', 'narration', 'storytelling', 'general']
      },
      'derek-multilingual': {
        azureVoiceId: 'en-US-DerekMultilingualNeural',
        gender: 'male',
        tone: 'confident',
        style: 'engaging',
        personality: 'presenter',
        bestFor: ['presentations', 'training', 'business', 'leadership']
      },
    };
  }

  /**
   * Map Azure OpenAI voice names to Azure Speech equivalents
   * @param {string} openAIVoice - Azure OpenAI voice name
   * @returns {string} Azure Speech voice name
   */
  mapToAzureSpeechVoice(openAIVoice) {
    const mapping = {
      'alloy': 'brandon-multilingual',      // Warm, conversational male
      'echo': 'emma-multilingual',          // Soft, gentle female  
      'fable': 'nova-turbo-multilingual',   // Playful, creative female
      'nova': 'aria',                       // Friendly, approachable female
      'onyx': 'adam-multilingual',          // Deep, serious male
      'shimmer': 'amanda-multilingual'      // Clear, professional female
    };
    
    return mapping[openAIVoice] || 'andrew-multilingual'; // Default fallback
  }
};
export default VoiceSelectionProvider;
