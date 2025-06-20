# Enhanced Voice Selection System Guide

## Overview

The enhanced voice selection system provides intelligent, AI-powered voice selection for audiobook generation with multiple provider support and robust fallback mechanisms.

## Features

✅ **Multiple Providers**: Azure OpenAI, Ollama (local LLM), and rule-based selection  
✅ **Intelligent Fallbacks**: Automatic fallback when primary provider fails  
✅ **Easy Configuration**: Simple configuration switching between providers  
✅ **Robust Error Handling**: Graceful degradation with meaningful error messages  
✅ **Provider Status Monitoring**: Real-time availability checking with caching  
✅ **Flexible Architecture**: Easy to add new providers in the future  

## Quick Start

### 1. Basic Usage

```javascript
import { VoiceSelector } from './pipeline/voiceSelector.js';

// Create voice selector with default configuration
const voiceSelector = new VoiceSelector();

// Select voice for a book
const result = await voiceSelector.selectVoiceForBook('1159', 'Meta of All Books DB');

console.log(`Selected voice: ${result.selectedVoice}`);
console.log(`Confidence: ${result.confidence}%`);
console.log(`Reasoning: ${result.reasoning}`);
```

### 2. Provider Configuration

```javascript
// Use Azure OpenAI for voice selection
const azureConfig = {
  provider: 'azure',
  fallbackProvider: 'rule-based',
  azure: {
    endpoint: 'https://your-endpoint.openai.azure.com',
    apiKey: 'your-api-key',
    deploymentId: 'gpt-4'
  }
};

const voiceSelector = new VoiceSelector(azureConfig);
```

```javascript
// Use Ollama for local voice selection
const ollamaConfig = {
  provider: 'ollama',
  fallbackProvider: 'rule-based',
  ollama: {
    endpoint: 'http://localhost:11434',
    model: 'llama2'
  }
};

const voiceSelector = new VoiceSelector(ollamaConfig);
```

## Configuration Options

### Environment Variables

Add these to your `.env` file:

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com
AZURE_OPENAI_KEY=your-api-key
AZURE_OPENAI_CHAT_DEPLOYMENT_ID=gpt-4

# Ollama Configuration  
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=llama2

# Azure TTS (unchanged)
AZURE_TTS_ENDPOINT=https://your-tts-endpoint.openai.azure.com
AZURE_TTS_KEY=your-tts-key
AZURE_TTS_DEPLOYMENT_ID=tts-hd
```

### Audio Configuration

Update `scripts/Audio/config/audioConfig.js`:

```javascript
export const audioConfig = {
  // ... other settings ...
  
  voiceSelection: {
    provider: 'azure',           // 'azure', 'ollama', or 'rule-based'
    fallbackProvider: 'rule-based', // Fallback if primary fails
    azure: {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_KEY,
      deploymentId: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT_ID
    },
    ollama: {
      endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama2',
      timeout: 30000
    }
  }
};
```

## Provider Details

### Azure OpenAI Provider

**Best for**: Production use with high-quality voice selection  
**Requirements**: Azure OpenAI subscription and deployment  
**Advantages**:

- High-quality AI reasoning
- Consistent results
- JSON-structured responses
- Good understanding of book metadata

**Configuration**:

```javascript
azure: {
  endpoint: 'https://your-endpoint.openai.azure.com',
  apiKey: 'your-api-key', 
  deploymentId: 'gpt-4',
  apiVersion: '2024-02-15-preview'
}
```

### Ollama Provider

**Best for**: Local development, privacy-focused setups, cost savings  
**Requirements**: Ollama installed and running locally  
**Advantages**:

- No API costs
- Complete privacy (data stays local)
- Works offline
- Customizable models

**Setup**:

1. Install Ollama: `curl -fsSL https://ollama.ai/install.sh | sh`
2. Pull a model: `ollama pull llama2`
3. Start Ollama: `ollama serve`

**Configuration**:

```javascript
ollama: {
  endpoint: 'http://localhost:11434',
  model: 'llama2',
  timeout: 30000
}
```

### Rule-based Provider

**Best for**: Fallback, guaranteed availability, deterministic results  
**Requirements**: None (always available)  
**Advantages**:

- Always works
- Fast execution
- Predictable results
- No external dependencies

## Advanced Usage

### Provider Switching

```javascript
const voiceSelector = new VoiceSelector();

// Switch to Ollama with Azure fallback
voiceSelector.switchProvider('ollama', 'azure');

// Switch to rule-based (no fallback needed)
voiceSelector.switchProvider('rule-based');

// Check current configuration
const status = await voiceSelector.getProviderStatus();
console.log('Current provider:', status.current);
console.log('Available providers:', Object.keys(status.providers));
```

### Batch Processing

```javascript
const bookIds = ['1159', '746', '101'];
const results = await voiceSelector.batchSelectVoices(bookIds);

console.log(`Processed ${results.summary.total} books`);
console.log(`Success rate: ${results.summary.successful}/${results.summary.total}`);

// Access individual results
Object.entries(results.results).forEach(([bookId, result]) => {
  console.log(`${bookId}: ${result.selectedVoice} (${result.confidence}%)`);
});
```

### Provider Status Monitoring

```javascript
const status = await voiceSelector.getProviderStatus();

for (const [name, info] of Object.entries(status.providers)) {
  console.log(`${name}: ${info.available ? 'Available' : 'Not Available'}`);
  
  if (!info.validation.valid) {
    console.log(`  Errors: ${info.validation.errors.join(', ')}`);
  }
}
```

## Voice Selection Logic

### Available Voices

| Voice | Gender | Tone | Style | Best For |
|-------|--------|------|-------|----------|
| **alloy** | Female | Warm | Grounded | Self-help, personal development |
| **coral** | Female | Bright | Young | Motivational, lifestyle |
| **echo** | Female | Soft | Calm | Mindfulness, wellness |
| **fable** | Female | Playful | Storybook | Narrative, creative |
| **nova** | Female | Friendly | Expressive | General audience, accessible |
| **shimmer** | Female | Clear | Futuristic | Technology, innovation |
| **ash** | Male | Crisp | Confident | Business, leadership |
| **onyx** | Male | Deep | Serious | Authoritative, biography |
| **sage** | Male | Mature | Wise | Philosophy, academic |

### Selection Criteria

1. **Author Gender Matching** (25 points)
2. **Genre Appropriateness** (15 points per match)
3. **Authority Level** (10 points)
4. **Content Style** (15 points)
5. **Tone Matching** (10 points)
6. **Business/Finance Bonus** (20 points)
7. **Self-help Bonus** (15 points)

### Example Results

- **Rich Dad Poor Dad** → `ash` (95% confidence) - Business + Male author
- **Sapiens** → `onyx` (95% confidence) - Authoritative history
- **Atomic Habits** → `ash` (90% confidence) - Professional development
- **Mindfulness Book** → `echo` (85% confidence) - Wellness content

## Testing

### Run Comprehensive Tests

```bash
cd scripts/Audio
node testProviderSystem.js
```

### Test with Mock Data

```bash
cd scripts/Audio  
node testWithMockData.js
```

### Test Individual Providers

```javascript
import { AzureVoiceSelector } from './pipeline/providers/AzureVoiceSelector.js';

const provider = new AzureVoiceSelector();
const available = await provider.isAvailable();
const validation = provider.validateConfig();

console.log('Available:', available);
console.log('Valid config:', validation.valid);
```

## Troubleshooting

### Azure OpenAI Issues

**Problem**: "Azure OpenAI configuration incomplete"  
**Solution**: Check environment variables are set correctly

**Problem**: "Azure OpenAI availability check failed"  
**Solution**: Verify endpoint, API key, and deployment ID

### Ollama Issues

**Problem**: "Ollama availability check failed"  
**Solution**:

1. Check Ollama is running: `ollama list`
2. Verify model is available: `ollama pull llama2`
3. Check endpoint is accessible: `curl http://localhost:11434/api/tags`

**Problem**: "Model not found"  
**Solution**: Pull the required model: `ollama pull <model-name>`

### General Issues

**Problem**: All providers failing  
**Solution**: System will automatically fall back to rule-based selection

**Problem**: Low confidence scores  
**Solution**: Check book metadata quality and completeness

## Migration from Old System

The new system is backward compatible. Existing code will continue to work, but you can now:

1. **Add provider configuration** to `audioConfig.js`
2. **Set environment variables** for Azure/Ollama
3. **Switch providers** as needed
4. **Benefit from improved fallbacks**

### Old Usage (still works)

```javascript
const voiceSelector = new VoiceSelector();
const result = await voiceSelector.selectVoiceForBook('1159');
```

### New Usage (recommended)

```javascript
const voiceSelector = new VoiceSelector(audioConfig.voiceSelection);
const result = await voiceSelector.selectVoiceForBook('1159');
```

## Best Practices

1. **Use Azure for production** - Best quality and reliability
2. **Use Ollama for development** - Cost-effective and private
3. **Always configure fallbacks** - Ensure system reliability
4. **Monitor provider status** - Check availability regularly
5. **Test with your data** - Validate voice selections make sense
6. **Keep metadata complete** - Better metadata = better voice selection

## Future Enhancements

- Support for additional LLM providers (OpenAI, Anthropic, etc.)
- Voice selection based on audio samples
- Custom voice training integration
- A/B testing for voice selection algorithms
- Real-time voice switching during generation

---

🚀 **The enhanced voice selection system is now ready for production use!**
