import { AzureSpeechTTSProvider } from './AzureSpeechTTSProvider.js';
import { AzureOpenAITTSProvider } from './AzureOpenAITTSProvider.js';

/**
 * TTS Provider Factory
 * Manages multiple TTS providers with fallback support
 */
export class TTSProviderFactory {
  constructor(config = {}) {
    this.config = config;
    this.providers = new Map();
    this.primaryProvider = config.tts?.provider || 'azure-speech';
    this.fallbackProvider = config.tts?.fallbackProvider || 'azure-openai';
    
    // Initialize providers
    this.initializeProviders();
  }

  /**
   * Initialize all available TTS providers
   */
  initializeProviders() {
    try {

      // Initialize Azure Speech Services provider
      if (this.config.tts?.azureSpeech) {
        const azureSpeechProvider = new AzureSpeechTTSProvider(this.config.tts.azureSpeech);
        this.providers.set('azure-speech', azureSpeechProvider);
        console.log('✅ Azure Speech Services provider initialized');
      } else {
        console.warn('⚠️  Azure Speech configuration not found in config.tts.azureSpeech');
      }

      // Initialize Azure OpenAI provider (legacy/fallback)
      // if (this.config.tts?.azureOpenAI) {
      //   const azureOpenAIProvider = new AzureOpenAITTSProvider(this.config.tts.azureOpenAI);
      //   this.providers.set('azure-openai', azureOpenAIProvider);
      //   console.log('✅ Azure OpenAI TTS provider initialized (fallback)');
      // } else {
      //   console.warn('⚠️  Azure OpenAI configuration not found in config.tts.azureOpenAI');
      // }

      console.log(`🔧 TTS Factory: ${this.providers.size} providers available`);
      console.log(`🎯 Primary: ${this.primaryProvider}, Fallback: ${this.fallbackProvider}`);

      if (this.providers.size === 0) {
        throw new Error('No TTS providers could be initialized. Check your configuration.');
      }

    } catch (error) {
      console.error('❌ Failed to initialize TTS providers:', error.message);
      throw error;
    }
  }

  /**
   * Get the appropriate TTS provider
   * @param {string} providerName - Specific provider name (optional)
   * @returns {Object} TTS provider instance
   */
  getProvider(providerName = null) {
    const targetProvider = providerName || this.primaryProvider;
    
    if (this.providers.has(targetProvider)) {
      return this.providers.get(targetProvider);
    }

    // Try fallback provider
    if (this.providers.has(this.fallbackProvider)) {
      console.warn(`⚠️  Primary provider '${targetProvider}' not available, using fallback: ${this.fallbackProvider}`);
      return this.providers.get(this.fallbackProvider);
    }

    throw new Error(`No TTS providers available. Tried: ${targetProvider}, ${this.fallbackProvider}`);
  }

  /**
   * Generate TTS audio with automatic provider fallback
   * @param {string} text - Text or SSML to convert to speech
   * @param {string} outputPath - Path to save the audio file
   * @param {Object} options - TTS options
   * @returns {Promise<Object>} Generation result
   */
  async generateTTS(text, outputPath, options = {}) {
    const requestedProvider = options.provider || this.primaryProvider;
    
    try {
      // Try primary provider first
      const provider = this.getProvider(requestedProvider);
      const result = await provider.generateTTS(text, outputPath, options);
      
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || 'TTS generation failed');
      }
      
    } catch (error) {
      console.warn(`⚠️  ${requestedProvider} provider failed: ${error.message}`);
      
      // Try fallback provider if different from primary
      if (requestedProvider !== this.fallbackProvider && this.providers.has(this.fallbackProvider)) {
        console.log(`🔄 Attempting fallback to ${this.fallbackProvider}...`);
        
        try {
          const fallbackProvider = this.providers.get(this.fallbackProvider);
          const fallbackResult = await fallbackProvider.generateTTS(text, outputPath, {
            ...options,
            provider: this.fallbackProvider
          });
          
          if (fallbackResult.success) {
            console.log(`✅ Fallback successful with ${this.fallbackProvider}`);
            return {
              ...fallbackResult,
              usedFallback: true,
              originalProvider: requestedProvider
            };
          }
        } catch (fallbackError) {
          console.error(`❌ Fallback provider also failed: ${fallbackError.message}`);
        }
      }
      
      // Both providers failed
      return {
        success: false,
        error: `All TTS providers failed. Primary: ${error.message}`,
        outputPath,
        provider: requestedProvider
      };
    }
  }

  /**
   * Test all available providers
   * @param {string} testText - Text to use for testing
   * @returns {Promise<Object>} Test results for all providers
   */
  async testAllProviders(testText = 'Hello, this is a test of the TTS provider.') {
    const results = {};
    
    for (const [providerName, provider] of this.providers) {
      console.log(`🧪 Testing ${providerName} provider...`);
      
      try {
        if (provider.testVoice) {
          // Use provider's test method if available
          const testResult = await provider.testVoice('default', testText);
          results[providerName] = testResult;
        } else {
          // Fallback to basic TTS test
          const tempPath = `./Audio/temp/test_${providerName}_${Date.now()}.mp3`;
          const result = await provider.generateTTS(testText, tempPath);
          
          results[providerName] = {
            success: result.success,
            error: result.error,
            provider: providerName
          };
          
          // Clean up temp file
          const fs = await import('fs');
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        }
      } catch (error) {
        results[providerName] = {
          success: false,
          error: error.message,
          provider: providerName
        };
      }
    }
    
    return results;
  }

  /**
   * Get provider capabilities and information
   * @returns {Object} Information about all providers
   */
  getProviderInfo() {
    const info = {
      primary: this.primaryProvider,
      fallback: this.fallbackProvider,
      available: [],
      total: this.providers.size
    };
    
    for (const [providerName, provider] of this.providers) {
      const providerInfo = provider.getProviderInfo ? provider.getProviderInfo() : {
        name: providerName,
        type: providerName
      };
      
      info.available.push({
        name: providerName,
        ...providerInfo
      });
    }
    
    return info;
  }

  /**
   * Switch primary provider
   * @param {string} newPrimaryProvider - New primary provider name
   */
  setPrimaryProvider(newPrimaryProvider) {
    if (this.providers.has(newPrimaryProvider)) {
      this.primaryProvider = newPrimaryProvider;
      console.log(`🔄 Primary TTS provider switched to: ${newPrimaryProvider}`);
    } else {
      throw new Error(`Provider '${newPrimaryProvider}' is not available`);
    }
  }

  /**
   * Get available voices from all providers
   * @returns {Object} Voices grouped by provider
   */
  getAllAvailableVoices() {
    const voices = {};
    
    for (const [providerName, provider] of this.providers) {
      if (provider.getAvailableVoices) {
        voices[providerName] = provider.getAvailableVoices();
      }
    }
    
    return voices;
  }

  /**
   * Analyze content and get optimal provider and voice
   * @param {string} text - Content to analyze
   * @param {string} sectionType - Section type
   * @returns {Object} Recommendations
   */
  analyzeContentForOptimalProvider(text, sectionType = 'chapter') {
    // For now, prefer Azure Speech for its advanced SSML capabilities
    const primaryProvider = this.getProvider(this.primaryProvider);
    
    if (primaryProvider.analyzeContentForVoice) {
      const analysis = primaryProvider.analyzeContentForVoice(text, sectionType);
      return {
        provider: this.primaryProvider,
        ...analysis
      };
    }
    
    // Fallback to basic recommendation
    return {
      provider: this.primaryProvider,
      voice: 'andrew-multilingual',
      style: 'conversational',
      confidence: 0.5,
      reasoning: 'Default recommendation'
    };
  }
}


export default TTSProviderFactory;
