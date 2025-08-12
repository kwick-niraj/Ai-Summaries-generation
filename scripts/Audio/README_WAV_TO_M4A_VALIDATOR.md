# WAV to M4A Validator and Converter

A comprehensive system for validating audio completeness against summary files and converting WAV audiobooks to M4A format with embedded chapter metadata.

## Overview

This system ensures that only complete audiobooks (with all required sections) are converted from WAV to M4A format. It validates that every section mentioned in the summary file has a corresponding audio file before proceeding with conversion.

## Features

- ✅ **Summary Parsing**: Extracts sections from markdown summary files (Introduction, Chapters, Conclusion)
- 🎵 **Audio Validation**: Verifies all required audio files exist before conversion
- 📀 **M4A Conversion**: Converts complete WAV files to M4A with 64kbps quality
- 📊 **Chapter Metadata**: Embeds chapter information from processing reports
- 📋 **Comprehensive Tracking**: JSON-based tracking system with detailed status reporting
- 🔄 **Batch Processing**: Process multiple books at once
- 🔍 **Dry Run Mode**: Preview what would be processed without actual conversion

## Directory Structure

```
scripts/Audio/
├── wavToM4aValidator.js          # Main script
├── tracker.json                  # Tracking database
├── m4a_audio/                    # Output directory for M4A files
├── modules/
│   ├── summaryParser.js          # Parses markdown summary files
│   ├── audioValidator.js         # Validates audio completeness
│   └── trackingManager.js        # Manages tracking system
├── pipeline/
│   └── formatConverter.js        # Existing M4A conversion logic
└── output/                       # Input WAV files directory
    └── {book_ID}/
        ├── {book_ID}_complete.wav
        ├── introduction.wav
        ├── chapter_01.wav
        ├── chapter_02.wav
        └── ...
```

## Installation & Setup

1. **Prerequisites**:
   - Node.js with ES modules support
   - FFmpeg installed and available in PATH
   - Existing audio files in `scripts/Audio/output/{book_ID}/`
   - Summary files in `scripts/FinalAllSummaries/{book_ID}.md`

2. **Dependencies**: All required dependencies are already installed in the project.

## Usage

### Command Line Options

```bash
# Process single book
node wavToM4aValidator.js --book-id 2301

# Batch process all pending books
node wavToM4aValidator.js --batch

# Dry run to preview processing
node wavToM4aValidator.js --dry-run --book-id 2301

# Check status of all books
node wavToM4aValidator.js --status

# Force reprocess already converted books
node wavToM4aValidator.js --batch --force

# Verbose output with detailed information
node wavToM4aValidator.js --book-id 2301 --verbose

# Show help
node wavToM4aValidator.js --help
```

### Examples

```bash
# Test a specific book with verbose output
cd scripts/Audio
node wavToM4aValidator.js --book-id 2301 --verbose

# Batch process with dry run
node wavToM4aValidator.js --batch --dry-run

# Convert all pending books
node wavToM4aValidator.js --batch

# Check current status
node wavToM4aValidator.js --status
```

## Validation Process

### 1. Summary Parsing

The system parses markdown files and identifies sections using various header formats:

- `## Introduction`
- `## Chapter 1 "Title"`
- `**Conclusion: Title**`
- And other variations

### 2. Audio File Validation

For each section found in the summary, the system checks for corresponding audio files:

- `introduction.wav` for Introduction sections
- `chapter_01.wav`, `chapter_02.wav`, etc. for Chapter sections
- `conclusion.wav` for Conclusion sections

### 3. Complete WAV File Check

Verifies that a complete merged WAV file exists (e.g., `2301_complete.wav`)

### 4. Conversion

Only if ALL validations pass:

- Converts the complete WAV file to M4A format
- Uses 'veryLow' quality (64kbps AAC)
- Embeds chapter metadata from processing reports
- Saves to `m4a_audio/{book_ID}_complete.m4a`

## Tracking System

The system maintains a comprehensive tracking database in `tracker.json`:

### Status Types

- **pending**: Not yet processed
- **validated**: Audio validation passed
- **converted**: Successfully converted to M4A
- **failed**: Conversion failed
- **rejected**: Audio validation failed

### Tracking Data

Each book entry includes:

- Status and timestamps
- Validation results (missing files, found files)
- Conversion metadata (file size, compression ratio)
- Error details and failure reasons
- Status history

### Example Tracker Entry

```json
{
  "2301": {
    "bookId": "2301",
    "status": "converted",
    "timestamp": "2025-01-12T14:30:00Z",
    "validation": {
      "summaryPath": "scripts/FinalAllSummaries/2301.md",
      "sectionsFound": ["introduction", "chapter_01", "chapter_02", ...],
      "audioFilesValidated": true,
      "missingFiles": []
    },
    "conversion": {
      "inputFile": "scripts/Audio/output/2301/2301_complete.wav",
      "outputFile": "scripts/Audio/m4a_audio/2301_complete.m4a",
      "fileSize": "15.2MB",
      "compressionRatio": 0.23,
      "chapterCount": 12
    }
  }
}
```

## Output Format

### M4A Files

- **Location**: `scripts/Audio/m4a_audio/{book_ID}_complete.m4a`
- **Quality**: 64kbps AAC (veryLow setting)
- **Metadata**: Embedded chapter information with timestamps
- **Compatibility**: Optimized for streaming with faststart flag

### Chapter Metadata

The system automatically embeds chapter metadata including:

- Chapter titles from processing reports
- Accurate timestamps for navigation
- Book metadata (title, artist, album)

## Error Handling

### Common Rejection Reasons

1. **missing_summary**: Summary file not found
2. **incomplete_audio**: Missing audio files for some sections
3. **missing_complete_wav**: No complete WAV file found
4. **conversion_failed**: FFmpeg conversion error

### Troubleshooting

- Check that summary files exist in `scripts/FinalAllSummaries/`
- Verify all required audio files are present
- Ensure FFmpeg is installed and accessible
- Check file permissions for output directory

## Quality Settings

The system uses the 'veryLow' quality preset:

- **Bitrate**: 64kbps AAC
- **Sample Rate**: 44.1kHz
- **Channels**: Mono
- **Profile**: AAC Low Complexity
- **Optimization**: Faststart for streaming

This provides good quality for audiobooks while keeping file sizes small.

## Monitoring & Reporting

### Status Reports

```bash
# View current status
node wavToM4aValidator.js --status
```

Shows:

- Total books processed
- Status breakdown with percentages
- Recent activity
- Failed/rejected books with reasons

### Batch Results

After batch processing, the system provides:

- Total books processed
- Success/failure counts
- Detailed error list
- Processing time and statistics

## Integration

### With Existing Audio Pipeline

The system integrates seamlessly with the existing audio generation pipeline:

- Uses existing `FormatConverter` class
- Reads processing reports for metadata
- Maintains compatibility with current file structure

### With Tracking Systems

- Can be integrated with existing CSV trackers
- Provides JSON export/import functionality
- Supports cleanup of old entries

## Best Practices

1. **Always run dry-run first** to preview what will be processed
2. **Check status regularly** to monitor progress and catch issues
3. **Use batch processing** for efficiency when processing multiple books
4. **Keep original WAV files** (system preserves them by default)
5. **Monitor disk space** as M4A files are created in addition to WAV files

## Maintenance

### Cleanup Old Entries

```javascript
// Remove failed/rejected entries older than 30 days
const trackingManager = new TrackingManager();
const removedCount = trackingManager.cleanupOldEntries(30);
```

### Export/Import Data

```javascript
// Export tracking data
trackingManager.exportData('backup.json');

// Import and merge data
trackingManager.importData('backup.json', true);
```

## Support

For issues or questions:

1. Check the error messages in the tracking system
2. Verify file structure and permissions
3. Test with a single book using dry-run mode
4. Check FFmpeg installation and PATH

## Version History

- **v1.0.0**: Initial release with complete validation and conversion system
- Comprehensive tracking with JSON persistence
- Integration with existing FormatConverter
- Support for various summary formats and audio file patterns
