import axios from 'axios';
import dotenv from 'dotenv';
import { VoiceSelectionProvider } from './VoiceSelectionProvider.js';

dotenv.config();

/**
 * Ollama local LLM voice selection provider
 */
export class OllamaVoiceSelector extends VoiceSelectionProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'ollama';
    
    // Ollama configuration
    this.endpoint = config.endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.model = config.model || process.env.OLLAMA_MODEL || 'llama2';
    this.timeout = config.timeout || 30000; // 30 seconds
  }

  /**
   * Check if Ollama is available and the model is loaded
   * @returns {Promise<boolean>} Whether provider is available
   */
  async isAvailable() {
    try {
      // Check if Ollama is running
      const healthResponse = await axios.get(`${this.endpoint}/api/tags`, {
        timeout: 5000
      });

      // Check if the specified model is available
      const models = healthResponse.data.models || [];
      const modelExists = models.some(m => m.name.includes(this.model));

      if (!modelExists) {
        console.warn(`Ollama model '${this.model}' not found. Available models:`, 
          models.map(m => m.name).join(', '));
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Ollama availability check failed:', error.message);
      return false;
    }
  }

  /**
   * Validate Ollama configuration
   * @returns {Object} Validation result
   */
  validateConfig() {
    const errors = [];
    const warnings = [];

    if (!this.endpoint) {
      errors.push('Ollama endpoint is required');
    }
    if (!this.model) {
      errors.push('Ollama model is required');
    }

    if (this.endpoint && !this.endpoint.includes('localhost') && !this.endpoint.includes('127.0.0.1')) {
      warnings.push('Endpoint does not appear to be local - ensure Ollama is accessible');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Select optimal voice using Ollama
   * @param {Object} metadata - Book metadata
   * @returns {Promise<Object>} Voice selection result
   */
  async selectVoice(metadata) {
    try {
      const prompt = this.buildVoiceSelectionPrompt(metadata);
      
      console.log(`🦙 Using Ollama (${this.model}) for voice selection: "${metadata.title}"`);
      
      const response = await axios.post(`${this.endpoint}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 100
        }
      }, {
        timeout: this.timeout
      });

      const result = this.parseOllamaResponse(response.data.response);
      
      // Validate selected voice
      const voices = this.getVoiceCharacteristics();
      if (!voices[result.voice]) {
        console.warn(`Invalid voice selected: ${result.voice}, falling back to nova`);
        return this.formatResult('nova', metadata, 60, 'Fallback due to invalid voice selection');
      }

      return this.formatResult(result.voice, metadata, result.confidence, result.reasoning);

    } catch (error) {
      console.error('Ollama voice selection failed:', error);
      throw new Error(`Ollama voice selection failed: ${error.message}`);
    }
  }

  /**
   * Build the voice selection prompt for Ollama
   * @param {Object} metadata - Book metadata
   * @returns {string} Formatted prompt
   */
  buildVoiceSelectionPrompt(metadata) {
    const voices = this.getVoiceCharacteristics();
    
    const voiceDescriptions = Object.entries(voices).map(([name, char]) => {
      return `${name}: ${char.gender}, ${char.tone} tone, ${char.style} style - best for ${char.bestFor.join(', ')}`;
    }).join('\n');

    return `You are an expert voice selection AI for audiobook production. Select the most appropriate voice for this book.

Available Voices:
${voiceDescriptions}

Book Information:
Title: "${metadata.title || 'Unknown'}"
Author: "${metadata.author || 'Unknown'}"
Genre: ${Array.isArray(metadata.genre) ? metadata.genre.join(', ') : metadata.genre || 'Unknown'}
Core Themes: ${Array.isArray(metadata.core_themes) ? metadata.core_themes.join(', ') : metadata.core_themes || 'Not specified'}
Target Audience: ${Array.isArray(metadata.target_audience) ? metadata.target_audience.join(', ') : metadata.target_audience || 'General'}

Consider author gender, genre appropriateness, and target audience when selecting the voice.

Respond with ONLY the voice name and a brief reason, in this format:
VOICE: [voice_name]
REASON: [brief explanation]
CONFIDENCE: [number between 60-95]`;
  }

  /**
   * Parse Ollama response to extract voice selection
   * @param {string} response - Raw Ollama response
   * @returns {Object} Parsed result
   */
  parseOllamaResponse(response) {
    try {
      // Try to extract structured information from the response
      const voiceMatch = response.match(/VOICE:\s*(\w+)/i);
      const reasonMatch = response.match(/REASON:\s*([^\n]+)/i);
      const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/i);

      const voice = voiceMatch ? voiceMatch[1].toLowerCase() : null;
      const reason = reasonMatch ? reasonMatch[1].trim() : 'Selected by Ollama';
      const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 75;

      // If structured parsing fails, try to extract voice name from common patterns
      if (!voice) {
        const voices = Object.keys(this.getVoiceCharacteristics());
        for (const voiceName of voices) {
          if (response.toLowerCase().includes(voiceName)) {
            return {
              voice: voiceName,
              reasoning: 'Extracted from Ollama response',
              confidence: 70
            };
          }
        }
        
        // Ultimate fallback
        return {
          voice: 'nova',
          reasoning: 'Fallback - could not parse Ollama response',
          confidence: 60
        };
      }

      return {
        voice,
        reasoning: reason,
        confidence: Math.min(95, Math.max(60, confidence))
      };

    } catch (error) {
      console.warn('Failed to parse Ollama response:', error);
      return {
        voice: 'nova',
        reasoning: 'Fallback due to parsing error',
        confidence: 60
      };
    }
  }

  /**
   * Get available models from Ollama
   * @returns {Promise<Array>} List of available models
   */
  async getAvailableModels() {
    try {
      const response = await axios.get(`${this.endpoint}/api/tags`, {
        timeout: 5000
      });
      return response.data.models || [];
    } catch (error) {
      console.warn('Failed to get Ollama models:', error.message);
      return [];
    }
  }

  /**
   * Pull a model if it's not available
   * @param {string} modelName - Model name to pull
   * @returns {Promise<boolean>} Whether pull was successful
   */
  async pullModel(modelName = null) {
    const model = modelName || this.model;
    
    try {
      console.log(`📥 Pulling Ollama model: ${model}`);
      
      const response = await axios.post(`${this.endpoint}/api/pull`, {
        name: model
      }, {
        timeout: 300000 // 5 minutes for model download
      });

      console.log(`✅ Model ${model} pulled successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to pull model ${model}:`, error.message);
      return false;
    }
  }
}

export default OllamaVoiceSelector;
