/**
 * Audio generation pipeline configuration
 */
export const audioConfig = {
  // Input/Output directories
  inputDir: './FinalAllSummaries',
  outputDir: './Audio/output',
  logDir: './Audio/logs',

  // TTS Provider Configuration
  tts: {
    provider: 'azure-speech',        // Primary: Azure Speech Services
    fallbackProvider: 'azure-openai', // Fallback: Azure OpenAI TTS
    
    azureSpeech: {
      endpoint: process.env.AZURE_SPEECH_ENDPOINT,
      apiKey: process.env.AZURE_SPEECH_KEY,
      region: process.env.AZURE_SPEECH_REGION,
      
      // Language preferences
      preferredLocale: 'en-US',      // UK English first
      fallbackLocale: 'en-US',       // US English fallback
      
      // Default voice and format
      defaultVoice: 'alloy-turbo-multilingual',
      outputFormat: 'riff-24khz-16bit-mono-pcm',
      
      // Your 14 favorite voices from Speech Playground
      favoriteVoices: {
        'alloy-turbo-multilingual': {
          primary: 'en-US-AlloyTurboMultilingualNeural',
          fallback: 'en-US-AlloyTurboMultilingualNeural',
          description: 'Clear, versatile multilingual voice',
          recommended: ['general', 'educational']
        },
        // 'andrew-multilingual': {
        //   primary: 'en-US-AndrewMultilingualNeural',
        //   fallback: 'en-US-AndrewMultilingualNeural', 
        //   description: 'Professional, authoritative multilingual voice',
        //   recommended: ['business', 'professional', 'educational']
        // },
        'nova-turbo-multilingual': {
          primary: 'en-US-NovaTurboMultilingualNeural',
          fallback: 'en-US-NovaTurboMultilingualNeural',
          description: 'Energetic, engaging multilingual voice',
          recommended: ['motivational', 'dynamic']
        },
        'brandon-multilingual': {
          primary: 'en-US-BrandonMultilingualNeural',
          fallback: 'en-US-BrandonMultilingualNeural',
          description: 'Warm, friendly multilingual voice',
          recommended: ['storytelling', 'casual']
        },
        'steffan-multilingual': {
          primary: 'en-US-SteffanMultilingualNeural',
          fallback: 'en-US-SteffanMultilingualNeural',
          description: 'Smooth, conversational multilingual voice',
          recommended: ['audiobooks', 'narration']
        },
        'adam-multilingual': {
          primary: 'en-US-AdamMultilingualNeural',
          fallback: 'en-US-AdamMultilingualNeural',
          description: 'Deep, authoritative multilingual voice',
          recommended: ['serious', 'documentary']
        },
        'amanda-multilingual': {
          primary: 'en-US-AmandaMultilingualNeural',
          fallback: 'en-US-AmandaMultilingualNeural',
          description: 'Clear, professional female multilingual voice',
          recommended: ['business', 'educational']
        },
        'derek-multilingual': {
          primary: 'en-US-DerekMultilingualNeural',
          fallback: 'en-US-DerekMultilingualNeural',
          description: 'Confident, engaging multilingual voice',
          recommended: ['presentations', 'training']
        },
        'andrew-dragon-hd': {
          primary: 'en-US-AndrewDragonHDNeural',
          fallback: 'en-US-AndrewDragonHDNeural',
          description: 'High-definition Andrew voice variant',
          recommended: ['premium', 'high-quality']
        },
        // 'emma-multilingual': {
        //   primary: 'en-US-EmmaMultilingualNeural',
        //   fallback: 'en-US-EmmaMultilingualNeural',
        //   description: 'Warm, empathetic female multilingual voice',
        //   recommended: ['storytelling', 'emotional']
        // },
        'aria': {
          primary: 'en-US-AriaNeural',
          fallback: 'en-US-AriaNeural',
          description: 'Cheerful, engaging female voice',
          recommended: ['upbeat', 'positive']
        },
        'jane': {
          primary: 'en-US-JaneNeural',
          fallback: 'en-US-JaneNeural',
          description: 'Clear, professional female voice',
          recommended: ['business', 'formal']
        },
        'jason': {
          primary: 'en-US-JasonNeural', // US only
          fallback: 'en-US-JasonNeural',
          description: 'Casual, friendly male voice',
          recommended: ['conversational', 'casual']
        },
        'davis': {
          primary: 'en-US-DavisNeural', // US only
          fallback: 'en-US-DavisNeural',
          description: 'Deep, authoritative male voice',
          recommended: ['serious', 'authoritative']
        }
      },
      
      // Voice styles for different content types
      voiceStyles: {
        introduction: 'friendly',
        chapter: 'conversational',
        conclusion: 'hopeful',
        motivational: 'cheerful',
        serious: 'calm',
        emotional: 'empathetic'
      },
      
      // SSML settings
      ssmlSettings: {
        enableAdvancedSSML: true,
        useVoiceStyles: true,
        enableProsodyControl: true,
        enableEmphasis: true,
        enableBreaks: true
      }
    },
    
    // Legacy Azure OpenAI TTS settings (fallback)
    azureOpenAI: {
      endpoint: process.env.AZURE_TTS_ENDPOINT,
      apiKey: process.env.AZURE_TTS_KEY,
      deploymentId: process.env.AZURE_TTS_DEPLOYMENT_ID,
      apiVersion: '2025-03-01-preview'
    }
  },

  // Legacy TTS Settings (for backward compatibility)
  voice: 'alloy-turbo-multilingual', // Default to Andrew Multilingual
  speed: 1.0,    // Speed: 0.25 to 4.0
  format: 'wav', // Format: mp3, opus, aac, flac, wav.

  // Processing Settings
  maxChunkLength: 9000,     // Maximum characters per TTS request
  maxWordsPerChunk: 1400,    // Maximum words per optimization chunk
  concurrency: 1,           // Number of books to process simultaneously
  
  // Audio Combination Settings
  combineAudio: true,       // Whether to combine individual files into complete audiobook
  addSilenceBetweenSections: 1.5, // Seconds of silence between sections
  fadeIn: 0.2,             // Fade in duration (seconds)
  fadeOut: 0.2,            // Fade out duration (seconds)

  // Processing Options
  skipExisting: true,       // Skip books that already have audio files
  optimizeText: true,       // Use AI to optimize text for audio
  generateSSML: true,       // Generate SSML markup for enhanced emotional expression
  
  // Text Optimization Caching
  useOptimizedTextCache: true,        // Enable/disable caching of optimized text
  cacheValidityDays: 30,              // How long cached text is valid (days)
  forceReoptimization: false,         // Force re-optimization even if cache exists
  cacheStrategy: 'smart',             // 'smart', 'always', 'never'
  
  // Enhanced Features
  enableSSML: true,          // Enable SSML generation for expressive speech
  intelligentVoiceSelection: true, // Enable intelligent voice selection based on book metadata
  metadataDir: '../Meta of All Books DB', // Directory containing book metadata for voice selection
  
  // Voice Selection Provider Configuration
  voiceSelection: {
    provider: 'hybrid',      // Options: 'azure', 'ollama', 'rule-based', 'smart', 'hybrid'
    fallbackProvider: 'smart', // Fallback if primary provider fails
    azure: {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_KEY,
      deploymentId: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT_ID,
      apiVersion: '2024-02-15-preview'
    },
    ollama: {
      endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama2',
      timeout: 30000
    }
  },
  
  // Rate Limiting
  delayBetweenRequests: 1000,    // Milliseconds between TTS requests
  delayBetweenChapters: 2000,    // Milliseconds between chapters
  delayBetweenBooks: 5000,       // Milliseconds between books
  batchOptimizationConcurrency: 3, // Concurrent text optimization requests

  // Error Handling
  maxRetries: 3,            // Maximum retries for failed requests
  retryDelay: 5000,         // Delay between retries (milliseconds)
  continueOnError: true,    // Continue processing other books if one fails

  // Logging
  verboseLogging: true,     // Enable detailed logging
  saveProcessingReports: true, // Save individual book reports
  
  // Quality Settings
  audioQuality: {
    bitrate: '128k',        // Audio bitrate for combined files
    sampleRate: 22050,      // Sample rate (Hz)
    channels: 1             // Mono (1) or Stereo (2)
  }
};

/**
 * Voice configuration options (Azure Speech compatible)
 */
export const voiceOptions = {
  // Azure Speech voices
  // 'andrew-multilingual': {
  //   description: 'Professional, authoritative multilingual voice',
  //   recommended: ['business', 'professional', 'educational']
  // },
  'aria': {
    description: 'Cheerful, engaging female voice',
    recommended: ['upbeat', 'positive', 'general-audience']
  },
  'brandon-multilingual': {
    description: 'Warm, friendly multilingual voice',
    recommended: ['storytelling', 'casual', 'self-help']
  },
  'emma-multilingual': {
    description: 'Warm, empathetic female multilingual voice',
    recommended: ['emotional', 'wellness', 'mindfulness']
  },
  'nova-turbo-multilingual': {
    description: 'Energetic, engaging multilingual voice',
    recommended: ['motivational', 'dynamic', 'educational']
  },
  'adam-multilingual': {
    description: 'Deep, authoritative multilingual voice',
    recommended: ['documentary', 'serious', 'biography']
  },
  'amanda-multilingual': {
    description: 'Clear, professional female multilingual voice',
    recommended: ['business', 'educational', 'professional']
  },
  'steffan-multilingual': {
    description: 'Smooth, conversational multilingual voice',
    recommended: ['audiobooks', 'narration', 'storytelling']
  },
  'derek-multilingual': {
    description: 'Confident, engaging multilingual voice',
    recommended: ['presentations', 'training', 'business']
  },
  'jane': {
    description: 'Clear, professional female voice',
    recommended: ['business', 'formal', 'corporate']
  },
  'jason': {
    description: 'Casual, friendly male voice',
    recommended: ['conversational', 'casual', 'accessible']
  },
  'davis': {
    description: 'Deep, authoritative male voice',
    recommended: ['serious', 'authoritative', 'documentary']
  },
  
  // Legacy Azure OpenAI voices (mapped to Azure Speech equivalents)
  alloy: {
    description: 'Neutral, balanced voice (mapped to brandon-multilingual)',
    recommended: ['general', 'business', 'educational'],
    azureSpeechEquivalent: 'brandon-multilingual'
  },
  echo: {
    description: 'Clear, professional voice (mapped to emma-multilingual)',
    recommended: ['presentations', 'formal content'],
    azureSpeechEquivalent: 'emma-multilingual'
  },
  fable: {
    description: 'Warm, storytelling voice (mapped to nova-turbo-multilingual)',
    recommended: ['narratives', 'fiction', 'children\'s content'],
    azureSpeechEquivalent: 'nova-turbo-multilingual'
  },
  nova: {
    description: 'Friendly, conversational voice (mapped to aria)',
    recommended: ['audiobooks', 'casual content', 'tutorials'],
    azureSpeechEquivalent: 'aria'
  },
  onyx: {
    description: 'Deep, authoritative voice (mapped to adam-multilingual)',
    recommended: ['documentaries', 'serious content'],
    azureSpeechEquivalent: 'adam-multilingual'
  },
  shimmer: {
    description: 'Expressive, engaging voice (mapped to amanda-multilingual)',
    recommended: ['entertainment', 'dynamic content'],
    azureSpeechEquivalent: 'amanda-multilingual'
  }
};

/**
 * Processing presets for different use cases
 */
export const processingPresets = {
  // Fast processing with basic quality
  fast: {
    ...audioConfig,
    optimizeText: false,
    enableSSML: false,
    intelligentVoiceSelection: false,
    useOptimizedTextCache: true,
    cacheStrategy: 'always',
    cacheValidityDays: 90,
    maxChunkLength: 3000,
    concurrency: 2,
    delayBetweenRequests: 500,
    audioQuality: { bitrate: '96k', sampleRate: 22050, channels: 1 }
  },

  // Balanced processing with good quality
  balanced: {
    ...audioConfig,
    optimizeText: true,
    enableSSML: true,
    intelligentVoiceSelection: true,
    generateSSML: true,
    useOptimizedTextCache: true,
    cacheStrategy: 'smart',
    cacheValidityDays: 30,
    maxChunkLength: 9000,
    concurrency: 1,
    delayBetweenRequests: 1000,
    audioQuality: { bitrate: '128k', sampleRate: 22050, channels: 1 }
  },

  // High quality processing (slower)
  premium: {
    ...audioConfig,
    optimizeText: true,
    enableSSML: true,
    intelligentVoiceSelection: true,
    generateSSML: true,
    useOptimizedTextCache: true,
    cacheStrategy: 'smart',
    cacheValidityDays: 14,
    maxChunkLength: 3500,
    concurrency: 1,
    delayBetweenRequests: 1500,
    delayBetweenChapters: 3000,
    batchOptimizationConcurrency: 2,
    audioQuality: { bitrate: '192k', sampleRate: 44100, channels: 1 }
  },

  // Testing preset for development
  test: {
    ...audioConfig,
    inputDir: './FinalAllSummaries',
    outputDir: './Audio/test_output',
    optimizeText: true,
    enableSSML: false,
    intelligentVoiceSelection: true,
    useOptimizedTextCache: false,
    forceReoptimization: true,
    cacheStrategy: 'never',
    combineAudio: false,
    skipExisting: false,
    maxChunkLength: 2000,
    verboseLogging: true
  }
};

/**
 * Get configuration based on preset or custom options
 * @param {string|Object} preset - Preset name or custom config object
 * @returns {Object} Configuration object
 */
export function getConfig(preset = 'balanced') {
  if (typeof preset === 'string') {
    if (processingPresets[preset]) {
      return { ...processingPresets[preset] };
    } else {
      console.warn(`Unknown preset '${preset}', using 'balanced'`);
      return { ...processingPresets.balanced };
    }
  } else if (typeof preset === 'object') {
    return { ...audioConfig, ...preset };
  } else {
    return { ...audioConfig };
  }
}

/**
 * Validate configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
export function validateConfig(config) {
  const errors = [];
  const warnings = [];

  // Required directories
  if (!config.inputDir) {
    errors.push('inputDir is required');
  }
  if (!config.outputDir) {
    errors.push('outputDir is required');
  }

  // Voice validation
  if (!Object.keys(voiceOptions).includes(config.voice)) {
    warnings.push(`Unknown voice '${config.voice}', available: ${Object.keys(voiceOptions).join(', ')}`);
  }

  // Speed validation
  if (config.speed < 0.25 || config.speed > 4.0) {
    errors.push('speed must be between 0.25 and 4.0');
  }

  // Format validation
  const validFormats = ['mp3', 'opus', 'aac', 'flac', 'wav'];
  if (!validFormats.includes(config.format)) {
    errors.push(`format must be one of: ${validFormats.join(', ')}`);
  }

  // Concurrency validation
  if (config.concurrency < 1 || config.concurrency > 10) {
    warnings.push('concurrency should be between 1 and 10 for optimal performance');
  }

  // Chunk length validation
  if (config.maxChunkLength > 4096) {
    warnings.push('maxChunkLength > 4096 may cause TTS API errors');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Print configuration summary
 * @param {Object} config - Configuration to summarize
 */
export function printConfigSummary(config) {
  console.log('\n🔧 CONFIGURATION SUMMARY');
  console.log('========================');
  console.log(`📂 Input: ${config.inputDir}`);
  console.log(`📁 Output: ${config.outputDir}`);
  console.log(`🎤 Voice: ${config.voice}`);
  console.log(`⚡ Speed: ${config.speed}x`);
  console.log(`🎵 Format: ${config.format}`);
  console.log(`📊 Concurrency: ${config.concurrency}`);
  console.log(`✨ Text Optimization: ${config.optimizeText ? 'Enabled' : 'Disabled'}`);
  console.log(`🎵 SSML Generation: ${config.enableSSML ? 'Enabled' : 'Disabled'}`);
  console.log(`🎭 Intelligent Voice Selection: ${config.intelligentVoiceSelection ? 'Enabled' : 'Disabled'}`);
  console.log(`🔗 Combine Audio: ${config.combineAudio ? 'Enabled' : 'Disabled'}`);
  console.log(`⏭️  Skip Existing: ${config.skipExisting ? 'Enabled' : 'Disabled'}`);
  
  // Text optimization caching info
  if (config.useOptimizedTextCache) {
    console.log(`💾 Text Cache: ${config.cacheStrategy} strategy (${config.cacheValidityDays} days)`);
    if (config.forceReoptimization) {
      console.log(`🔄 Force Reoptimization: Enabled`);
    }
  } else {
    console.log(`💾 Text Cache: Disabled`);
  }
  
  if (config.intelligentVoiceSelection && config.metadataDir) {
    console.log(`📚 Metadata Directory: ${config.metadataDir}`);
  }
  
  if (config.audioQuality) {
    console.log(`🎧 Quality: ${config.audioQuality.bitrate} @ ${config.audioQuality.sampleRate}Hz`);
  }
}

export default audioConfig;
