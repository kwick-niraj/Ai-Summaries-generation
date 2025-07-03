import fs from 'fs';
import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

export class BookProcessingTracker {
  constructor(logDir = 'scripts/Audio/logs') {
    this.csvPath = path.join(logDir, 'book_processing_tracker.csv');
    this.csvWriter = null;
  }

  /**
   * Initialize CSV file with headers if it doesn't exist
   */
  async initializeCSV() {
    if (!fs.existsSync(this.csvPath)) {
      const csvWriter = createObjectCsvWriter({
        path: this.csvPath,
        header: [
          { id: 'book_id', title: 'Book ID' },
          { id: 'input_file_path', title: 'Input File Path' },
          { id: 'timestamp', title: 'Timestamp' },
          { id: 'status', title: 'Status' },
          { id: 'failure_stage', title: 'Failure Stage' },
          { id: 'error_message', title: 'Error Message' },
          { id: 'retry_attempts', title: 'Retry Attempts' },
          { id: 'total_audio_files', title: 'Total Audio Files' },
          { id: 'total_audio_duration', title: 'Total Audio Duration (s)' },
          { id: 'processing_time_ms', title: 'Processing Time (ms)' },
          { id: 'error_details', title: 'Error Details' }
        ]
      });

      await csvWriter.writeRecords([]);
      console.log(`📄 Created book processing tracker: ${this.csvPath}`);
    }

    this.csvWriter = createObjectCsvWriter({
      path: this.csvPath,
      header: [
        { id: 'book_id', title: 'Book ID' },
        { id: 'input_file_path', title: 'Input File Path' },
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'status', title: 'Status' },
        { id: 'failure_stage', title: 'Failure Stage' },
        { id: 'error_message', title: 'Error Message' },
        { id: 'retry_attempts', title: 'Retry Attempts' },
        { id: 'total_audio_files', title: 'Total Audio Files' },
        { id: 'total_audio_duration', title: 'Total Audio Duration (s)' },
        { id: 'processing_time_ms', title: 'Processing Time (ms)' },
        { id: 'error_details', title: 'Error Details' }
      ],
      append: true
    });
  }

  /**
   * Log book processing result to CSV
   * @param {Object} result - Book processing result
   */
  async logBookProcessing(result) {
    if (!this.csvWriter) {
      await this.initializeCSV();
    }

    // Determine detailed status based on failure stage
    let status = 'SUCCESS';
    let failureStage = null;
    let errorMessage = null;

    if (!result.success) {
      if (result.skipped) {
        status = 'SKIPPED';
      } else if (result.errorDetails) {
        switch (result.errorDetails.stage) {
          case 'text_optimization':
            // Check if it's specifically an API failure
            if (result.errorDetails.error && result.errorDetails.error.includes('API failed')) {
              status = 'FAILED_TEXT_OPTIMIZATION_API';
            } else {
              status = 'FAILED_TEXT_OPTIMIZATION';
            }
            break;
          case 'audio_generation':
            status = 'FAILED_AUDIO_GENERATION';
            break;
          case 'voice_selection':
            status = 'FAILED_VOICE_SELECTION';
            break;
          case 'file_operation':
            status = 'FAILED_FILE_OPERATION';
            break;
          case 'parsing':
            status = 'FAILED_PARSING';
            break;
          case 'unexpected_error':
            status = 'FAILED_UNEXPECTED';
            break;
          case 'batch_processing_error':
            status = 'FAILED_BATCH_PROCESSING';
            break;
          default:
            status = 'FAILED_UNKNOWN';
        }
        failureStage = result.errorDetails.stage;
        errorMessage = result.errorDetails.error;
      } else {
        status = 'FAILED_UNKNOWN';
      }
    }

    // Extract retry attempts from error details if available
    const retryAttempts = result.retryAttempts || 
                         (result.errorDetails?.attempts) || 
                         0;

    const record = {
      book_id: result.bookId,
      input_file_path: result.inputPath,
      timestamp: new Date().toISOString(),
      status: result.processingStatus || status,
      failure_stage: failureStage,
      error_message: errorMessage,
      retry_attempts: retryAttempts,
      total_audio_files: result.stats?.totalAudioFiles || 0,
      total_audio_duration: result.stats?.totalDuration || 0,
      processing_time_ms: result.endTime ? result.endTime - result.startTime : 0,
      error_details: result.errorDetails ? JSON.stringify(result.errorDetails) : null
    };

    try {
      await this.csvWriter.writeRecords([record]);
      console.log(`📝 Logged book ${result.bookId} processing result: ${record.status}${retryAttempts > 0 ? ` (${retryAttempts} retries)` : ''}`);
    } catch (error) {
      console.error(`❌ Failed to log book ${result.bookId} to CSV:`, error);
    }
  }

  /**
   * Get processing statistics from CSV
   * @returns {Promise<Object>} Processing statistics
   */
  async getProcessingStats() {
    if (!fs.existsSync(this.csvPath)) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        failureBreakdown: {}
      };
    }

    try {
      const csvContent = fs.readFileSync(this.csvPath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length <= 1) { // Only header or empty
        return {
          total: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          failureBreakdown: {}
        };
      }

      const stats = {
        total: lines.length - 1, // Exclude header
        successful: 0,
        failed: 0,
        skipped: 0,
        failureBreakdown: {}
      };

      // Parse each line (skip header)
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',');
        if (columns.length >= 4) {
          const status = columns[3]; // Status column
          
          if (status === 'SUCCESS') {
            stats.successful++;
          } else if (status === 'SKIPPED') {
            stats.skipped++;
          } else {
            stats.failed++;
            stats.failureBreakdown[status] = (stats.failureBreakdown[status] || 0) + 1;
          }
        }
      }

      return stats;
    } catch (error) {
      console.error('Failed to read processing stats:', error);
      return {
        total: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        failureBreakdown: {}
      };
    }
  }
}

export default BookProcessingTracker;
