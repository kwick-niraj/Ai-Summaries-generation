import OpenAI from 'openai';
import dotenv from 'dotenv';
import { VoiceSelectionProvider } from './VoiceSelectionProvider.js';

dotenv.config();

/**
 * Azure OpenAI voice selection provider
 */
export class AzureVoiceSelector extends VoiceSelectionProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'azure';

    // Azure OpenAI configuration
    this.endpoint = config.endpoint || process.env.AZURE_OPENAI_ENDPOINT;
    this.apiKey = config.apiKey || process.env.AZURE_OPENAI_KEY;
    this.deploymentId = config.deploymentId || process.env.AZURE_OPENAI_CHAT_DEPLOYMENT_ID;
    this.apiVersion = config.apiVersion || '2024-02-15-preview';

    // Initialize OpenAI client
    this.client = null;
    this.initializeClient();
  }

  /**
   * Initialize OpenAI client with Azure configuration
   */
  initializeClient() {
    try {
      if (!this.apiKey || !this.endpoint || !this.deploymentId) {
        console.warn('Azure OpenAI configuration incomplete, client not initialized');
        this.client = null;
        return;
      }

      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: `${this.endpoint}/openai/deployments/${this.deploymentId}`,
        defaultQuery: { 'api-version': this.apiVersion },
        defaultHeaders: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Failed to initialize Azure OpenAI client:', error);
      this.client = null;
    }
  }

  /**
   * Check if Azure OpenAI is available and configured
   * @returns {Promise<boolean>} Whether provider is available
   */
  async isAvailable() {
    if (!this.client || !this.endpoint || !this.apiKey || !this.deploymentId) {
      return false;
    }

    try {
      // Test with a simple request
      const response = await this.client.chat.completions.create({
        messages: [{ role: "user", content: "Test" }],
        max_tokens: 1,
        temperature: 0
      });
      return true;
    } catch (error) {
      console.warn('Azure OpenAI availability check failed:', error.message);
      return false;
    }
  }

  /**
   * Validate Azure configuration
   * @returns {Object} Validation result
   */
  validateConfig() {
    const errors = [];
    const warnings = [];

    if (!this.endpoint) {
      errors.push('Azure OpenAI endpoint is required');
    }
    if (!this.apiKey) {
      errors.push('Azure OpenAI API key is required');
    }
    if (!this.deploymentId) {
      errors.push('Azure OpenAI deployment ID is required');
    }

    if (this.endpoint && !this.endpoint.includes('openai.azure.com')) {
      warnings.push('Endpoint does not appear to be an Azure OpenAI endpoint');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Select optimal voice using Azure OpenAI
   * @param {Object} metadata - Book metadata
   * @returns {Promise<Object>} Voice selection result
   */
  async selectVoice(metadata) {
    if (!this.client) {
      throw new Error('Azure OpenAI client not initialized');
    }

    try {
      const prompt = this.buildVoiceSelectionPrompt(metadata);

      console.log(`🤖 Using Azure OpenAI for voice selection: "${metadata.title}"`);

      const response = await this.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 150
      });

      const result = JSON.parse(response.choices[0].message.content);
      const selectedVoice = result.voice;
      const reasoning = result.reasoning || 'Selected by Azure OpenAI';
      const confidence = result.confidence || 85;

      // Validate selected voice
      const voices = this.getVoiceCharacteristics();
      if (!voices[selectedVoice]) {
        console.warn(`Invalid voice selected: ${selectedVoice}, falling back to nova`);
        return this.formatResult('nova', metadata, 60, 'Fallback due to invalid voice selection');
      }

      return this.formatResult(selectedVoice, metadata, confidence, reasoning);

    } catch (error) {
      console.error('Azure voice selection failed:', error);
      throw new Error(`Azure voice selection failed: ${error.message}`);
    }
  }

  /**
   * Build the voice selection prompt for Azure OpenAI
   * @param {Object} metadata - Book metadata
   * @returns {string} Formatted prompt
   */
  buildVoiceSelectionPrompt(metadata) {
    const voices = this.getVoiceCharacteristics();

    const voiceDescriptions = Object.entries(voices).map(([name, char]) => {
      return `- ${name}: ${char.gender}, ${char.tone} tone, ${char.style} style (${char.bestFor.join(', ')})`;
    }).join('\n');

    return `You are an expert voice selection AI for audiobook production. Choose the most appropriate voice from the list below to narrate the following book based on its content, emotional tone, style, audience, and purpose.
  
  Available Voices:
  ${voiceDescriptions}
  
  Book Metadata:
  - Title: "${metadata.title || 'Unknown'}"
  - Author: "${metadata.author || 'Unknown'}"
  - Publication Date: ${metadata.publication_date || 'Unknown'}
  - Genre: ${Array.isArray(metadata.genre) ? metadata.genre.join(', ') : metadata.genre || 'Unknown'}
  - Target Audience: ${Array.isArray(metadata.target_audience) ? metadata.target_audience.join(', ') : metadata.target_audience || 'General'}
  - Core Themes: ${Array.isArray(metadata.core_themes) ? metadata.core_themes.join(', ') : metadata.core_themes || 'Not specified'}
  - Primary Purpose: ${metadata.primary_purpose || 'Unknown'}
  - Structure: ${metadata.structure_format?.narrative_style || 'Unknown'}, ${metadata.structure_format?.organization || 'Unknown'}
  - Style & Tone: ${Array.isArray(metadata.style_tone) ? metadata.style_tone.join(', ') : metadata.style_tone || 'Unknown'}
  
  Guidelines:
  
  1. Focus on the tone, teaching style, and emotional depth of the book — not just the subject matter.
  2. Use:
     - Friendly or motivational voices (e.g., **nova**, **coral**) for engaging, story-driven teaching with wide appeal.
     - Calm or grounded voices (e.g., **alloy**, **echo**) for reflection, clarity, and balance.
     - Deep or serious voices (e.g., **onyx**, **sage**) only for mature, intense, or authoritative topics.
     - Playful or expressive voices (e.g., **fable**, **verse**, **ballad**) if the structure or storytelling is vivid and anecdotal.
  
  3. This book uses two contrasting father figures, storytelling, and emotional comparisons — consider a voice that reflects both relatability and clarity.
  
  4. Avoid defaulting to commonly used voices like **ash** or **alloy** unless they clearly match the content better than others.
  
  Respond with ONLY a JSON object in this exact format:
  {
    "voice": "[selected_voice_name]",
    "confidence": [number_between_60_and_95],
    "reasoning": "[brief_explanation_of_choice]"
  }`;
  }
}

export default AzureVoiceSelector;
