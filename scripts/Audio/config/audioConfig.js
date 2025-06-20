/**
 * Audio generation pipeline configuration
 */
export const audioConfig = {
  // Input/Output directories
  inputDir: './FinalAllSummaries',
  outputDir: './Audio/output',
  logDir: './Audio/logs',

  // TTS Settings
  voice: 'nova', // Options: alloy, echo, fable, nova, onyx, shimmer
  speed: 1.0,    // Speed: 0.25 to 4.0
  format: 'wav', // Format: mp3, opus, aac, flac, wav.

  // Processing Settings
  maxChunkLength: 4000,     // Maximum characters per TTS request
  maxWordsPerChunk: 400,    // Maximum words per optimization chunk
  concurrency: 1,           // Number of books to process simultaneously
  
  // Audio Combination Settings
  combineAudio: true,       // Whether to combine individual files into complete audiobook
  addSilenceBetweenSections: 1.5, // Seconds of silence between sections
  fadeIn: 0.2,             // Fade in duration (seconds)
  fadeOut: 0.2,            // Fade out duration (seconds)

  // Processing Options
  skipExisting: true,       // Skip books that already have audio files
  optimizeText: true,       // Use AI to optimize text for audio
  generateSSML: false,      // Generate SSML markup (experimental)
  
  // Text Optimization Caching
  useOptimizedTextCache: true,        // Enable/disable caching of optimized text
  cacheValidityDays: 30,              // How long cached text is valid (days)
  forceReoptimization: false,         // Force re-optimization even if cache exists
  cacheStrategy: 'smart',             // 'smart', 'always', 'never'
  
  // Enhanced Features
  enableSSML: false,         // Enable SSML generation for expressive speech
  intelligentVoiceSelection: true, // Enable intelligent voice selection based on book metadata
  metadataDir: '../Meta of All Books DB', // Directory containing book metadata for voice selection
  
  // Voice Selection Provider Configuration
  voiceSelection: {
    provider: 'azure',       // Options: 'azure', 'ollama', 'rule-based'
    fallbackProvider: 'rule-based', // Fallback if primary provider fails
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
 * Voice configuration options
 */
export const voiceOptions = {
  alloy: {
    description: 'Neutral, balanced voice',
    recommended: ['general', 'business', 'educational']
  },
  echo: {
    description: 'Clear, professional voice',
    recommended: ['presentations', 'formal content']
  },
  fable: {
    description: 'Warm, storytelling voice',
    recommended: ['narratives', 'fiction', 'children\'s content']
  },
  nova: {
    description: 'Friendly, conversational voice',
    recommended: ['audiobooks', 'casual content', 'tutorials']
  },
  onyx: {
    description: 'Deep, authoritative voice',
    recommended: ['documentaries', 'serious content']
  },
  shimmer: {
    description: 'Expressive, engaging voice',
    recommended: ['entertainment', 'dynamic content']
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
    enableSSML: false,
    intelligentVoiceSelection: true,
    useOptimizedTextCache: true,
    cacheStrategy: 'smart',
    cacheValidityDays: 30,
    maxChunkLength: 3000,
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
