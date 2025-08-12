import fs from 'fs';
import path from 'path';

/**
 * Tracking Manager - Manages the tracking system for WAV to M4A conversion
 * Handles status tracking, persistence, and reporting
 */
export class TrackingManager {
  constructor(trackerPath = null) {
    this.trackerPath = trackerPath || path.join(process.cwd(), 'scripts', 'Audio', 'tracker.json');
    this.tracker = this.loadTracker();
    
    // Status types
    this.statusTypes = {
      PENDING: 'pending',
      VALIDATED: 'validated',
      CONVERTED: 'converted',
      FAILED: 'failed',
      REJECTED: 'rejected'
    };
  }

  /**
   * Load tracker data from file
   * @returns {Object} Tracker data
   */
  loadTracker() {
    try {
      if (fs.existsSync(this.trackerPath)) {
        const data = fs.readFileSync(this.trackerPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn(`⚠️  Could not load tracker file: ${error.message}`);
    }

    // Return default structure
    return {
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalBooks: 0,
        statusCounts: {
          pending: 0,
          validated: 0,
          converted: 0,
          failed: 0,
          rejected: 0
        }
      },
      books: {}
    };
  }

  /**
   * Save tracker data to file
   */
  saveTracker() {
    try {
      // Update metadata
      this.tracker.metadata.lastUpdated = new Date().toISOString();
      this.tracker.metadata.totalBooks = Object.keys(this.tracker.books).length;
      
      // Update status counts
      const statusCounts = {
        pending: 0,
        validated: 0,
        converted: 0,
        failed: 0,
        rejected: 0
      };

      Object.values(this.tracker.books).forEach(book => {
        if (statusCounts.hasOwnProperty(book.status)) {
          statusCounts[book.status]++;
        }
      });

      this.tracker.metadata.statusCounts = statusCounts;

      // Ensure directory exists
      const trackerDir = path.dirname(this.trackerPath);
      if (!fs.existsSync(trackerDir)) {
        fs.mkdirSync(trackerDir, { recursive: true });
      }

      // Write to file
      fs.writeFileSync(this.trackerPath, JSON.stringify(this.tracker, null, 2));
      
    } catch (error) {
      console.error(`❌ Failed to save tracker: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update book status
   * @param {string} bookId - Book identifier
   * @param {string} status - New status
   * @param {Object} data - Additional data to store
   */
  updateBookStatus(bookId, status, data = {}) {
    if (!Object.values(this.statusTypes).includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    const now = new Date().toISOString();
    
    // Get existing book data or create new
    const existingBook = this.tracker.books[bookId] || {};
    
    // Create updated book entry
    const bookEntry = {
      ...existingBook,
      bookId,
      status,
      timestamp: now,
      lastUpdated: now,
      ...data
    };

    // Add created timestamp if new book
    if (!existingBook.created) {
      bookEntry.created = now;
    }

    // Add status history
    if (!bookEntry.statusHistory) {
      bookEntry.statusHistory = [];
    }

    bookEntry.statusHistory.push({
      status,
      timestamp: now,
      data: data
    });

    // Store the book entry
    this.tracker.books[bookId] = bookEntry;
    
    // Save to file
    this.saveTracker();

    return bookEntry;
  }

  /**
   * Get book status
   * @param {string} bookId - Book identifier
   * @returns {Object|null} Book data or null if not found
   */
  getBookStatus(bookId) {
    return this.tracker.books[bookId] || null;
  }

  /**
   * Get all book statuses
   * @returns {Object} All book data
   */
  getAllStatuses() {
    return this.tracker.books;
  }

  /**
   * Get books by status
   * @param {string} status - Status to filter by
   * @returns {Array} Array of book entries
   */
  getBooksByStatus(status) {
    return Object.values(this.tracker.books)
      .filter(book => book.status === status);
  }

  /**
   * Get books that need processing
   * @returns {Array} Array of book IDs that need processing
   */
  getBooksNeedingProcessing() {
    return Object.keys(this.tracker.books)
      .filter(bookId => {
        const book = this.tracker.books[bookId];
        return !book || 
               book.status === this.statusTypes.PENDING || 
               book.status === this.statusTypes.FAILED;
      });
  }

  /**
   * Mark book as validated
   * @param {string} bookId - Book identifier
   * @param {Object} validationData - Validation results
   */
  markAsValidated(bookId, validationData) {
    return this.updateBookStatus(bookId, this.statusTypes.VALIDATED, {
      validation: validationData,
      reason: 'audio_validation_passed'
    });
  }

  /**
   * Mark book as converted
   * @param {string} bookId - Book identifier
   * @param {Object} conversionData - Conversion results
   */
  markAsConverted(bookId, conversionData) {
    return this.updateBookStatus(bookId, this.statusTypes.CONVERTED, {
      conversion: conversionData,
      reason: 'conversion_successful'
    });
  }

  /**
   * Mark book as failed
   * @param {string} bookId - Book identifier
   * @param {string} error - Error message
   * @param {string} reason - Failure reason
   */
  markAsFailed(bookId, error, reason = 'unknown_error') {
    return this.updateBookStatus(bookId, this.statusTypes.FAILED, {
      error,
      reason,
      failureCount: (this.getBookStatus(bookId)?.failureCount || 0) + 1
    });
  }

  /**
   * Mark book as rejected
   * @param {string} bookId - Book identifier
   * @param {string} error - Error message
   * @param {string} reason - Rejection reason
   */
  markAsRejected(bookId, error, reason = 'validation_failed') {
    return this.updateBookStatus(bookId, this.statusTypes.REJECTED, {
      error,
      reason,
      rejectionReason: reason
    });
  }

  /**
   * Reset book status to pending
   * @param {string} bookId - Book identifier
   */
  resetBookStatus(bookId) {
    return this.updateBookStatus(bookId, this.statusTypes.PENDING, {
      reason: 'manual_reset'
    });
  }

  /**
   * Remove book from tracking
   * @param {string} bookId - Book identifier
   */
  removeBook(bookId) {
    if (this.tracker.books[bookId]) {
      delete this.tracker.books[bookId];
      this.saveTracker();
      return true;
    }
    return false;
  }

  /**
   * Get summary statistics
   * @returns {Object} Summary statistics
   */
  getSummaryStats() {
    const books = Object.values(this.tracker.books);
    const stats = {
      total: books.length,
      byStatus: {
        pending: 0,
        validated: 0,
        converted: 0,
        failed: 0,
        rejected: 0
      },
      conversionStats: {
        totalConverted: 0,
        totalSizeMB: 0,
        averageCompressionRatio: 0,
        totalChapters: 0
      },
      timeStats: {
        oldestEntry: null,
        newestEntry: null,
        recentActivity: []
      }
    };

    let totalCompressionRatio = 0;
    let compressionCount = 0;
    let totalSize = 0;
    let totalChapters = 0;

    books.forEach(book => {
      // Status counts
      if (stats.byStatus.hasOwnProperty(book.status)) {
        stats.byStatus[book.status]++;
      }

      // Conversion stats
      if (book.status === 'converted' && book.conversion) {
        stats.conversionStats.totalConverted++;
        
        if (book.conversion.fileSize) {
          totalSize += book.conversion.fileSize;
        }
        
        if (book.conversion.compressionRatio) {
          totalCompressionRatio += book.conversion.compressionRatio;
          compressionCount++;
        }
        
        if (book.conversion.chapterCount) {
          totalChapters += book.conversion.chapterCount;
        }
      }

      // Time tracking
      if (!stats.timeStats.oldestEntry || book.created < stats.timeStats.oldestEntry) {
        stats.timeStats.oldestEntry = book.created;
      }
      
      if (!stats.timeStats.newestEntry || book.lastUpdated > stats.timeStats.newestEntry) {
        stats.timeStats.newestEntry = book.lastUpdated;
      }
    });

    // Calculate averages
    stats.conversionStats.totalSizeMB = Math.round(totalSize / 1024 / 1024);
    stats.conversionStats.averageCompressionRatio = compressionCount > 0 
      ? (totalCompressionRatio / compressionCount) 
      : 0;
    stats.conversionStats.totalChapters = totalChapters;

    // Recent activity (last 10 updates)
    stats.timeStats.recentActivity = books
      .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
      .slice(0, 10)
      .map(book => ({
        bookId: book.bookId,
        status: book.status,
        timestamp: book.lastUpdated,
        reason: book.reason
      }));

    return stats;
  }

  /**
   * Generate detailed report
   * @returns {string} Formatted report
   */
  generateReport() {
    const stats = this.getSummaryStats();
    const metadata = this.tracker.metadata;
    
    let report = `📊 WAV to M4A Conversion Tracker Report\n`;
    report += `${'='.repeat(60)}\n\n`;
    
    // Metadata
    report += `📅 Created: ${new Date(metadata.created).toLocaleString()}\n`;
    report += `🔄 Last Updated: ${new Date(metadata.lastUpdated).toLocaleString()}\n`;
    report += `📚 Total Books: ${stats.total}\n\n`;

    // Status breakdown
    report += `📈 Status Breakdown:\n`;
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      if (count > 0) {
        const emoji = {
          pending: '⏳',
          validated: '✅',
          converted: '🎵',
          failed: '❌',
          rejected: '🚫'
        }[status] || '❓';
        const percentage = ((count / stats.total) * 100).toFixed(1);
        report += `  ${emoji} ${status}: ${count} (${percentage}%)\n`;
      }
    });

    // Conversion statistics
    if (stats.conversionStats.totalConverted > 0) {
      report += `\n🎵 Conversion Statistics:\n`;
      report += `  📀 Total Converted: ${stats.conversionStats.totalConverted}\n`;
      report += `  💾 Total Size: ${stats.conversionStats.totalSizeMB} MB\n`;
      report += `  📊 Avg Compression: ${(stats.conversionStats.averageCompressionRatio * 100).toFixed(1)}%\n`;
      report += `  📚 Total Chapters: ${stats.conversionStats.totalChapters}\n`;
    }

    // Recent activity
    if (stats.timeStats.recentActivity.length > 0) {
      report += `\n🕒 Recent Activity:\n`;
      stats.timeStats.recentActivity.forEach(activity => {
        const emoji = {
          converted: '✅',
          failed: '❌',
          rejected: '🚫',
          validated: '✅'
        }[activity.status] || '❓';
        const date = new Date(activity.timestamp).toLocaleString();
        report += `  ${emoji} ${activity.bookId} - ${activity.status} (${date})\n`;
      });
    }

    // Failed/Rejected books
    const failedBooks = this.getBooksByStatus('failed');
    const rejectedBooks = this.getBooksByStatus('rejected');
    
    if (failedBooks.length > 0) {
      report += `\n❌ Failed Books (${failedBooks.length}):\n`;
      failedBooks.slice(0, 10).forEach(book => {
        report += `  - ${book.bookId}: ${book.error || 'Unknown error'}\n`;
      });
      if (failedBooks.length > 10) {
        report += `  ... and ${failedBooks.length - 10} more\n`;
      }
    }

    if (rejectedBooks.length > 0) {
      report += `\n🚫 Rejected Books (${rejectedBooks.length}):\n`;
      rejectedBooks.slice(0, 10).forEach(book => {
        report += `  - ${book.bookId}: ${book.error || 'Unknown error'}\n`;
      });
      if (rejectedBooks.length > 10) {
        report += `  ... and ${rejectedBooks.length - 10} more\n`;
      }
    }

    return report;
  }

  /**
   * Export tracker data
   * @param {string} exportPath - Path to export file
   * @returns {boolean} Success status
   */
  exportData(exportPath) {
    try {
      const exportData = {
        ...this.tracker,
        exportedAt: new Date().toISOString(),
        exportedBy: 'WAV to M4A Validator'
      };

      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
      return true;
    } catch (error) {
      console.error(`❌ Failed to export data: ${error.message}`);
      return false;
    }
  }

  /**
   * Import tracker data
   * @param {string} importPath - Path to import file
   * @param {boolean} merge - Whether to merge with existing data
   * @returns {boolean} Success status
   */
  importData(importPath, merge = false) {
    try {
      const importData = JSON.parse(fs.readFileSync(importPath, 'utf8'));
      
      if (merge) {
        // Merge books data
        this.tracker.books = {
          ...this.tracker.books,
          ...importData.books
        };
      } else {
        // Replace all data
        this.tracker = importData;
      }

      this.saveTracker();
      return true;
    } catch (error) {
      console.error(`❌ Failed to import data: ${error.message}`);
      return false;
    }
  }

  /**
   * Clean up old entries
   * @param {number} daysOld - Remove entries older than this many days
   * @returns {number} Number of entries removed
   */
  cleanupOldEntries(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let removedCount = 0;
    const books = Object.keys(this.tracker.books);
    
    books.forEach(bookId => {
      const book = this.tracker.books[bookId];
      const bookDate = new Date(book.created || book.timestamp);
      
      if (bookDate < cutoffDate && (book.status === 'failed' || book.status === 'rejected')) {
        delete this.tracker.books[bookId];
        removedCount++;
      }
    });

    if (removedCount > 0) {
      this.saveTracker();
    }

    return removedCount;
  }
}

export default TrackingManager;
