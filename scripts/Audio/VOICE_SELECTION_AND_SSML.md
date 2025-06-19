# Voice Selection and SSML Enhancement

This document describes the new intelligent voice selection and SSML (Speech Synthesis Markup Language) features added to the audio generation pipeline.

## Overview

The enhanced audio pipeline now includes:

1. **Intelligent Voice Selection**: Automatically selects the optimal voice for each book based on author characteristics, genre, and content style
2. **Advanced SSML Generation**: Creates expressive speech markup with strategic breaks, emphasis, and prosody control
3. **Content-Aware Audio**: Different SSML patterns for introductions, chapters, and conclusions

## Features

### 🎤 Intelligent Voice Selection

The system analyzes book metadata to select the most appropriate voice:

#### Voice Classifications

| Voice | Gender | Tone | Style | Best For |
|-------|--------|------|-------|----------|
| **alloy** | Female | Warm | Grounded, Conversational | Self-help, Personal development, General audience |
| **coral** | Female | Bright | Young, Emotional | Motivational, Lifestyle, Youth-oriented |
| **echo** | Female | Soft | Calm, Gentle | Mindfulness, Wellness, Spiritual content |
| **fable** | Female | Playful | Storybook, Creative | Narrative, Creative, Storytelling |
| **nova** | Female | Friendly | Expressive, Approachable | General audience, Educational, Popular |
| **shimmer** | Female | Clear | Futuristic, Smooth | Technology, Innovation, Modern business |
| **ash** | Male | Crisp | Confident, Articulate | Business, Leadership, Professional |
| **onyx** | Male | Deep | Serious, Cinematic | Authoritative, Biography, Heavy topics |
| **sage** | Male | Mature | Wise, Experienced | Philosophy, Wisdom, Academic |

#### Selection Criteria

The voice selector analyzes:

- **Author Gender**: Matches voice gender to author when possible
- **Book Genre**: Maps genres to appropriate voice characteristics
- **Authority Level**: Uses authoritative voices for high-authority content
- **Content Style**: Matches conversational, narrative, or direct styles
- **Target Audience**: Considers professional vs. general audience

#### Example Selection

For "Rich Dad Poor Dad" by Robert Kiyosaki:

- **Author**: Male, Business/Finance expert
- **Genre**: Personal Finance, Business, Self-Help
- **Analysis**: High authority, conversational style
- **Selected Voice**: "ash" (crisp, confident, articulate male)
- **Confidence**: 85%
- **Reasoning**: "Matches author gender (male); Strong genre match: business, professional; Authoritative voice for high-authority content"

### 🎵 Advanced SSML Generation

#### Strategic Breaks (Minimal Approach)

✅ **Good Break Usage**:

- Between major sections (Introduction → Chapter 1)
- Between distinct paragraphs with different concepts
- After key statements that need emphasis
- Before/after important quotes or examples

❌ **Avoided**:

- After every sentence
- Within the same paragraph
- Between related sentences
- During natural speech flow

#### Content-Aware Patterns

**Introduction Pattern**:

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
<prosody rate="0.95" pitch="medium">
Welcome to Rich Dad Poor Dad. This book will challenge everything you thought you knew about money and wealth building.
<break time="1.2s"/>
Let's begin this transformative journey.
</prosody>
<break time="1.5s"/>
</speak>
```

**Key Concept Pattern**:

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
<prosody rate="1.0" pitch="medium">
The most important principle is this: <emphasis level="moderate">assets</emphasis> put money in your pocket, while <emphasis level="moderate">liabilities</emphasis> take money out.
<break time="0.8s"/>
Understanding this distinction will change your financial future.
</prosody>
<break time="1.0s"/>
</speak>
```

#### Key Term Emphasis

The system automatically emphasizes important financial and business terms:

- assets, liabilities, cash flow, passive income
- financial freedom, investment, entrepreneur
- mindset, wealth building, financial education

## Usage

### Basic Usage

```javascript
import { BookProcessor } from './pipeline/bookProcessor.js';

const processor = new BookProcessor({
  intelligentVoiceSelection: true,  // Enable voice selection
  enableSSML: true,                 // Enable SSML generation
  metadataDir: 'Meta of All Books DB'
});

await processor.processBook('1159', 'FinalAllSummaries/1159.md');
```

### Configuration Options

```javascript
const processor = new BookProcessor({
  // Voice Selection
  intelligentVoiceSelection: true,    // Default: true
  voice: null,                        // Manual override (null = auto-select)
  metadataDir: 'Meta of All Books DB', // Metadata directory
  
  // SSML Generation
  enableSSML: true,                   // Default: true
  
  // Other options...
  inputDir: './FinalAllSummaries',
  outputDir: 'scripts/Audio/output',
  format: 'mp3',
  speed: 1.0
});
```

### Testing Voice Selection

```javascript
import { VoiceSelector } from './pipeline/voiceSelector.js';

const selector = new VoiceSelector();
const voiceConfig = await selector.selectVoiceForBook('1159', 'Meta of All Books DB');

console.log(`Selected: ${voiceConfig.selectedVoice}`);
console.log(`Confidence: ${voiceConfig.confidence}%`);
console.log(`Reasoning: ${voiceConfig.reasoning}`);
```

### Testing SSML Generation

```javascript
import { TextOptimizer } from './pipeline/textOptimizer.js';

const optimizer = new TextOptimizer();
const ssml = optimizer.generateSSML(
  "Welcome to this audiobook. This is a key concept.",
  'introduction',
  voiceConfig.ssmlConfig
);

console.log(ssml);
```

## Integration Points

### 1. BookProcessor Integration

The `BookProcessor` now includes:

- Voice selection step before text optimization
- SSML generation during text optimization
- Voice configuration passed to audio generation
- Voice selection results in processing reports

### 2. TextOptimizer Enhancement

- New `generateSSML()` method with validation
- Content-aware SSML patterns
- Strategic break placement
- Key term emphasis
- Fallback to plain text if SSML fails

### 3. AudioGenerator Updates

- SSML input detection and handling
- Automatic fallback to plain text if SSML fails
- Enhanced logging for SSML vs. plain text generation

## Output and Reporting

### Processing Reports

Each book's processing report now includes:

```json
{
  "voiceSelection": {
    "selectedVoice": "ash",
    "confidence": 85,
    "reasoning": "Matches author gender (male); Strong genre match: business, professional",
    "analysis": {
      "authorGender": "male",
      "genres": ["personal finance", "business", "self-help"],
      "authorityLevel": "high",
      "contentStyle": "conversational"
    },
    "ssmlEnabled": true,
    "intelligentSelection": true
  },
  "features": {
    "intelligentVoiceSelection": true,
    "ssmlGeneration": true,
    "expressiveAudio": true
  }
}
```

### Audio File Metadata

Generated audio files include:

- Voice used for generation
- Whether SSML was applied
- Fallback information if SSML failed

## Testing

Run the test script to verify functionality:

```bash
cd scripts/Audio
node testVoiceSelection.js
```

This will test:

- Voice selection for sample books
- SSML generation for different section types
- Batch voice selection
- Error handling and fallbacks

## Error Handling

The system includes robust error handling:

1. **Voice Selection Fallback**: If metadata is missing or voice selection fails, defaults to 'nova'
2. **SSML Validation**: Validates SSML syntax before sending to TTS
3. **TTS Fallback**: If SSML fails at TTS level, automatically retries with plain text
4. **Graceful Degradation**: System continues to work even if advanced features fail

## Performance Considerations

- Voice selection adds ~1-2 seconds per book (one-time cost)
- SSML generation adds minimal overhead
- Metadata is cached for batch processing
- Fallback mechanisms ensure reliability

## Future Enhancements

Potential improvements:

- Machine learning-based voice selection
- Custom SSML patterns per genre
- Voice cloning for specific authors
- Emotional tone detection and adjustment
- Multi-language voice selection

## Troubleshooting

### Common Issues

1. **Voice selection fails**: Check metadata directory path and file format
2. **SSML not working**: Verify Azure TTS supports SSML for selected voice
3. **Audio sounds robotic**: Check SSML validation and fallback logs

### Debug Mode

Enable detailed logging:

```javascript
const processor = new BookProcessor({
  enableSSML: true,
  intelligentVoiceSelection: true,
  // Add debug logging if needed
});
```

## Examples

### Example 1: Business Book (Male Author)

**Input**: "The 7 Habits of Highly Effective People" by Stephen Covey
**Selected Voice**: "sage" (mature, wise male voice)
**Reasoning**: Male author + leadership/self-help content + authoritative tone

### Example 2: Wellness Book (Female Author)

**Input**: "The Power of Now" by Eckhart Tolle
**Selected Voice**: "echo" (soft, calm voice)
**Reasoning**: Spiritual/mindfulness content + gentle approach

### Example 3: Technology Book

**Input**: "The Innovator's Dilemma" by Clayton Christensen
**Selected Voice**: "shimmer" (clear, futuristic voice)
**Reasoning**: Technology/innovation focus + modern business content

## Conclusion

The voice selection and SSML features significantly enhance the audio generation pipeline by:

1. **Improving Audio Quality**: More natural, expressive speech
2. **Matching Content to Voice**: Appropriate voice selection based on content
3. **Strategic Emphasis**: Key concepts are highlighted naturally
4. **Maintaining Reliability**: Robust fallback mechanisms ensure consistent operation

The system is designed to work seamlessly with existing workflows while providing significant improvements in audio quality and listener engagement.
