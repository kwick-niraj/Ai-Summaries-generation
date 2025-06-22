import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Azure Speech Services TTS Provider
 * Supports full SSML with voice styles and your 14 favorite voices
 */
export class AzureSpeechTTSProvider {
  constructor(config = {}) {
    this.endpoint = config.endpoint || process.env.AZURE_SPEECH_ENDPOINT;
    this.apiKey = config.apiKey || process.env.AZURE_SPEECH_KEY;
    this.region = config.region || process.env.AZURE_SPEECH_REGION;
    
    // Voice configuration
    this.preferredLocale = config.preferredLocale || 'en-GB';
    this.fallbackLocale = config.fallbackLocale || 'en-US';
    this.favoriteVoices = config.favoriteVoices || {};
    this.voiceStyles = config.voiceStyles || {};
    this.ssmlSettings = config.ssmlSettings || {};
    
    // Default settings
    this.defaultSettings = {
      outputFormat: config.outputFormat || 'audio-24khz-48kbitrate-mono-mp3',
      voice: config.defaultVoice || 'andrew-multilingual',
      style: 'conversational',
      rate: '1.0',
      pitch: 'medium',
      volume: 'medium'
    };

    // Validate configuration
    this.validateConfig();
  }

  /**
   * Validate Azure Speech configuration
   */
  validateConfig() {
    if (!this.endpoint) {
      throw new Error('Azure Speech endpoint is required. Set AZURE_SPEECH_ENDPOINT environment variable.');
    }
    if (!this.apiKey) {
      throw new Error('Azure Speech API key is required. Set AZURE_SPEECH_KEY environment variable.');
    }
    if (!this.region) {
      throw new Error('Azure Speech region is required. Set AZURE_SPEECH_REGION environment variable.');
    }

    // Ensure endpoint has proper format
    if (!this.endpoint.startsWith('https://')) {
      this.endpoint = `https://${this.region}.tts.speech.microsoft.com/`;
    }
    if (!this.endpoint.endsWith('/')) {
      this.endpoint += '/';
    }
  }

  /**
   * Generate TTS audio using Azure Speech Services
   * @param {string} text - Text or SSML to convert to speech
   * @param {string} outputPath - Path to save the audio file
   * @param {Object} options - TTS options
   * @returns {Promise<Object>} Generation result
   */
  async generateTTS(text, outputPath, options = {}) {
    try {
      const settings = { ...this.defaultSettings, ...options };
      console.log('niraj settings generateTTS', settings)
      
      // Resolve voice name to Azure Speech voice identifier
      const voiceInfo = this.resolveVoice(settings.voice);
      
      // Determine if input is SSML or plain text
      // const isSSML = this.isSSMLInput(text);
      
      // // Generate SSML if needed
      // const ssmlContent = isSSML ? text : this.generateSSML(text, settings, voiceInfo);
      
      console.log(`🎵 Azure Speech TTS: ${path.basename(outputPath)} (${voiceInfo.name})`);
      if (settings.style && settings.style !== 'conversational') {
        console.log(`   Style: ${settings.style}`);
      }
      
      // Make TTS request
      const audioData = await this.makeAzureSpeechRequest(text, settings);
      
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
        voice: voiceInfo.name,
        style: settings.style,
        isSSML: true,
        provider: 'azure-speech'
      };
      
    } catch (error) {
      console.error(`❌ Azure Speech TTS failed for ${outputPath}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        outputPath,
        voice: settings.voice,
        provider: 'azure-speech'
      };
    }
  }

  /**
   * Resolve voice name to Azure Speech voice identifier
   * @param {string} voiceName - Voice name (e.g., 'andrew-multilingual')
   * @returns {Object} Voice information
   */
  resolveVoice(voiceName) {
    const voiceConfig = this.favoriteVoices[voiceName];
    
    if (!voiceConfig) {
      console.warn(`Unknown voice '${voiceName}', using default`);
      const defaultVoice = this.favoriteVoices[this.defaultSettings.voice];
      return {
        name: defaultVoice?.primary || 'en-US-AndrewMultilingualNeural',
        friendlyName: this.defaultSettings.voice,
        locale: this.preferredLocale
      };
    }

    // Try preferred locale first, then fallback
    const voiceId = voiceConfig.primary || voiceConfig.fallback;
    const locale = voiceConfig.primary ? this.preferredLocale : this.fallbackLocale;
    
    return {
      name: voiceId,
      friendlyName: voiceName,
      locale: locale,
      description: voiceConfig.description
    };
  }

  /**
   * Generate SSML for Azure Speech Services
   * @param {string} text - Plain text
   * @param {Object} settings - TTS settings
   * @param {Object} voiceInfo - Voice information
   * @returns {string} SSML content
   */
  generateSSML(text, settings, voiceInfo) {
    const style = settings.style || 'conversational';
    const rate = settings.rate || '1.0';
    const pitch = settings.pitch || 'medium';
    const volume = settings.volume || 'medium';
    
    // Escape XML characters
    const escapedText = this.escapeXML(text);
    
    // Build SSML document
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${voiceInfo.locale}">
  <voice name="${voiceInfo.name}">
    <mstts:express-as style="${style}">
      <prosody rate="${rate}" pitch="${pitch}" volume="${volume}">
        ${escapedText}
      </prosody>
    </mstts:express-as>
  </voice>
</speak>`;

    return ssml;
  }

  /**
   * Make HTTP request to Azure Speech Services
   * @param {string} ssml - SSML content
   * @param {Object} settings - TTS settings
   * @returns {Promise<Buffer>} Audio data
   */
  async makeAzureSpeechRequest(ssml, settings) {
    const url = `${this.endpoint}cognitiveservices/v1`;
    
    const headers = {
      'Ocp-Apim-Subscription-Key': this.apiKey,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': settings.outputFormat || this.defaultSettings.outputFormat,
      'User-Agent': 'AudioBookGenerator/1.0'
    };

    // const cleanSSML = this.cleanSSML(ssml)

    try {
      const response = await axios.post(url, ssml, {
        headers,
        responseType: 'arraybuffer',
        timeout: 60000 // 60 second timeout
      });

      return Buffer.from(response.data);
      
    } catch (error) {
      console.log('ERROR from makeAzureSpeechRequest', error.response)
      if (error.response) {
        const errorText = Buffer.from(error.response.data).toString();
        throw new Error(`Azure Speech API error (${error.response.status}): ${errorText}`);
      } else if (error.request) {
        throw new Error('No response from Azure Speech API. Check your endpoint and network connection.');
      } else {
        throw new Error(`Request setup error: ${error.message}`);
      }
    }
  }

  cleanSSML(raw) {
    return raw
    .replace(/\s{2,}/g, ' ')                           // collapse extra spaces
    .replace(/"\s+/g, '"')                             // remove space after closing quote
    .replace(/\s*=\s*/g, '=')                          // clean spacing around '='
    .replace(/>\s+</g, '><')                           // clean spacing between tags
    .replace(/http:\/\/www\. w3\. org/g, 'http://www.w3.org')  // fix broken xmlns
    .replace(/https:\/\/www\. w3\. org/g, 'https://www.w3.org') // fix broken xmlns
    .replace(/version="1\. 0"/g, 'version="1.0"')       // fix version
    .replace(/<speak([^>]+)>/, (match, attrs) => {
      return `<speak ${attrs.trim().replace(/\s+/g, ' ')}>`; // normalize speak tag attributes
    })
    .trim();                       // Remove leading/trailing space
  }
  /**
   * Check if input text is SSML
   * @param {string} text - Input text
   * @returns {boolean} Whether text is SSML
   */
  isSSMLInput(text) {
    return text && text.includes('<speak') && text.includes('</speak>');
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
   * Get available voices for testing
   * @returns {Array} List of available voices
   */
  getAvailableVoices() {
    return Object.entries(this.favoriteVoices).map(([key, config]) => ({
      id: key,
      name: config.primary,
      fallback: config.fallback,
      description: config.description,
      recommended: config.recommended
    }));
  }

  /**
   * Test voice availability
   * @param {string} voiceName - Voice name to test
   * @param {string} testText - Text to use for testing
   * @returns {Promise<Object>} Test result
   */
  async testVoice(voiceName, testText = 'Hello, this is a test of the Azure Speech voice.') {
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

  /**
   * Get voice style for content type
   * @param {string} contentType - Type of content
   * @returns {string} Voice style
   */
  getVoiceStyleForContent(contentType) {
    return this.voiceStyles[contentType] || 'conversational';
  }

  /**
   * Analyze content and suggest optimal voice and style
   * @param {string} text - Content to analyze
   * @param {string} sectionType - Section type (introduction, chapter, conclusion)
   * @returns {Object} Voice and style recommendations
   */
  analyzeContentForVoice(text, sectionType = 'chapter') {
    // Simple content analysis for voice selection
    const textLower = text.toLowerCase();
    
    // Determine content characteristics
    const isMotivational = /\b(success|achieve|goal|dream|inspire|motivate|transform)\b/g.test(textLower);
    const isSerious = /\b(important|critical|serious|warning|caution|risk)\b/g.test(textLower);
    const isEmotional = /\b(feel|emotion|heart|love|fear|hope|joy|sad)\b/g.test(textLower);
    
    // Select voice based on content and section
    let recommendedVoice = 'andrew-multilingual'; // Default
    let recommendedStyle = 'conversational';
    
    if (sectionType === 'introduction') {
      recommendedVoice = 'emma-multilingual';
      recommendedStyle = 'friendly';
    } else if (sectionType === 'conclusion') {
      recommendedVoice = 'nova-turbo-multilingual';
      recommendedStyle = 'hopeful';
    } else if (isMotivational) {
      recommendedVoice = 'nova-turbo-multilingual';
      recommendedStyle = 'cheerful';
    } else if (isSerious) {
      recommendedVoice = 'adam-multilingual';
      recommendedStyle = 'calm';
    } else if (isEmotional) {
      recommendedVoice = 'emma-multilingual';
      recommendedStyle = 'empathetic';
    }
    
    return {
      voice: recommendedVoice,
      style: recommendedStyle,
      confidence: 0.8,
      reasoning: `Selected based on ${sectionType} section and content analysis`
    };
  }

  /**
   * Get provider information
   * @returns {Object} Provider details
   */
  getProviderInfo() {
    return {
      name: 'Azure Speech Services',
      type: 'azure-speech',
      endpoint: this.endpoint,
      region: this.region,
      voiceCount: Object.keys(this.favoriteVoices).length,
      supportsSSML: true,
      supportsVoiceStyles: true,
      supportedFormats: [
        'audio-24khz-48kbitrate-mono-mp3',
        'audio-24khz-96kbitrate-mono-mp3',
        'audio-48khz-192kbitrate-mono-mp3',
        'riff-24khz-16bit-mono-pcm'
      ]
    };
  }
}

export default AzureSpeechTTSProvider;
