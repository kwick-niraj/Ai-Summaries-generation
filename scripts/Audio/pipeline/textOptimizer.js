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
   * Optimize text for audio narration (legacy method - now calls optimizeForListening)
   * @param {string} text - Raw text content
   * @param {string} sectionType - Type of section (introduction, chapter, conclusion)
   * @param {Object} options - Optimization options
   * @returns {Promise<string>} Optimized text
   */
  async optimizeForAudio(text, sectionType = 'chapter', options = {}) {
    return this.optimizeForListening(text, sectionType, options);
  }

  /**
   * Optimize text specifically for audio/listening experience
   * @param {string} text - Raw text content
   * @param {string} sectionType - Type of section (introduction, chapter, conclusion)
   * @param {Object} options - Optimization options
   * @returns {Promise<string>} Audio-optimized text
   */
  async optimizeForListening(text, sectionType = 'chapter', options = {}) {
    try {
      console.log(`🎧 Optimizing for audio: ${sectionType}${options.enableSSML ? ' (with SSML)' : ''}`);
      
      // Clean and prepare the text
      const cleanedText = this.cleanMarkdownText(text);
      
      // Apply AI-based optimization for conversational audio
      const optimizedText = await this.applyAudioAIOptimization(cleanedText, sectionType, options);

      console.log('niraj optimizedText', optimizedText);
      
      // Apply final audio-specific formatting
      const audioReadyText = this.applyAudioFormatting(optimizedText, sectionType);

      console.log('AudioReady Text', audioReadyText);
      
      return audioReadyText;
    } catch (error) {
      console.error('Audio optimization failed:', error);
      // Fallback to basic cleaning if AI optimization fails
      return this.applyAudioFormatting(this.cleanMarkdownText(text), sectionType);
    }
  }

  /**
   * Optimize text for markdown/reading experience
   * @param {string} text - Raw text content
   * @param {string} sectionType - Type of section (introduction, chapter, conclusion)
   * @param {Object} options - Optimization options
   * @returns {Promise<string>} Reading-optimized text
   */
  async optimizeForReading(text, sectionType = 'chapter', options = {}) {
    try {
      console.log(`📖 Optimizing for reading: ${sectionType}`);
      
      // Extract chapter headers before optimization
      const extractedHeaders = this.extractChapterHeaders(text);
      
      // Clean and prepare the text
      const cleanedText = this.cleanMarkdownText(text);
      
      // Apply AI-based optimization for reading
      const optimizedText = await this.applyReadingAIOptimization(cleanedText, sectionType);
      
      // Verify and restore headers if needed
      const verifiedText = this.verifyAndRestoreHeaders(optimizedText, extractedHeaders);
      
      // Apply final reading-specific formatting
      const readingReadyText = this.applyReadingFormatting(verifiedText, sectionType);
      
      return readingReadyText;
    } catch (error) {
      console.error('Reading optimization failed:', error);
      // Fallback to basic cleaning if AI optimization fails
      return this.applyReadingFormatting(this.cleanMarkdownText(text), sectionType);
    }
  }

  /**
   * Generate both audio and reading optimized versions
   * @param {string} text - Raw text content
   * @param {string} sectionType - Type of section (introduction, chapter, conclusion)
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Both versions
   */
  async optimizeDualTrack(text, sectionType = 'chapter', options = {}) {
    try {
      console.log(`🔄 Dual-track optimization: ${sectionType}`);
      
      const [audioVersion, readingVersion] = await Promise.all([
        this.optimizeForListening(text, sectionType, options),
        this.optimizeForReading(text, sectionType, options)
      ]);

      return {
        audio: audioVersion,
        reading: readingVersion,
        sectionType,
        success: true
      };
    } catch (error) {
      console.error('Dual-track optimization failed:', error);
      const fallback = this.applyAudioFormatting(this.cleanMarkdownText(text), sectionType);
      return {
        audio: fallback,
        reading: fallback,
        sectionType,
        success: false,
        error: error.message
      };
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
   * Apply AI-based optimization for natural speech (legacy method)
   * @param {string} text - Cleaned text
   * @param {string} sectionType - Section type
   * @returns {Promise<string>} AI-optimized text
   */
  async applyAIOptimization(text, sectionType) {
    return this.applyAudioAIOptimization(text, sectionType);
  }

  /**
   * Apply AI-based optimization specifically for audio/listening
   * @param {string} text - Cleaned text
   * @param {string} sectionType - Section type
   * @param {Object} options - Optimization options
   * @returns {Promise<string>} Audio-optimized text
   */
  async applyAudioAIOptimization(text, sectionType, options = {}) {
    const enableSSML = options.enableSSML || false;
    const provider = options.provider || 'azure-openai';
    const voiceName = options.voice || 'andrew-multilingual';
    
    // Use Azure Speech-specific prompt if provider is azure-speech
    const systemPrompt = provider === 'azure-speech' 
      ? this.getAzureSpeechSystemPrompt(sectionType, voiceName, enableSSML)
      : this.getAudioSystemPrompt(sectionType, enableSSML);
    
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

      const optimizedContent = response.choices[0].message.content.trim();
      
      if (enableSSML && provider === 'azure-speech') {
        console.log('🎵 Generated Azure Speech SSML content for:', sectionType, `(${voiceName})`);
      } else if (enableSSML) {
        console.log('🎵 Generated SSML-enhanced content for:', sectionType);
      } else {
        console.log('📝 Generated optimized content for:', sectionType);
      }

      return optimizedContent;
    } catch (error) {
      console.error('Audio AI optimization failed:', error);
      throw error;
    }
  }

  /**
   * Apply AI-based optimization specifically for reading/markdown
   * @param {string} text - Cleaned text
   * @param {string} sectionType - Section type
   * @returns {Promise<string>} Reading-optimized text
   */
  async applyReadingAIOptimization(text, sectionType) {
    const systemPrompt = this.getReadingSystemPrompt(sectionType);
    
    try {
      const response = await this.client.chat.completions.create({
        model: this.deployment,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.5,
        max_tokens: 2000,
      });

      // console.log('Reading response AI Text', sectionType, '\n:', response.choices[0].message.content)

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Reading AI optimization failed:', error);
      throw error;
    }
  }

  /**
   * Get system prompt based on section type (legacy method)
   * @param {string} sectionType - Section type
   * @returns {string} System prompt
   */
  getSystemPrompt(sectionType) {
    return this.getAudioSystemPrompt(sectionType);
  }

  /**
   * Get audio-specific system prompt based on section type
   * @param {string} sectionType - Section type
   * @param {boolean} enableSSML - Whether to include SSML generation instructions
   * @returns {string} Audio system prompt
   */
  getAudioSystemPrompt(sectionType, enableSSML = false) {
    const basePrompt = `You are an expert audio content creator. Your task is to transform the given text into natural, engaging spoken-style narration — structured for clarity, flow, and rhythm.
  
  Speak as if you're talking to one listener, guiding them through ideas in a way that feels effortless and immersive. Keep the total length approximately the same as the input (±10%).
  
  CORE PRINCIPLES:
  - Write for the EAR, not the eye – favor natural, speech-based sentence structure
  - Use a warm, conversational tone with smooth pacing
  - Keep the listener engaged with rhetorical devices and real-world language
  - Use ellipses (...) to mark short pauses and verbal rhythm
  - Never expand with new examples or add content not in the original
  - Eliminate meta-commentary like "this chapter discusses" or "in this section"`;

    const ssmlInstructions = enableSSML ? `

  SIMPLIFIED SSML ENHANCEMENT:
  Add minimal, strategic SSML markup for natural speech flow (NO XML declarations):

  SUPPORTED TAGS (OpenAI TTS Compatible):
  - <break time="300ms"/> to <break time="800ms"/> — for inserting brief pauses between phrases.
  - <emphasis level="moderate" | "strong" | "reduced">important phrase</emphasis> — for emphasizing key terms (avoid overuse).
  - <prosody rate="90%" | "slow" pitch="+10%" | "-5%" volume="loud">subtle pacing or tone change</prosody> — for modulating speech speed, pitch, or volume.

  Note: Inside each tag, values separated by "|" indicate alternatives — use only one per attribute.

  CONSERVATIVE USAGE GUIDELINES:
  - Use <break time="500ms"/> ONLY between major concepts (not every sentence)
  - Add <emphasis level="moderate"> to 1-2 most important terms per paragraph
  - Apply prosody sparingly for section-level changes only
  - Keep SSML markup under 5% of total text
  - NO XML declarations, NO <speak> wrapper tags
  - Output plain text with embedded SSML tags only

  EXAMPLES:
  "Welcome to this transformative journey. <break time="0.5s"/> The key concept is <emphasis level="moderate">financial literacy</emphasis>."
  "Let's explore this together... <break time="0.3s"/> Here's what you need to know."` : '';

    const sectionSpecific = {
      introduction: `
INTRODUCTION-SPECIFIC GUIDELINES:
- Create a warm, welcoming opening that draws listeners in immediately
- Replace formal "Introduction" language with engaging hooks
- Use phrases like for example: "Welcome to this journey", "Let's explore together", "Here's what we're going to discover", these are just example, you can explore new phrases like this.
- Set expectations in a conversational way
- Build curiosity and anticipation
- Make the listener feel they're about to learn something valuable
- Use inclusive language ("we", "us", "together")
- Add a welcoming, inviting sentence with book title and author name.

OPENING STYLE: Warm, inviting, curiosity-building`,

      chapter: `
CHAPTER-SPECIFIC GUIDELINES:
- Keep chapter titles but integrate them naturally into the flow
- Create smooth transitions from previous content
- Use natural section breaks with conversational bridges
- Explain concepts as if teaching a friend
- Include real-world applications and relatable examples
- Maintain energy and engagement throughout
- Use varied sentence structure to avoid monotony
- Add emphasis to key points naturally

CHAPTER STYLE: Informative, engaging, conversational teaching`,

      conclusion: `
CONCLUSION-SPECIFIC GUIDELINES:
- Replace formal "Conclusion" language with natural wrap-up phrases
- Use phrases like "As we wrap up", "To bring this all together", "Here's what this means for you"
- Create a sense of completion and satisfaction
- Summarize key insights in a memorable way
- End with inspiration or actionable next steps
- Make the listener feel empowered and motivated
- Use forward-looking language about applying the insights

CONCLUSION STYLE: Inspiring, summarizing, forward-looking`
    };
  
    const styleAddendum = `
  SPEECH FORMATTING:
  - Insert line breaks between spoken paragraphs — each ~3–5 sentences long
  - Each paragraph should express **one idea or theme** clearly
  - Use ellipses (...) for natural pauses
  - Do not cram multiple ideas into long blocks
  
  SPEAKING TECHNIQUES:
  - Use contractions naturally (you’ll, we’re, that’s)
  - Ask rhetorical questions to maintain engagement
  - Avoid bullet points — convert lists into conversational sequences
  - Use "you" to speak directly to the listener
  - Use ellipses (...) for natural pauses within sentences
  
  ⚠️ AVOID:
  - Meta-references to the text itself
  - Academic or formal language
  - Dense, unbroken text blocks (NEVER!)
  - Paragraphs longer than 5 sentences
  - Breaking sentences in the middle
  
  LENGTH RULE:
  - Keep final output within ±10% of input character count
  - Do not add examples or side-notes
  - Focus only on improving pacing, tone, structure, and listener experience`;
  
    return basePrompt + ssmlInstructions + (sectionSpecific[sectionType] || sectionSpecific.chapter) + styleAddendum;
  }

  /**
   * Get Azure Speech-specific system prompt with advanced SSML features
   * @param {string} sectionType - Section type
   * @param {string} voiceName - Voice name (e.g., 'andrew-multilingual')
   * @param {boolean} enableAdvancedSSML - Whether to include advanced SSML generation
   * @returns {string} Azure Speech system prompt
   */
  getAzureSpeechSystemPrompt(sectionType, voiceName, enableAdvancedSSML = true) {
    const basePrompt = `You are an expert Azure Speech Services SSML content creator. Transform the given text into rich, expressive speech markup that leverages the full power of Azure Speech neural voices.

CORE PRINCIPLES:
- Create natural, engaging spoken-style narration with advanced emotional expression
- Use Azure Speech's voice styles and prosody for immersive audio experience  
- Leverage the selected voice's unique characteristics: ${voiceName}
- Generate complete SSML documents with proper namespace declarations
- Keep the total length approximately the same as the input (±10%)

VOICE-SPECIFIC OPTIMIZATION:
${this.getVoiceSpecificGuidelines(voiceName)}

SECTION-SPECIFIC STYLING:
${this.getSectionSpecificSSML(sectionType)}`;

    const azureSpeechSSML = enableAdvancedSSML ? `

AZURE SPEECH SSML FEATURES:
Use these advanced Azure Speech Services tags for rich expression:

VOICE STYLES (Primary Feature):
- <mstts:express-as style="conversational">natural, friendly conversation</mstts:express-as>
- <mstts:express-as style="friendly">warm, welcoming tone</mstts:express-as>  
- <mstts:express-as style="hopeful">optimistic, inspiring delivery</mstts:express-as>
- <mstts:express-as style="cheerful">upbeat, positive energy</mstts:express-as>
- <mstts:express-as style="empathetic">understanding, compassionate tone</mstts:express-as>
- <mstts:express-as style="calm">peaceful, relaxed delivery</mstts:express-as>

VOICE SELECTION:
- <voice name="${this.getAzureVoiceId(voiceName)}">content</voice> for voice consistency

ENHANCED PROSODY:
- <prosody rate="slow|medium|fast|0.9" pitch="low|medium|high|+10%" volume="soft|medium|loud">enhanced speech control</prosody>
- <prosody contour="(10%,+20%) (50%,-10%)">pitch contour patterns</prosody>

STRATEGIC BREAKS:
- <break time="500ms" strength="medium"/> for contextual pauses
- <mstts:silence type="Leading" value="800ms"/> before important points
- <mstts:silence type="Tailing" value="1200ms"/> after conclusions

EMPHASIS & EXPRESSION:
- <emphasis level="reduced|moderate|strong">key term highlighting</emphasis>
- <phoneme alphabet="ipa" ph="təˈmeɪtoʊ">pronunciation control</phoneme>

COMPLETE SSML STRUCTURE:
Generate full SSML documents with proper namespaces:
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-GB">
  <voice name="${this.getAzureVoiceId(voiceName)}">
    <mstts:express-as style="conversational">
      <prosody rate="0.95" pitch="medium">
        Your optimized content here...
      </prosody>
    </mstts:express-as>
  </voice>
</speak>

USAGE GUIDELINES:
- Use voice styles strategically based on content emotion and section type
- Apply prosody for section-level changes (introduction slower, conclusion inspiring)
- Add strategic breaks only between major concepts (not every sentence)
- Use emphasis sparingly on 1-2 key terms per paragraph
- Keep SSML markup under 10% of total text
- Ensure all tags are properly closed and nested` : '';

    const styleAddendum = `

CONTENT TRANSFORMATION:
- Write for the EAR, not the eye – favor natural speech patterns
- Use conversational tone with smooth pacing and rhythm
- Eliminate meta-commentary like "this chapter discusses"
- Convert lists into conversational sequences
- Use contractions naturally (you'll, we're, that's)
- Add rhetorical questions to maintain engagement

SPEECH FORMATTING:
- Structure content in spoken paragraphs (3-5 sentences each)
- Use strategic pauses and emphasis for key concepts
- Maintain energy and engagement throughout
- Create smooth transitions between ideas

LENGTH RULE:
- Keep final output within ±10% of input character count
- Focus on improving expression, pacing, and emotional delivery
- Do not add new examples or expand content`;

    return basePrompt + azureSpeechSSML + styleAddendum;
  }

  /**
   * Get voice-specific guidelines for Azure Speech voices
   * @param {string} voiceName - Voice name
   * @returns {string} Voice-specific guidelines
   */
  getVoiceSpecificGuidelines(voiceName) {
    const guidelines = {
      'andrew-multilingual': `
- Use "conversational" style for professional authority
- Apply moderate emphasis to key business terms
- Use slower rate (0.9) for complex concepts
- Leverage deep, authoritative tone for serious content`,
      
      'nova-turbo-multilingual': `
- Use "cheerful" style for motivational content
- Apply strong emphasis for action items
- Use faster rate (1.1) for energetic delivery
- Perfect for upbeat, dynamic sections`,
      
      'emma-multilingual': `
- Use "friendly" style for warm storytelling
- Apply gentle emphasis with empathetic tone
- Use medium rate with expressive pitch variations
- Ideal for emotional and personal content`,

      'aria': `
- Use "cheerful" style for positive, engaging content
- Apply moderate emphasis with upbeat delivery
- Use standard rate with bright, clear articulation
- Great for motivational and inspiring sections`,

      'adam-multilingual': `
- Use "calm" style for serious, authoritative content
- Apply strong emphasis for important concepts
- Use slower rate (0.9) for gravitas
- Perfect for documentary-style delivery`,

      'brandon-multilingual': `
- Use "friendly" style for casual, approachable content
- Apply moderate emphasis with warm delivery
- Use standard rate with conversational flow
- Ideal for storytelling and casual explanations`
    };
    
    return guidelines[voiceName] || guidelines['andrew-multilingual'];
  }

  /**
   * Get section-specific SSML styling
   * @param {string} sectionType - Section type
   * @returns {string} Section-specific guidelines
   */
  getSectionSpecificSSML(sectionType) {
    const sectionStyles = {
      introduction: `
- Primary style: "friendly" for welcoming tone
- Use slower rate (0.9) and leading silence (800ms)
- Add emphasis to book title and key concepts
- Create anticipation with strategic pauses
- End with hopeful, forward-looking delivery`,

      chapter: `
- Primary style: "conversational" for natural teaching
- Use standard rate (1.0) with balanced prosody
- Add emphasis to key terms and concepts (2-3 per paragraph)
- Use strategic breaks between major ideas
- Maintain engagement with varied pitch and pace`,

      conclusion: `
- Primary style: "hopeful" for inspiring finish
- Use slightly slower rate (0.95) for emphasis
- Add strong emphasis to key takeaways
- Use tailing silence (1200ms) for impact
- End with motivational, empowering tone`
    };

    return sectionStyles[sectionType] || sectionStyles.chapter;
  }

  /**
   * Get Azure Speech voice identifier from friendly name
   * @param {string} voiceName - Friendly voice name
   * @returns {string} Azure Speech voice ID
   */
  getAzureVoiceId(voiceName) {
    const voiceMapping = {
      'andrew-multilingual': 'en-GB-AndrewMultilingualNeural',
      'nova-turbo-multilingual': 'en-GB-NovaTurboMultilingualNeural',
      'emma-multilingual': 'en-GB-EmmaMultilingualNeural',
      'aria': 'en-GB-AriaNeural',
      'adam-multilingual': 'en-GB-AdamMultilingualNeural',
      'brandon-multilingual': 'en-GB-BrandonMultilingualNeural',
      'alloy-turbo-multilingual': 'en-GB-AlloyTurboMultilingualNeural',
      'steffan-multilingual': 'en-GB-SteffanMultilingualNeural',
      'amanda-multilingual': 'en-GB-AmandaMultilingualNeural',
      'derek-multilingual': 'en-GB-DerekMultilingualNeural',
      'andrew-dragon-hd': 'en-GB-AndrewDragonHDNeural',
      'jane': 'en-GB-JaneNeural',
      'jason': 'en-US-JasonNeural',
      'davis': 'en-US-DavisNeural'
    };
    
    return voiceMapping[voiceName] || 'en-GB-AndrewMultilingualNeural';
  }

  /**
   * Get reading-specific system prompt based on section type
   * @param {string} sectionType - Section type
   * @returns {string} Reading system prompt
   */
  getReadingSystemPrompt(sectionType) {
    const basePrompt = `You are an expert content editor specializing in creating clear, well-structured text for reading and reference. Transform the given text into polished, professional content that maintains clarity and accessibility.

CORE PRINCIPLES:
- Preserve formal structure while improving readability
- Maintain professional tone suitable for study and reference
- Ensure logical flow and clear organization
- Keep chapter titles and section headers intact
- Create content that works well for both casual reading and detailed study

READING-SPECIFIC TECHNIQUES:
- Use clear, concise language without being overly casual
- Maintain paragraph structure for easy scanning
- Preserve important formatting cues
- Keep technical terms but ensure they're well-explained
- Use transitional phrases that work in written form
- Maintain bullet points and lists where appropriate`;

    const sectionSpecific = {
      introduction: `
INTRODUCTION-SPECIFIC GUIDELINES:
- Create a compelling opening that sets context
- Maintain formal "Introduction" structure for navigation
- Provide clear overview of what's to come
- Use professional but engaging language
- Set appropriate expectations for the content

READING STYLE: Professional, clear, contextual`,

      chapter: `
CHAPTER-SPECIFIC GUIDELINES:
- Preserve chapter titles and structure
- Maintain logical flow between concepts
- Use clear headings and subheadings where appropriate
- Ensure concepts are well-explained and accessible
- Keep professional tone throughout

READING STYLE: Informative, structured, accessible`,

      conclusion: `
CONCLUSION-SPECIFIC GUIDELINES:
- Maintain formal "Conclusion" structure
- Provide clear summary of key points
- Offer actionable insights and next steps
- Create satisfying closure
- Use professional summarizing language

READING STYLE: Authoritative, summarizing, actionable`
    };

    const additionalGuidelines = `
FORMATTING PRESERVATION:
- Keep bullet points and numbered lists
- Maintain paragraph breaks for readability
- Preserve emphasis through formatting rather than conversational cues
- Keep technical terms with clear explanations

TONE GUIDELINES:
- Professional but accessible
- Clear and direct
- Informative without being dry
- Suitable for reference and study

AVOID:
- Overly casual conversational elements
- Excessive use of rhetorical questions
- Audio-specific cues like "listen to this"
- Informal contractions in formal contexts`;

    return basePrompt + (sectionSpecific[sectionType] || sectionSpecific.chapter) + additionalGuidelines;
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
  
      // Improve punctuation for speech (non-destructive to newlines)
      .replace(/;\s*/g, '. ')
      .replace(/:\s*([A-Z])/g, ': $1')
  
      // Remove quotes
      // .replace(/"/g, '')
      // .replace(/'/g, "'");

    // Remove duplicate sentences to prevent repetition in audio
    // formatted = this.removeDuplicateSentences(formatted);
  
    return formatted;
  }

  /**
   * Apply final reading-specific formatting
   * @param {string} text - AI-optimized text
   * @param {string} sectionType - Section type
   * @returns {string} Reading-ready text
   */
  applyReadingFormatting(text, sectionType) {
    let formatted = text
      // Keep some abbreviations for formal reading
      .replace(/\be\.g\./gi, 'e.g.')
      .replace(/\bi\.e\./gi, 'i.e.')
      .replace(/\betc\./gi, 'etc.')
      
      // Preserve formal punctuation
      .replace(/([.!?])\s*(?=[A-Z])/g, '$1 ')
      .replace(/:\s*([A-Z])/g, ': $1')
      
      // Keep quotes for reading
      .replace(/'/g, "'")
      
      // Clean up spacing but preserve paragraph structure
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
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
   * Remove duplicate sentences to prevent repetition in audio
   * @param {string} text - Text to process
   * @returns {string} Text with duplicates removed
   */
  removeDuplicateSentences(text) {
    try {
      // Split text into sentences
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      const uniqueSentences = [];
      const seenSentences = new Set();

      for (const sentence of sentences) {
        const cleanSentence = sentence.trim().toLowerCase()
          // Remove SSML tags for comparison
          .replace(/<[^>]*>/g, '')
          // Normalize whitespace
          .replace(/\s+/g, ' ')
          .trim();

        // Only add if we haven't seen this sentence before
        if (cleanSentence && !seenSentences.has(cleanSentence)) {
          seenSentences.add(cleanSentence);
          uniqueSentences.push(sentence.trim());
        } else if (cleanSentence) {
          console.log(`🔄 Removed duplicate sentence: "${sentence.trim().substring(0, 50)}..."`);
        }
      }

      return uniqueSentences.join(' ');
    } catch (error) {
      console.warn('Failed to remove duplicate sentences:', error);
      return text; // Return original text if deduplication fails
    }
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
