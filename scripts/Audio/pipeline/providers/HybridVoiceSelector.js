import { VoiceSelectionProvider } from './VoiceSelectionProvider.js';
import { OllamaVoiceSelector } from './OllamaVoiceSelector.js';
import { SmartVoiceSelector } from './SmartVoiceSelector.js';

/**
 * Hybrid voice selection provider that combines:
 * - Ollama for gender detection (LLM-powered)
 * - SmartVoiceSelector for final voice selection (sophisticated scoring)
 */
export class HybridVoiceSelector extends VoiceSelectionProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'hybrid';
    
    // Initialize sub-providers
    this.ollamaProvider = new OllamaVoiceSelector(config.ollama || {});
    this.smartProvider = new SmartVoiceSelector(config.smart || {});
    
    // Configuration
    this.useOllamaForGender = config.useOllamaForGender !== false; // Default true
    this.fallbackToSmartGender = config.fallbackToSmartGender !== false; // Default true
  }

  /**
   * Check if hybrid provider is available
   * SmartVoiceSelector is always available, Ollama is optional
   * @returns {Promise<boolean>} Whether provider is available
   */
  async isAvailable() {
    // SmartVoiceSelector is always available
    const smartAvailable = await this.smartProvider.isAvailable();
    
    if (!smartAvailable) {
      console.warn('SmartVoiceSelector is not available');
      return false;
    }

    // Ollama availability is checked but not required
    if (this.useOllamaForGender) {
      const ollamaAvailable = await this.ollamaProvider.isAvailable();
      if (!ollamaAvailable) {
        console.log('📋 Ollama not available, will use SmartVoiceSelector for gender detection');
      }
    }

    return true;
  }

  /**
   * Validate hybrid configuration
   * @returns {Object} Validation result
   */
  validateConfig() {
    const errors = [];
    const warnings = [];

    // Validate SmartVoiceSelector (required)
    const smartValidation = this.smartProvider.validateConfig();
    if (!smartValidation.valid) {
      errors.push(...smartValidation.errors.map(e => `SmartVoiceSelector: ${e}`));
    }
    warnings.push(...smartValidation.warnings.map(w => `SmartVoiceSelector: ${w}`));

    // Validate OllamaVoiceSelector (optional)
    if (this.useOllamaForGender) {
      const ollamaValidation = this.ollamaProvider.validateConfig();
      if (!ollamaValidation.valid) {
        warnings.push(...ollamaValidation.errors.map(e => `Ollama (optional): ${e}`));
      }
      warnings.push(...ollamaValidation.warnings.map(w => `Ollama: ${w}`));
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Detect author gender using Ollama (with SmartVoiceSelector fallback)
   * @param {Object} metadata - Book metadata
   * @returns {Promise<string>} Author gender: 'male', 'female', or 'unknown'
   */
  async detectAuthorGender(metadata) {
    // Try Ollama first if enabled and available
    if (this.useOllamaForGender) {
      try {
        const ollamaAvailable = await this.ollamaProvider.isAvailable();
        if (ollamaAvailable) {
          console.log(`🦙 Using Ollama for gender detection: ${metadata.author}`);
          const gender = await this.ollamaProvider.detectAuthorGender(metadata);
          
          if (gender && gender !== 'unknown') {
            console.log(`✅ Ollama detected gender: ${gender}`);
            return gender;
          }
          
          console.log(`⚠️ Ollama returned unknown gender, falling back to SmartVoiceSelector`);
        }
      } catch (error) {
        console.warn(`Ollama gender detection failed: ${error.message}`);
      }
    }

    // Fallback to SmartVoiceSelector's gender detection
    if (this.fallbackToSmartGender) {
      console.log(`🧠 Using SmartVoiceSelector for gender detection: ${metadata.author}`);
      const gender = this.smartProvider.detectAuthorGender(metadata.author);
      console.log(`✅ SmartVoiceSelector detected gender: ${gender}`);
      return gender;
    }

    return 'unknown';
  }

  /**
   * Select optimal voice using hybrid approach
   * @param {Object} metadata - Book metadata
   * @returns {Promise<Object>} Voice selection result
   */
  async selectVoice(metadata) {
    try {
      console.log(`🔀 Using Hybrid voice selection: "${metadata.title}"`);
      
      // Step 1: Detect author gender (Ollama + SmartVoiceSelector fallback)
      const detectedGender = await this.detectAuthorGender(metadata);
      
      // Step 2: Create enhanced metadata with detected gender
      const enhancedMetadata = {
        ...metadata,
        detectedGender: detectedGender
      };

      // Step 3: Use SmartVoiceSelector's analysis and selection logic
      const analysis = this.smartProvider.analyzeBookCharacteristics(enhancedMetadata);
      
      // Override the gender in analysis with our detected gender
      analysis.authorGender = detectedGender;
      
      // Step 4: Select optimal voice using SmartVoiceSelector's algorithm
      const selectedVoice = this.smartProvider.selectOptimalVoice(analysis, enhancedMetadata);
      
      // Step 5: Format result with hybrid provider information
      const result = this.formatResult(
        selectedVoice.name,
        metadata,
        selectedVoice.confidence,
        `Hybrid: ${selectedVoice.reasoning} (Gender: ${detectedGender})`
      );

      // Add hybrid-specific information
      result.genderDetectionMethod = this.getGenderDetectionMethod(detectedGender);
      result.analysis = analysis;
      result.selectedVoiceCharacteristics = selectedVoice.characteristics;

      console.log(`🎤 Hybrid selected voice: ${result.selectedVoice} (${result.confidence}% confidence)`);
      console.log(`👤 Gender detection: ${result.genderDetectionMethod}`);
      
      return result;

    } catch (error) {
      console.error('Hybrid voice selection failed:', error);
      
      // Ultimate fallback - use SmartVoiceSelector directly
      console.log('🔄 Falling back to SmartVoiceSelector...');
      const fallbackResult = await this.smartProvider.selectVoice(metadata);
      
      // Mark as fallback
      fallbackResult.reasoning = `Hybrid fallback: ${fallbackResult.reasoning}`;
      fallbackResult.genderDetectionMethod = 'SmartVoiceSelector (fallback)';
      
      return fallbackResult;
    }
  }

  /**
   * Determine which method was used for gender detection
   * @param {string} detectedGender - The detected gender
   * @returns {string} Method description
   */
  getGenderDetectionMethod(detectedGender) {
    if (!this.useOllamaForGender) {
      return 'SmartVoiceSelector (Ollama disabled)';
    }
    
    // This is a simplified check - in practice, we'd track this during detection
    return detectedGender !== 'unknown' ? 'Ollama LLM' : 'SmartVoiceSelector (fallback)';
  }

  /**
   * Get provider name
   * @returns {string} Provider name
   */
  getName() {
    return 'Hybrid Voice Selector (Ollama + Smart)';
  }

  /**
   * Get available models from Ollama (if available)
   * @returns {Promise<Array>} List of available models
   */
  async getAvailableModels() {
    if (this.useOllamaForGender) {
      try {
        return await this.ollamaProvider.getAvailableModels();
      } catch (error) {
        console.warn('Failed to get Ollama models:', error.message);
      }
    }
    return [];
  }

  /**
   * Pull a model in Ollama (if available)
   * @param {string} modelName - Model name to pull
   * @returns {Promise<boolean>} Whether pull was successful
   */
  async pullModel(modelName = null) {
    if (this.useOllamaForGender) {
      try {
        return await this.ollamaProvider.pullModel(modelName);
      } catch (error) {
        console.warn('Failed to pull Ollama model:', error.message);
      }
    }
    return false;
  }

  /**
   * Get provider status
   * @returns {Promise<Object>} Status information
   */
  async getProviderStatus() {
    const status = {
      name: this.getName(),
      available: await this.isAvailable(),
      components: {}
    };

    // SmartVoiceSelector status
    try {
      status.components.smart = {
        available: await this.smartProvider.isAvailable(),
        name: this.smartProvider.getName()
      };
    } catch (error) {
      status.components.smart = {
        available: false,
        error: error.message
      };
    }

    // Ollama status (if enabled)
    if (this.useOllamaForGender) {
      try {
        status.components.ollama = {
          available: await this.ollamaProvider.isAvailable(),
          name: this.ollamaProvider.getName(),
          validation: this.ollamaProvider.validateConfig()
        };
      } catch (error) {
        status.components.ollama = {
          available: false,
          error: error.message
        };
      }
    } else {
      status.components.ollama = {
        available: false,
        disabled: true,
        reason: 'Ollama disabled in configuration'
      };
    }

    return status;
  }

  /**
   * Configure Ollama usage
   * @param {boolean} enabled - Whether to use Ollama for gender detection
   */
  setOllamaEnabled(enabled) {
    this.useOllamaForGender = enabled;
    console.log(`🔧 Ollama gender detection ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get configuration summary
   * @returns {Object} Configuration summary
   */
  getConfigSummary() {
    return {
      provider: 'hybrid',
      genderDetection: {
        primary: this.useOllamaForGender ? 'Ollama LLM' : 'SmartVoiceSelector',
        fallback: this.fallbackToSmartGender ? 'SmartVoiceSelector' : 'none'
      },
      voiceSelection: 'SmartVoiceSelector algorithm',
      components: {
        ollama: {
          enabled: this.useOllamaForGender,
          endpoint: this.ollamaProvider.endpoint,
          model: this.ollamaProvider.model
        },
        smart: {
          enabled: true,
          defaultVoice: this.smartProvider.defaultVoice
        }
      }
    };
  }
}

export default HybridVoiceSelector;
