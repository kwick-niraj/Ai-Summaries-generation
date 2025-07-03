# Enhanced Error Handling System

## Overview

The book processing pipeline now includes comprehensive error handling that ensures individual API failures don't crash the entire system. When any API fails, the system will skip that book, mark it as failed with detailed error information, and continue processing the next book.

## Key Features

### 🛡️ Comprehensive Error Recovery

- **Text Optimization Failures**: When Azure OpenAI API fails → Skip book, log as `FAILED_TEXT_OPTIMIZATION`
- **Audio Generation Failures**: When Azure Speech/TTS API fails → Skip book, log as `FAILED_AUDIO_GENERATION`
- **Voice Selection Failures**: When voice selection fails → Fall back to default voice, continue processing
- **File Operation Failures**: When file read/write fails → Skip book, log as `FAILED_FILE_OPERATION`
- **Parsing Failures**: When markdown parsing fails → Skip book, log as `FAILED_PARSING`

### 📊 Enhanced CSV Tracking

The `book_processing_tracker.csv` now includes detailed status categories and error information:

#### New CSV Columns

- **Failure Stage**: Identifies exactly where the failure occurred
- **Error Message**: Specific error message from the API
- **Retry Attempts**: Number of retry attempts made
- **Status Categories**: Detailed failure classification

#### Status Categories

- `SUCCESS` - Complete success
- `FAILED_TEXT_OPTIMIZATION` - Text optimization API failed
- `FAILED_AUDIO_GENERATION` - Audio generation API failed
- `FAILED_VOICE_SELECTION` - Voice selection failed (rare, usually falls back)
- `FAILED_FILE_OPERATION` - File read/write operations failed
- `FAILED_PARSING` - Markdown parsing failed
- `FAILED_UNKNOWN` - Unknown error occurred
- `SKIPPED` - Already processed

### 🔄 Graceful Continuation

- **Sequential Processing**: Individual book failures don't stop the sequence
- **Batch Processing**: Individual book failures don't stop the entire batch
- **Non-Critical Failures**: Timestamp/metadata generation failures don't stop processing
- **Progress Tracking**: Real-time progress with success/failure counts

## Implementation Details

### Error Handling Flow

```javascript
// Example: Text Optimization Error Handling
try {
  optimizedSections = await this.optimizeBookSections(sections, voiceConfig, bookId, outputDir, inputPath, this.config.enableSSML);
  result.optimizedSections = optimizedSections;
} catch (optimizationError) {
  console.error(`❌ Text optimization API failed for book ${bookId}:`, optimizationError);
  result.success = false;
  result.errorDetails = {
    stage: 'text_optimization',
    error: optimizationError.message
  };
  result.endTime = new Date();
  
  // Log the failure and continue to next book
  if (this.processingTracker) {
    await this.processingTracker.logBookProcessing(result);
  }
  
  this.stats.failedBooks++;
  this.stats.processedBooks++;
  return result; // Skip to next book
}
```

### CSV Tracker Enhancements

```javascript
// Enhanced status determination
let status = 'SUCCESS';
let failureStage = null;
let errorMessage = null;

if (!result.success) {
  if (result.skipped) {
    status = 'SKIPPED';
  } else if (result.errorDetails) {
    switch (result.errorDetails.stage) {
      case 'text_optimization':
        status = 'FAILED_TEXT_OPTIMIZATION';
        break;
      case 'audio_generation':
        status = 'FAILED_AUDIO_GENERATION';
        break;
      // ... other cases
    }
    failureStage = result.errorDetails.stage;
    errorMessage = result.errorDetails.error;
  }
}
```

### Batch Processing Resilience

```javascript
// Enhanced batch processing with individual error handling
const batchPromises = batch.map(({ bookId, filePath }) => 
  this.processBook(bookId, filePath)
    .then(result => {
      // Log individual book result within batch
      if (result.success) {
        console.log(`✅ [Batch ${batchNumber}] Book ${bookId} completed successfully`);
      } else {
        console.log(`❌ [Batch ${batchNumber}] Book ${bookId} failed: ${result.errorDetails?.error}`);
      }
      return result;
    })
    .catch(error => {
      // Handle unexpected errors
      console.error(`💥 [Batch ${batchNumber}] Unexpected error processing book ${bookId}:`, error);
      // Return failed result to maintain consistency
      return {
        bookId,
        success: false,
        errorDetails: { stage: 'batch_processing_error', error: error.message }
      };
    })
);
```

## Usage Examples

### Running with Error Handling

```javascript
import { BookProcessor } from './pipeline/bookProcessor.js';

const processor = new BookProcessor({
  inputDir: './FinalAllSummaries',
  outputDir: './scripts/Audio/output',
  logDir: './scripts/Audio/logs',
  trackProcessing: true, // Enable CSV tracking
  skipExisting: true,
  concurrency: 1, // Sequential processing
  enableSSML: true,
  intelligentVoiceSelection: true
});

// Process all books with error handling
const results = await processor.processAllBooks();
```

### Monitoring Progress

The system provides real-time progress updates:

```
📊 Progress: 15/100 books
📈 Current stats: ✅ 12 successful, ❌ 2 failed, ⏭️ 1 skipped

❌ Book 42 failed: Azure OpenAI API rate limit exceeded
🔄 Continuing to next book despite error in 42...

✅ Book 43 completed successfully
```

### CSV Output Example

```csv
Book ID,Input File Path,Timestamp,Status,Failure Stage,Error Message,Retry Attempts,Total Audio Files,Total Audio Duration (s),Processing Time (ms),Error Details
42,FinalAllSummaries/42.md,2025-07-03T02:00:00.000Z,FAILED_TEXT_OPTIMIZATION,text_optimization,Azure OpenAI API rate limit exceeded,0,0,0,15000,"{""stage"":""text_optimization"",""error"":""Azure OpenAI API rate limit exceeded""}"
43,FinalAllSummaries/43.md,2025-07-03T02:05:00.000Z,SUCCESS,,,0,12,1800,120000,
44,FinalAllSummaries/44.md,2025-07-03T02:06:00.000Z,FAILED_AUDIO_GENERATION,audio_generation,Azure Speech API authentication failed,0,0,0,30000,"{""stage"":""audio_generation"",""error"":""Azure Speech API authentication failed""}"
```

## Benefits

### ✅ System Resilience

- No more pipeline crashes due to individual book failures
- Automatic continuation to next book on failure
- Graceful degradation for non-critical failures

### ✅ Detailed Tracking

- Comprehensive error categorization
- Specific failure stage identification
- Detailed error messages and timing

### ✅ Operational Efficiency

- Real-time progress monitoring
- Clear success/failure statistics
- Easy identification of problematic books

### ✅ Debugging Support

- Detailed error logs with stack traces
- CSV export for analysis
- Processing statistics and reports

## Testing

Run the error handling test to verify functionality:

```bash
node scripts/Audio/testErrorHandling.js
```

This will:

1. Test CSV tracker with different failure scenarios
2. Generate processing statistics
3. Demonstrate error handling configuration
4. Show all supported error categories

## Configuration Options

### Error Handling Settings

```javascript
const processor = new BookProcessor({
  // Core error handling
  trackProcessing: true,        // Enable CSV tracking
  skipExisting: true,          // Skip already processed books
  
  // Processing mode
  concurrency: 1,              // Sequential (1) vs batch (>1)
  
  // Fallback options
  voice: 'nova',               // Default voice for fallback
  enableSSML: true,            // Enable SSML generation
  intelligentVoiceSelection: true, // Enable voice selection with fallback
  
  // Retry and timing
  maxRetries: 3,               // Future: retry attempts
  retryDelay: 5000,           // Future: delay between retries
});
```

## Future Enhancements

### Planned Features

- **Retry Logic**: Automatic retry for transient failures
- **Rate Limiting**: Built-in rate limiting for API calls
- **Health Checks**: Pre-processing API health verification
- **Recovery Mode**: Resume processing from last successful book
- **Alert System**: Email/webhook notifications for critical failures

### Monitoring Dashboard

- Real-time processing dashboard
- Error trend analysis
- API health monitoring
- Performance metrics

## Troubleshooting

### Common Issues

1. **High Failure Rate**
   - Check API credentials and quotas
   - Verify network connectivity
   - Review error messages in CSV

2. **Processing Stops**
   - Check for critical system errors
   - Verify disk space and permissions
   - Review processing logs

3. **Inconsistent Results**
   - Check input file formats
   - Verify configuration settings
   - Review voice selection logs

### Error Analysis

Use the CSV tracker statistics to analyze patterns:

```javascript
import { BookProcessingTracker } from './pipeline/csvTracker.js';

const tracker = new BookProcessingTracker('./scripts/Audio/logs');
const stats = await tracker.getProcessingStats();

console.log('Failure breakdown:', stats.failureBreakdown);
// Example output:
// {
//   "FAILED_TEXT_OPTIMIZATION": 5,
//   "FAILED_AUDIO_GENERATION": 2,
//   "FAILED_PARSING": 1
// }
```

## Conclusion

The enhanced error handling system ensures robust, reliable book processing with comprehensive failure tracking and automatic recovery. The system can now handle API failures gracefully while providing detailed insights into processing results and failure patterns.
