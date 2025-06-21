# Azure Speech Services Integration

Complete integration of Azure Speech Services with your audiobook generation pipeline, featuring 14 favorite voices, advanced SSML, and intelligent voice selection.

## 🎯 Overview

This integration transforms your audiobook generation from basic TTS to professional-quality audio with:

- **14 Favorite Voices** from Azure Speech Playground
- **UK English Priority** (en-GB first, en-US fallback)
- **Advanced SSML** with voice styles and emotional expression
- **Intelligent Voice Selection** based on content analysis
- **Automatic Fallback** to Azure OpenAI TTS
- **Enhanced Text Optimization** for natural speech patterns

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Audio Generation Pipeline                │
├─────────────────────────────────────────────────────────────┤
│  📝 Text Input                                              │
│      ↓                                                      │
│  🧠 TextOptimizer (Azure Speech SSML)                      │
│      ↓                                                      │
│  🏭 TTSProviderFactory                                      │
│      ├── 🎤 Azure Speech Services (Primary)                │
│      └── 🔄 Azure OpenAI TTS (Fallback)                    │
│      ↓                                                      │
│  🎵 Audio Output                                            │
└─────────────────────────────────────────────────────────────┘
```

## 🎤 Your 14 Favorite Voices

### **Multilingual Neural Voices (UK English Priority)**

1. **Andrew Multilingual** - Professional, authoritative
2. **Nova Turbo Multilingual** - Energetic, engaging  
3. **Emma Multilingual** - Warm, empathetic
4. **Brandon Multilingual** - Friendly, casual
5. **Steffan Multilingual** - Smooth, conversational
6. **Adam Multilingual** - Deep, authoritative
7. **Amanda Multilingual** - Clear, professional
8. **Derek Multilingual** - Confident, engaging
9. **Alloy Turbo Multilingual** - Clear, versatile

### **High-Definition & Specialized Voices**

10. **Andrew Dragon HD** - Premium quality variant
11. **Aria** - Cheerful, upbeat (UK)
12. **Jane** - Professional, formal (UK)

### **US-Only Voices (Fallback)**

13. **Jason** - Casual, friendly (US)
14. **Davis** - Deep, authoritative (US)

## 🎭 Voice Styles & Features

### **Available Voice Styles**

- `conversational` - Natural, friendly conversation
- `friendly` - Warm, welcoming tone
- `hopeful` - Optimistic, inspiring delivery
- `cheerful` - Upbeat, positive energy
- `empathetic` - Understanding, compassionate
- `calm` - Peaceful, relaxed delivery

### **Advanced SSML Features**

- **Voice Styles** - Emotional expression control
- **Prosody Control** - Rate, pitch, volume adjustment
- **Strategic Breaks** - Leading/tailing silence
- **Emphasis** - Key term highlighting
- **Pronunciation** - IPA phoneme control

## 🚀 Quick Start

### 1. Environment Setup

Update your `.env` file with Azure Speech credentials:

```bash
# Azure Speech Services (Primary TTS Provider)
AZURE_SPEECH_ENDPOINT=https://YOUR_REGION.api.cognitive.microsoft.com/
AZURE_SPEECH_KEY=your_primary_key_here
AZURE_SPEECH_REGION=your_region_here
```

### 2. Test Voice Availability

```bash
# Test all 14 favorite voices
node scripts/Audio/testAzureSpeechVoices.js

# Test complete integration
node scripts/Audio/testAzureSpeechIntegration.js
```

### 3. Generate Enhanced Audio

```javascript
import { getConfig } from './config/audioConfig.js';
import { TTSProviderFactory } from './pipeline/providers/TTSProviderFactory.js';

const config = getConfig('premium');
const ttsFactory = new TTSProviderFactory(config);

// Generate with Azure Speech Services
const result = await ttsFactory.generateTTS(
  "Your text content here",
  "./output/audio.mp3",
  {
    voice: 'andrew-multilingual',
    style: 'conversational',
    provider: 'azure-speech'
  }
);
```

## 🧠 Intelligent Voice Selection

The system automatically selects optimal voices based on content analysis:

### **Content-Based Selection**

- **Introduction** → Emma Multilingual (friendly, welcoming)
- **Motivational Content** → Nova Turbo Multilingual (cheerful, energetic)
- **Serious Topics** → Adam Multilingual (calm, authoritative)
- **Emotional Content** → Emma Multilingual (empathetic)
- **Conclusion** → Nova Turbo Multilingual (hopeful, inspiring)

### **Voice Recommendation Example**

```javascript
const recommendation = ttsFactory.analyzeContentForOptimalProvider(
  "Financial literacy is the foundation of wealth building...",
  "chapter"
);

console.log(recommendation);
// {
//   voice: 'andrew-multilingual',
//   style: 'conversational',
//   confidence: 0.8,
//   reasoning: 'Selected based on chapter section and content analysis'
// }
```

## 🎵 Enhanced SSML Generation

### **Azure Speech SSML Example**

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
       xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-GB">
  <voice name="en-GB-AndrewMultilingualNeural">
    <mstts:express-as style="conversational">
      <prosody rate="0.95" pitch="medium">
        <mstts:silence type="Leading" value="500ms"/>
        Welcome to this transformative journey into 
        <emphasis level="moderate">financial literacy</emphasis>.
        <break time="800ms"/>
        The key concept is understanding how 
        <emphasis level="strong">money works for you</emphasis>.
        <mstts:silence type="Tailing" value="1000ms"/>
      </prosody>
    </mstts:express-as>
  </voice>
</speak>
```

### **Text Optimization for Azure Speech**

```javascript
import { TextOptimizer } from './pipeline/textOptimizer.js';

const optimizer = new TextOptimizer();

const enhancedSSML = await optimizer.optimizeForListening(
  "Your book content here",
  "chapter",
  {
    enableSSML: true,
    provider: 'azure-speech',
    voice: 'andrew-multilingual'
  }
);
```

## 🔧 Configuration

### **Audio Configuration**

```javascript
// scripts/Audio/config/audioConfig.js
export const audioConfig = {
  tts: {
    provider: 'azure-speech',        // Primary provider
    fallbackProvider: 'azure-openai', // Fallback provider
    
    azureSpeech: {
      preferredLocale: 'en-GB',      // UK English first
      fallbackLocale: 'en-US',       // US English fallback
      defaultVoice: 'andrew-multilingual',
      outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
      
      // Voice styles for different content
      voiceStyles: {
        introduction: 'friendly',
        chapter: 'conversational',
        conclusion: 'hopeful',
        motivational: 'cheerful',
        serious: 'calm',
        emotional: 'empathetic'
      }
    }
  }
};
```

### **Processing Presets**

```javascript
import { getConfig } from './config/audioConfig.js';

// Fast processing
const fastConfig = getConfig('fast');

// Balanced quality
const balancedConfig = getConfig('balanced');

// Premium quality
const premiumConfig = getConfig('premium');
```

## 🔄 Provider Fallback System

The system automatically falls back to Azure OpenAI TTS if Azure Speech Services fails:

```javascript
// Automatic fallback in action
const result = await ttsFactory.generateTTS(text, outputPath, options);

if (result.usedFallback) {
  console.log(`Fallback used: ${result.originalProvider} → ${result.provider}`);
}
```

## 📊 Testing & Validation

### **Voice Testing Script**

```bash
# Test all 14 voices with different styles
node scripts/Audio/testAzureSpeechVoices.js
```

**Output:**

- Voice availability report
- Audio samples for each voice
- Style compatibility testing
- Performance metrics

### **Integration Testing Script**

```bash
# Test complete pipeline integration
node scripts/Audio/testAzureSpeechIntegration.js
```

**Output:**

- Provider factory functionality
- Intelligent voice selection
- Enhanced SSML generation
- Complete pipeline testing

## 🎯 Voice Selection Guide

### **By Content Type**

| Content Type | Recommended Voice | Style | Use Case |
|--------------|------------------|-------|----------|
| Introduction | Emma Multilingual | friendly | Welcoming, warm opening |
| Business/Finance | Andrew Multilingual | conversational | Professional authority |
| Motivational | Nova Turbo Multilingual | cheerful | Energetic, inspiring |
| Storytelling | Brandon Multilingual | friendly | Casual, engaging |
| Serious Topics | Adam Multilingual | calm | Documentary-style |
| Emotional Content | Emma Multilingual | empathetic | Personal, touching |
| Conclusion | Nova Turbo Multilingual | hopeful | Inspiring finish |

### **By Voice Characteristics**

| Voice | Gender | Accent | Best For |
|-------|--------|--------|----------|
| Andrew Multilingual | Male | UK | Professional, authoritative |
| Nova Turbo Multilingual | Female | UK | Energetic, dynamic |
| Emma Multilingual | Female | UK | Warm, empathetic |
| Brandon Multilingual | Male | UK | Friendly, casual |
| Adam Multilingual | Male | UK | Deep, serious |
| Aria | Female | UK | Cheerful, upbeat |

## 🚨 Troubleshooting

### **Common Issues**

1. **Voice Not Available**

   ```
   Error: Unknown voice 'voice-name'
   ```

   **Solution:** Check voice availability in your Azure region

2. **SSML Validation Failed**

   ```
   Warning: SSML validation failed, returning plain text
   ```

   **Solution:** Check SSML syntax and tag nesting

3. **Provider Initialization Failed**

   ```
   Error: Azure Speech endpoint is required
   ```

   **Solution:** Update `.env` with correct credentials

### **Debugging Steps**

1. **Check Credentials**

   ```bash
   echo $AZURE_SPEECH_ENDPOINT
   echo $AZURE_SPEECH_KEY
   echo $AZURE_SPEECH_REGION
   ```

2. **Test Voice Availability**

   ```bash
   node scripts/Audio/testAzureSpeechVoices.js
   ```

3. **Validate Configuration**

   ```javascript
   import { validateConfig } from './config/audioConfig.js';
   const validation = validateConfig(config);
   console.log(validation);
   ```

## 📈 Performance Optimization

### **Rate Limiting**

- 2-second delay between voice tests
- 1-second delay between TTS requests
- Batch processing for multiple files

### **Caching**

- Text optimization caching (30 days)
- Smart cache invalidation
- Optimized text reuse

### **Quality Settings**

- **Fast:** 96k bitrate, basic optimization
- **Balanced:** 128k bitrate, full features
- **Premium:** 192k bitrate, maximum quality

## 🎉 Benefits

### **Audio Quality Improvements**

- ✅ **Professional Voice Quality** - Neural voices vs synthetic
- ✅ **Emotional Expression** - Voice styles and prosody
- ✅ **Natural Speech Patterns** - Enhanced text optimization
- ✅ **Strategic Pacing** - Intelligent breaks and emphasis
- ✅ **Consistent Quality** - Reliable voice availability

### **Development Benefits**

- ✅ **Automatic Fallback** - Never fails completely
- ✅ **Intelligent Selection** - Content-aware voice matching
- ✅ **Easy Integration** - Drop-in replacement
- ✅ **Comprehensive Testing** - Built-in validation
- ✅ **Future-Proof** - Extensible architecture

## 🔮 Future Enhancements

### **Planned Features**

- [ ] Custom voice training integration
- [ ] Real-time voice style adjustment
- [ ] Multi-language support expansion
- [ ] Advanced emotion detection
- [ ] Voice cloning capabilities

### **Advanced SSML Features**

- [ ] Pitch contour patterns
- [ ] Advanced pronunciation control
- [ ] Custom lexicon integration
- [ ] Voice morphing effects
- [ ] Spatial audio support

---

## 📞 Support

For issues or questions:

1. Check the troubleshooting section above
2. Run the test scripts to validate setup
3. Review Azure Speech Services documentation
4. Check voice availability in your region

**Happy audiobook generation with Azure Speech Services! 🎧✨**
