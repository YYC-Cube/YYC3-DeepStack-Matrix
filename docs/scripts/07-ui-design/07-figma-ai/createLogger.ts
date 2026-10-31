// /utils/logger.ts

enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
}

function createLogger(options: LoggerOptions = {}) {
  const { level = LogLevel.INFO, prefix = '' } = options;

  return {
    debug: (...args: any[]) => {
      if (shouldLog(level, LogLevel.DEBUG)) {
        console.debug(`[${prefix}]`, ...args);
      }
    },
    info: (...args: any[]) => {
      if (shouldLog(level, LogLevel.INFO)) {
        console.info(`[${prefix}]`, ...args);
      }
    },
    warn: (...args: any[]) => {
      if (shouldLog(level, LogLevel.WARN)) {
        console.warn(`[${prefix}]`, ...args);
      }
    },
    error: (...args: any[]) => {
      if (shouldLog(level, LogLevel.ERROR)) {
        console.error(`[${prefix}]`, ...args);
      }
    },
  };
}

// 使用示例：
const logger = createLogger({ level: LogLevel.DEBUG, prefix: 'MyComponent' });
logger.info('Component mounted');
logger.error('Something went wrong', error);
