import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

interface LogContext {
  requestId?: string;
  userId?: string;
  serviceName?: string;
  [key: string]: any;
}

// Async context for request tracking
export const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context?: string;
  private serviceName: string;

  constructor() {
    this.serviceName = process.env.SERVICE_NAME || 'heidi-service';
    this.logger = this.createLogger();
  }

  /**
   * Set context for this logger instance
   */
  setContext(context: string) {
    this.context = context;
  }

  /**
   * Create Winston logger instance
   */
  private createLogger(): winston.Logger {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const isDevelopment = process.env.NODE_ENV !== 'production';

    return winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
      ),
      defaultMeta: {
        service: this.serviceName,
        environment: process.env.NODE_ENV || 'development'
      },
      transports: [
        // Console transport with colorization in development
        new winston.transports.Console({
          format: isDevelopment
            ? winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, context, service, ...meta }) => {
                  const ctx = context || this.context || 'Application';
                  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
                  return `${timestamp} [${service}] ${level} [${ctx}]: ${message} ${metaStr}`;
                }),
              )
            : winston.format.json(),
        }),
      ],
    });

    // Add file transport in production
    // if (!isDevelopment) {
    //   this.logger.add(
    //     new winston.transports.DailyRotateFile({
    //       filename: `${process.env.LOG_DIR || './logs'}/${this.serviceName}-%DATE%.log`,
    //       datePattern: 'YYYY-MM-DD',
    //       maxSize: '20m',
    //       maxFiles: '14d',
    //     }),
    //   );
    // }
  }

  /**
   * Get context from async local storage
   */
  private getAsyncContext(): LogContext {
    return asyncLocalStorage.getStore() || {};
  }

  /**
   * Build log metadata
   */
  private buildMeta(meta?: any): any {
    const asyncContext = this.getAsyncContext();
    return {
      context: this.context,
      ...asyncContext,
      ...meta,
    };
  }

  /**
   * Log methods
   */
  log(message: any, context?: string, meta?: any) {
    const logContext = context || this.context;
    this.logger.info(message, this.buildMeta({ context: logContext, ...meta }));
  }

  error(message: any, trace?: string, context?: string, meta?: any) {
    const logContext = context || this.context;
    this.logger.error(message, this.buildMeta({
      context: logContext,
      trace,
      ...meta
    }));
  }

  warn(message: any, context?: string, meta?: any) {
    const logContext = context || this.context;
    this.logger.warn(message, this.buildMeta({ context: logContext, ...meta }));
  }

  debug(message: any, context?: string, meta?: any) {
    const logContext = context || this.context;
    this.logger.debug(message, this.buildMeta({ context: logContext, ...meta }));
  }

  verbose(message: any, context?: string, meta?: any) {
    const logContext = context || this.context;
    this.logger.verbose(message, this.buildMeta({ context: logContext, ...meta }));
  }

  /**
   * Convenience methods for structured logging
   */
  logRequest(method: string, url: string, statusCode: number, duration: number) {
    this.log('HTTP Request', this.context, {
      method,
      url,
      statusCode,
      duration,
    });
  }

  logError(error: Error, context?: string) {
    this.error(error.message, error.stack, context || this.context, {
      errorName: error.name,
    });
  }

  /**
   * Get the underlying Winston logger
   */
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}
