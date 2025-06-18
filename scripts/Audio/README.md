# Enhanced Audio Generation Pipeline

A comprehensive system for converting book summaries from markdown to high-quality audio files using Azure OpenAI TTS.

## 🎯 Overview

This pipeline processes book summaries stored as markdown files and generates professional-quality audiobooks with the following features:

- **Structure-aware processing**: Automatically identifies Introduction, Chapters, and Conclusion sections
- **AI-powered text optimization**: Converts text for natural speech patterns
- **Batch processing**: Handles 160+ books automatically
- **Audio combination**: Creates complete audiobooks from individual sections
- **Robust error handling**: Graceful failure recovery and resume capability
- **Comprehensive logging**: Detailed progress tracking and reporting

## 📁 Project Structure

```
scripts/Audio/
├── pipeline/
│   ├── markdownParser.js      # Structure-aware markdown parsing
│   ├── textOptimizer.js       # AI-powered text optimization
│   ├── audioGenerator.js      # TTS generation and audio combination
│   └── bookProcessor.js       # Main orchestration logic
├── config/
│   └── audioConfig.js         # Configuration and presets
├── utils/
│   └── helpers.js             # Utility functions
├── output/                    # Generated audio files
├── logs/                      # Processing logs and reports
├── runFullPipeline.js         # Main execution script
├── testPipeline.js           # Test suite
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v16 or higher)
2. **Azure OpenAI API** access with TTS capabilities
3. **FFmpeg** (for audio combination - optional but recommended)

### Environment Setup

Create a `.env` file in the `scripts/` directory:

```env
AZURE_OPENAI_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_ID=your_deployment_id
```

### Installation

```bash
# Install dependencies (if not already installed)
npm install

# Test the pipeline
cd scripts/Audio
node testPipeline.js

# Run a dry run to see what would be processed
node runFullPipeline.js --dry-run

# Test with a single book
node runFullPipeline.js --test 12

# Process all books with default settings
node runFullPipeline.js
```

## 📖 Usage Guide

### Basic Commands

```bash
# Process all books with balanced quality (default)
node runFullPipeline.js

# Use premium quality settings
node runFullPipeline.js --preset premium

# Fast processing with basic quality
node runFullPipeline.js --preset fast

# Custom voice and speed
node runFullPipeline.js --voice nova --speed 1.2

# Skip confirmation prompts
node runFullPipeline.js --yes
```

### Advanced Options

```bash
# Process with custom settings
node runFullPipeline.js \
  --voice shimmer \
  --speed 1.1 \
  --format mp3 \
  --concurrency 2 \
  --no-optimize

# Test single book with verbose output
node runFullPipeline.js --test 12 --verbose

# Process specific directory
node runFullPipeline.js \
  --input /path/to/summaries \
  --output /path/to/audio

# Don't combine individual files
node runFullPipeline.js --no-combine

# Don't skip existing files
node runFullPipeline.js --no-skip
```

### Available Voices

| Voice | Description | Best For |
|-------|-------------|----------|
| `alloy` | Neutral, balanced | General content, business |
| `echo` | Clear, professional | Presentations, formal content |
| `fable` | Warm, storytelling | Narratives, fiction |
| `nova` | Friendly, conversational | Audiobooks, tutorials |
| `onyx` | Deep, authoritative | Documentaries, serious content |
| `shimmer` | Expressive, engaging | Entertainment, dynamic content |

## ⚙️ Configuration

### Presets

The pipeline includes several built-in presets:

#### `balanced` (default)

- Text optimization: Enabled
- Quality: 128k bitrate
- Processing: Sequential
- Best for: Most use cases

#### `fast`

- Text optimization: Disabled
- Quality: 96k bitrate
- Processing: Concurrent (2 books)
- Best for: Quick processing

#### `premium`

- Text optimization: Enabled
- Quality: 192k bitrate @ 44.1kHz
- Processing: Sequential with longer delays
- Best for: Highest quality output

#### `test`

- Minimal processing
- Separate output directory
- Best for: Development and testing

### Custom Configuration

You can override any setting:

```javascript
// In audioConfig.js
export const customConfig = {
  voice: 'nova',
  speed: 1.1,
  format: 'mp3',
  maxChunkLength: 3500,
  combineAudio: true,
  optimizeText: true,
  // ... other options
};
```

## 📊 Output Structure

For each book (e.g., book ID `12`):

```
scripts/Audio/output/12/
├── introduction.mp3           # Introduction audio
├── chapter_01.mp3            # Chapter 1 audio
├── chapter_02.mp3            # Chapter 2 audio
├── ...
├── conclusion.mp3            # Conclusion audio
├── 12_complete.mp3           # Combined full audiobook
└── processing_report.json    # Processing details
```

## 🔧 Advanced Features

### Text Optimization

The pipeline uses AI to optimize text for natural speech:

- Converts abbreviations (e.g., "e.g." → "for example")
- Improves sentence flow and rhythm
- Removes meta-commentary
- Adds natural transitions
- Handles punctuation for speech

### Error Handling

- **Automatic retries** for failed API calls
- **Graceful degradation** when AI optimization fails
- **Resume capability** to continue from where it left off
- **Detailed error logging** for troubleshooting

### Progress Tracking

- Real-time progress updates
- Estimated completion times
- Detailed processing logs
- Individual book reports
- Final summary statistics

## 🧪 Testing

### Run Test Suite

```bash
node testPipeline.js
```

Tests include:

- Configuration validation
- Markdown parsing
- Text optimization
- Audio generation setup
- End-to-end workflow

### Test Single Book

```bash
# Test specific book
node runFullPipeline.js --test 12

# Test with different settings
node runFullPipeline.js --test 12 --voice fable --speed 0.9
```

## 📋 Monitoring and Logs

### Log Files

- `scripts/Audio/logs/processing_*.log` - Processing progress
- `scripts/Audio/logs/final_report_*.json` - Final statistics
- `scripts/Audio/logs/summary_*.txt` - Human-readable summary

### Processing Reports

Each book generates a detailed report:

```json
{
  "bookId": "12",
  "success": true,
  "processingTime": 45000,
  "stats": {
    "totalSections": 12,
    "totalWords": 8500,
    "totalAudioFiles": 12,
    "totalDuration": 3600
  },
  "audioFiles": {
    "total": 12,
    "successful": 12,
    "failed": 0
  }
}
```

## 🚨 Troubleshooting

### Common Issues

#### "No markdown files found"

- Check that files are in `./FinalAllSummaries/`
- Ensure files have `.md` extension

#### "Missing environment variables"

- Verify `.env` file exists in `scripts/` directory
- Check all required variables are set

#### "FFmpeg not found"

- Install FFmpeg for audio combination
- Or use `--no-combine` to disable

#### "API rate limits"

- Reduce `concurrency` setting
- Increase `delayBetweenRequests`

#### "Text optimization failed"

- Check Azure OpenAI API access
- Use `--no-optimize` to disable AI optimization

### Debug Mode

```bash
# Enable verbose logging
node runFullPipeline.js --verbose

# Test individual components
node testPipeline.js

# Check configuration
node runFullPipeline.js --dry-run
```

## 📈 Performance Tips

### Optimize Processing Speed

1. **Use fast preset** for initial testing
2. **Increase concurrency** (but watch rate limits)
3. **Disable text optimization** for faster processing
4. **Skip existing files** to resume interrupted runs

### Optimize Quality

1. **Use premium preset** for best quality
2. **Enable text optimization** for natural speech
3. **Use appropriate voice** for content type
4. **Adjust speed** for optimal listening experience

### Manage Costs

1. **Use dry run** to estimate processing
2. **Test single books** before batch processing
3. **Monitor API usage** during processing
4. **Use fast preset** for development

## 🔄 Migration from Old System

If you have existing audio files from the old system:

1. **Backup existing files**
2. **Run dry run** to see what would be processed
3. **Use `--no-skip`** to regenerate all files
4. **Compare quality** between old and new versions

## 🤝 Contributing

### Adding New Features

1. Create new modules in `pipeline/` directory
2. Update configuration in `config/audioConfig.js`
3. Add tests in `testPipeline.js`
4. Update this README

### Reporting Issues

Include the following information:

- Command used
- Error messages
- Log files
- Environment details
- Sample input file (if relevant)

## 📄 License

This project is part of the book summaries audio generation system.

---

## 📞 Support

For issues or questions:

1. Check the troubleshooting section
2. Run the test suite
3. Review log files
4. Create an issue with detailed information

**Happy audio generation! 🎧**
