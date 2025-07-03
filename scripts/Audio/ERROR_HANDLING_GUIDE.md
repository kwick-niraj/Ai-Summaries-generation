# Enhanced Error Handling Guide

This guide explains the new robust error handling system implemented to address API failures in the audio processing pipeline.

## Problem Solved

Previously, when the text optimization API failed with "Audio optimization failed:", the system would silently fall back to basic text processing and continue, never marking the book as failed in the CSV tracker. This led to:

- ❌ No visibility into API failures
- ❌ Books appearing as "successful" when they actually failed
- ❌ No way to retry failed books
- ❌ Processing continuing with suboptimal results

## Solution Overview

The new error handling system provides:

- ✅ **Proper Error Detection**: API failures are now properly detected and propagated
- ✅ **Intelligent Retry Logic**: Configurable retry attempts with exponential backoff
- ✅ **Enhanced CSV Tracking**: Detailed failure logging with specific error types
- ✅ **Flexible Failure Modes**: Choose between strict and lenient processing
- ✅ **Comprehensive Logging**: Full error details and retry attempts tracked

## Key Features

### 1. Enhanced Error Propagation

The `TextOptimizer` now properly throws errors when API calls fail instead of silently falling back:

```javascript
// Before: Silent fallback
catch (error) {
  console.error('Audio optimization failed:', error);
  return this.applyAudioFormatting(this.cleanMarkdownText(text), sectionType);
}

// After: Proper error handling with retries
catch (error) {
  if (attempt === maxRetries && strictMode) {
    const enhancedError = new Error(`Audio optimization API failed after ${maxRetries} attempts: ${error.message}`);
    enhancedError.stage = 'text_optimization';
    throw enhancedError;
  }
}
```

### 2. Intelligent Retry Logic

- **Configurable Retries**: Set maximum retry attempts (default: 3)
- **Exponential Backoff**: Increasing delays between retries (1s, 2s, 4s...)
- **Retry Tracking**: All retry attempts are logged in CSV

### 3. Enhanced CSV Tracking

New failure status types in `book_processing_tracker.csv`:

| Status | Description |
|--------|-------------|
| `SUCCESS` | Book processed successfully |
| `SKIPPED` | Book was skipped (already processed) |
| `FAILED_TEXT_OPTIMIZATION_API` | Text optimization API failed |
| `FAILED_TEXT_OPTIMIZATION` | Text optimization failed (non-API) |
| `FAILED_AUDIO_GENERATION` | Audio generation failed |
| `FAILED_PARSING` | Markdown parsing failed |
| `FAILED_FILE_OPERATION` | File save/read operation failed |
| `FAILED_UNEXPECTED` | Unexpected error occurred |

### 4. Flexible Processing Modes

#### Strict Mode (Default)

- Stops processing book immediately on API failure
- Marks book as failed in CSV
- Continues to next book
- Best for production environments

#### Lenient Mode

- Attempts fallback processing on API failure
- Only fails if fallback also fails
- Useful for development/testing

## Configuration Options

### Command Line Options

```bash
# Strict mode (default) - stop on API failures
node runFullPipeline.js --strict-mode

# Lenient mode - continue with fallback on failures
node runFullPipeline.js --lenient-mode

# Configure retry behavior
node runFullPipeline.js --max-retries 5 --retry-delay 2000

# Test single book with error handling
node runFullPipeline.js --test 12 --strict-mode --max-retries 2
```

### Programmatic Configuration

```javascript
const processor = new BookProcessor({
  strictMode: true,        // Stop on API failures
  maxRetries: 3,          // Maximum retry attempts
  retryDelay: 1000,       // Base delay between retries (ms)
  trackProcessing: true   // Enable CSV tracking
});
```

## Usage Examples

### 1. Production Processing (Recommended)

```bash
# Process all books with strict error handling
node runFullPipeline.js --strict-mode --max-retries 3
```

This will:

- Stop processing any book that has API failures after 3 retries
- Log all failures to CSV with detailed error information
- Continue processing remaining books
- Provide clear visibility into which books failed and why

### 2. Development/Testing

```bash
# Test with lenient mode for development
node runFullPipeline.js --lenient-mode --test 12 --verbose
```

This will:

- Attempt fallback processing if API fails
- Show detailed error information
- Useful for testing and development

### 3. Retry Failed Books

After processing, you can identify failed books from the CSV and retry them:

```bash
# Check failed books
grep "FAILED_TEXT_OPTIMIZATION_API" scripts/Audio/logs/book_processing_tracker.csv

# Retry specific failed book
node runFullPipeline.js --test 123 --no-skip --max-retries 5
```

## Error Monitoring

### CSV Log Analysis

The CSV tracker provides detailed information for monitoring:

```csv
Book ID,Status,Failure Stage,Error Message,Retry Attempts,Timestamp
123,FAILED_TEXT_OPTIMIZATION_API,text_optimization,"Audio optimization API failed after 3 attempts: Request timeout",3,2025-07-03T03:25:00.000Z
124,SUCCESS,,,0,2025-07-03T03:26:00.000Z
```

### Key Metrics to Monitor

1. **Failure Rate**: `FAILED_*` vs `SUCCESS` ratio
2. **API Reliability**: Count of `FAILED_TEXT_OPTIMIZATION_API`
3. **Retry Effectiveness**: Books that succeed after retries
4. **Processing Time**: Impact of retries on overall processing time

## Testing the Error Handling

Use the provided test script to verify error handling:

```bash
# Run error handling tests
node scripts/Audio/test-error-handling.js
```

This will test both strict and lenient modes and show how errors are handled and logged.

## Best Practices

### 1. Production Deployment

- Use `--strict-mode` (default)
- Set reasonable retry limits (`--max-retries 3`)
- Monitor CSV logs for failure patterns
- Set up alerts for high failure rates

### 2. Development

- Use `--lenient-mode` for testing
- Use `--verbose` for detailed error information
- Test with `--test <bookId>` for individual books

### 3. Error Recovery

- Regularly check CSV logs for failed books
- Retry failed books during off-peak hours
- Investigate patterns in API failures
- Consider adjusting retry delays based on API behavior

## Troubleshooting

### Common Issues

1. **High API Failure Rate**
   - Check Azure OpenAI service status
   - Verify API keys and quotas
   - Consider increasing retry delays
   - Monitor rate limits

2. **Books Marked as Failed but Should Succeed**
   - Check error messages in CSV
   - Verify input file format
   - Test with `--lenient-mode` to see if fallback works
   - Use `--verbose` for detailed error information

3. **Processing Takes Too Long**
   - Reduce `--max-retries` if API is consistently failing
   - Increase `--retry-delay` to avoid overwhelming failing APIs
   - Use `--concurrency 1` to process books sequentially

### Getting Help

1. Check the CSV logs for detailed error information
2. Run with `--verbose` for stack traces
3. Test individual books with `--test <bookId>`
4. Use the test script to verify error handling behavior

## Migration from Previous Version

The new error handling is backward compatible. Existing configurations will work with these defaults:

- `strictMode: true` (stop on API failures)
- `maxRetries: 3`
- `retryDelay: 1000ms`
- Enhanced CSV logging automatically enabled

No changes required to existing scripts, but you can now add the new options for better control.
