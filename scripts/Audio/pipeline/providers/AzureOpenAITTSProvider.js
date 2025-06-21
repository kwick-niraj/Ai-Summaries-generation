import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Azure OpenAI TTS Provider (Legacy/Fallback)
 * Direct implementation without circular dependencies
 */
export class AzureOpenAITTSProvider {
  constructor(config = {}) {
    this.config = config;
    this.endpoint = config.endpoint || process.env.AZURE_TTS_ENDPOINT;
    this.apiKey = config.apiKey || process.env.AZURE_TTS_KEY;
    this.deploymentId = config.deploymentId || process.env.AZURE_TTS_DEPLOYMENT_ID;
    this.apiVersion = config.apiVersion || '2025-03-01-preview';
    
    // Validate configuration
    this.validateConfig();
  }

  /**
   * Validate Azure OpenAI configuration
   */
  validateConfig() {
    if (!this.endpoint) {
      throw new Error('Azure OpenAI endpoint is required. Set AZURE_TTS_ENDPOINT environment variable.');
    }
    if (!this.apiKey) {
      throw new Error('Azure OpenAI API key is required. Set AZURE_TTS_KEY environment variable.');
    }
    if (!this.deploymentId) {
      throw new Error('Azure OpenAI deployment ID is required. Set AZURE_TTS_DEPLOYMENT_ID environment variable.');
    }
  }

  /**
   * Generate TTS using Azure OpenAI
   * @param {string} text - Text to convert
   * @param {string} outputPath - Output path
   * @param {Object} options - Options
   * @returns {Promise<Object>} Result
   */
  async generateTTS(text, outputPath, options = {}) {
    try {
      // Map options to Azure OpenAI format
      const voice = options.voice || 'nova';
      const speed = options.speed || 1.0;
      const format = options.format || 'mp3';
      
      console.log(`🎵 Azure OpenAI TTS: ${path.basename(outputPath)} (${voice})`);
      
      // Make TTS request
      const audioData = await this.makeAzureOpenAIRequest(text, voice, speed);
      
      // Save audio file
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, audioData);
      
      // Get file stats
      const stats = fs.statSync(outputPath);
      
      console.log(`✅ Audio saved: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
      
      return {
        success: true,
        outputPath,
        fileSize: stats.size,
        duration: await this.getAudioDuration(outputPath),
        voice: voice,
        provider: 'azure-openai'
      };
      
    } catch (error) {
      console.error(`❌ Azure OpenAI TTS failed for ${outputPath}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        outputPath,
        voice: options.voice || 'nova',
        provider: 'azure-openai'
      };
    }
  }

  /**
   * Make HTTP request to Azure OpenAI TTS
   * @param {string} text - Text to convert
   * @param {string} voice - Voice to use
   * @param {number} speed - Speech speed
   * @returns {Promise<Buffer>} Audio data
   */
  async makeAzureOpenAIRequest(text, voice, speed) {
    const url = `${this.endpoint}/openai/deployments/${this.deploymentId}/audio/speech?api-version=${this.apiVersion}`;
    
    const headers = {
      'api-key': this.apiKey,
      'Content-Type': 'application/json'
    };

    const data = {
      model: 'tts-1',
      input: text,
      voice: voice,
      speed: speed,
      response_format: 'mp3'
    };

    try {
      const response = await axios.post(url, data, {
        headers,
        responseType: 'arraybuffer',
        timeout: 60000 // 60 second timeout
      });

      return Buffer.from(response.data);
      
    } catch (error) {
      if (error.response) {
        const errorText = Buffer.from(error.response.data).toString();
        throw new Error(`Azure OpenAI API error (${error.response.status}): ${errorText}`);
      } else if (error.request) {
        throw new Error('No response from Azure OpenAI API. Check your endpoint and network connection.');
      } else {
        throw new Error(`Request setup error: ${error.message}`);
      }
    }
  }

  /**
   * Get audio file duration using ffprobe
   * @param {string} filePath - Path to audio file
   * @returns {Promise<number>} Duration in seconds
   */
  async getAudioDuration(filePath) {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`
      );
      return parseFloat(stdout.trim()) || 0;
    } catch (error) {
      console.warn(`Could not get duration for ${filePath}:`, error.message);
      return 0;
    }
  }

  /**
   * Get provider information
   * @returns {Object} Provider details
   */
  getProviderInfo() {
    return {
      name: 'Azure OpenAI TTS',
      type: 'azure-openai',
      endpoint: this.endpoint,
      deploymentId: this.deploymentId,
      supportsSSML: false,
      supportsVoiceStyles: false,
      supportedVoices: ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer']
    };
  }

  /**
   * Get available voices
   * @returns {Array} Available voices
   */
  getAvailableVoices() {
    return [
      { id: 'alloy', name: 'alloy', description: 'Neutral, balanced voice' },
      { id: 'echo', name: 'echo', description: 'Clear, professional voice' },
      { id: 'fable', name: 'fable', description: 'Warm, storytelling voice' },
      { id: 'nova', name: 'nova', description: 'Friendly, conversational voice' },
      { id: 'onyx', name: 'onyx', description: 'Deep, authoritative voice' },
      { id: 'shimmer', name: 'shimmer', description: 'Expressive, engaging voice' }
    ];
  }

  /**
   * Test voice availability
   * @param {string} voiceName - Voice name to test
   * @param {string} testText - Text to use for testing
   * @returns {Promise<Object>} Test result
   */
  async testVoice(voiceName, testText = 'Hello, this is a test of the Azure OpenAI voice.') {
    try {
      const tempDir = './Audio/temp';
      fs.mkdirSync(tempDir, { recursive: true });
      
      const tempFile = path.join(tempDir, `test_${voiceName}_${Date.now()}.mp3`);
      
      const result = await this.generateTTS(testText, tempFile, { voice: voiceName });
      
      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      
      return {
        voice: voiceName,
        success: result.success,
        error: result.error,
        actualVoice: result.voice
      };
      
    } catch (error) {
      return {
        voice: voiceName,
        success: false,
        error: error.message
      };
    }
  }
}

export default AzureOpenAITTSProvider;
