// Global error suppression utility to prevent runaway console errors

class ErrorSuppressor {
  constructor() {
    this.errorCounts = new Map();
    this.suppressedErrors = new Set();
    this.maxErrorsPerType = 5;
    this.resetInterval = 10000; // 10 seconds
    
    // Reset error counts periodically
    setInterval(() => {
      this.errorCounts.clear();
      this.suppressedErrors.clear();
    }, this.resetInterval);
  }

  shouldSuppressError(errorMessage) {
    const errorKey = this.getErrorKey(errorMessage);
    const currentCount = this.errorCounts.get(errorKey) || 0;
    
    if (currentCount >= this.maxErrorsPerType) {
      if (!this.suppressedErrors.has(errorKey)) {
        console.warn(`🚨 SUPPRESSING FURTHER ERRORS OF TYPE: ${errorKey}`);
        this.suppressedErrors.add(errorKey);
      }
      return true;
    }
    
    this.errorCounts.set(errorKey, currentCount + 1);
    return false;
  }

  getErrorKey(errorMessage) {
    if (typeof errorMessage === 'string') {
      // Extract key patterns from error messages
      if (errorMessage.includes('Daily.co')) return 'daily-co-error';
      if (errorMessage.includes('Failed to join')) return 'join-error';
      if (errorMessage.includes('Call object not initialized')) return 'init-error';
      if (errorMessage.includes('participant-joined')) return 'participant-event';
      return 'generic-error';
    }
    return 'unknown-error';
  }

  suppressConsoleError() {
    const originalError = console.error;
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      if (!this.shouldSuppressError(errorMessage)) {
        originalError.apply(console, args);
      }
    };
  }

  suppressConsoleLog() {
    const originalLog = console.log;
    console.log = (...args) => {
      const logMessage = args.join(' ');
      // Suppress repetitive Daily.co logs
      if (logMessage.includes('📞 Daily.co:') || 
          logMessage.includes('🔍 GenerativeDialogue:') ||
          logMessage.includes('🎯 Connected to Daily.co room:')) {
        if (this.shouldSuppressError(logMessage)) {
          return;
        }
      }
      originalLog.apply(console, args);
    };
  }
}

const errorSuppressor = new ErrorSuppressor();

// Initialize error suppression
export const initializeErrorSuppression = () => {
  errorSuppressor.suppressConsoleError();
  errorSuppressor.suppressConsoleLog();
  console.log('🛡️ Error suppression initialized');
};

export default errorSuppressor;
