import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseCustomException } from './custom-exceptions';
import { ErrorCode } from './error-codes.enum';
import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
} from '@prisma/client/runtime/library';
import { LoggerService, ChildLogger } from '@heidi/logger';
import { I18nService } from '@heidi/i18n';
import { ConfigService } from '@heidi/config';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly structuredLogger: ChildLogger;
  private readonly isDevelopment: boolean;

  constructor(
    loggerService: LoggerService,
    private readonly i18nService: I18nService,
    private readonly configService: ConfigService,
  ) {
    this.structuredLogger = loggerService.createChildLogger({
      operation: 'exception-filter',
    });
    this.isDevelopment = this.configService.get<string>('nodeEnv', 'development') === 'development';
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log the error with appropriate level
    this.logError(exception, request, errorResponse);

    // Check if response has already been sent to prevent "headers already sent" errors
    if (!response.headersSent) {
      try {
        response.status(errorResponse.statusCode).json(errorResponse);
      } catch (responseError) {
        // If we can't send the response, at least log it
        this.structuredLogger.error('Failed to send error response', responseError as Error);
        this.structuredLogger.error('Original error', exception as Error);
      }
    } else {
      // Headers already sent, just log the error
      this.structuredLogger.error('Cannot send error response - headers already sent');
      this.structuredLogger.error('Original error', exception as Error);
    }
  }

  private buildErrorResponse(exception: unknown, request: Request) {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const requestId = this.getRequestId(request);

    // Handle custom exceptions
    if (exception instanceof BaseCustomException) {
      const translatedMessage = this.i18nService.translate(
        `errors.${exception.errorCode}`,
        exception.context,
      );

      return {
        statusCode: exception.getStatus(),
        errorCode: exception.errorCode,
        message:
          translatedMessage !== `errors.${exception.errorCode}`
            ? translatedMessage
            : exception.message,
        timestamp,
        path,
        method,
        requestId,
        details: exception.context,
      };
    }

    // Handle standard HTTP exceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const errorCode = this.mapHttpStatusToErrorCode(status);

      const originalMessage =
        typeof exceptionResponse === 'string'
          ? (exceptionResponse as string)
          : (exceptionResponse as any).message;

      const translatedMessage = this.i18nService.translate(`errors.${errorCode}`);

      return {
        statusCode: status,
        errorCode,
        message: translatedMessage !== `errors.${errorCode}` ? translatedMessage : originalMessage,
        timestamp,
        path,
        method,
        requestId,
        details: typeof exceptionResponse === 'object' ? exceptionResponse : undefined,
      };
    }

    // Handle Prisma errors
    if (exception instanceof PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, timestamp, path, method, requestId);
    }

    if (exception instanceof PrismaClientUnknownRequestError) {
      const translatedMessage = this.i18nService.translate('errors.DATABASE_QUERY_ERROR');

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: ErrorCode.DATABASE_QUERY_ERROR,
        message: translatedMessage,
        timestamp,
        path,
        method,
        requestId,
        details: { prismaError: exception.message },
      };
    }

    // Handle Redis/IORedis errors
    if (this.isRedisError(exception)) {
      const translatedMessage = this.i18nService.translate('errors.REDIS_CONNECTION_ERROR');

      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        errorCode: ErrorCode.REDIS_CONNECTION_ERROR,
        message: translatedMessage,
        timestamp,
        path,
        method,
        requestId,
        details: { redisError: (exception as Error).message },
      };
    }

    // Handle validation errors
    if (this.isValidationError(exception)) {
      const translatedMessage = this.i18nService.translate('errors.VALIDATION_ERROR');

      return {
        statusCode: HttpStatus.BAD_REQUEST,
        errorCode: ErrorCode.VALIDATION_ERROR,
        message: translatedMessage,
        timestamp,
        path,
        method,
        requestId,
        details: { validationError: (exception as Error).message },
      };
    }

    // Handle timeout errors
    if (this.isTimeoutError(exception)) {
      const translatedMessage = this.i18nService.translate('errors.DATABASE_TIMEOUT_ERROR');

      return {
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        errorCode: ErrorCode.DATABASE_TIMEOUT_ERROR,
        message: translatedMessage,
        timestamp,
        path,
        method,
        requestId,
        details: { timeoutError: (exception as Error).message },
      };
    }

    // Handle unknown errors
    const translatedMessage = this.i18nService.translate('errors.INTERNAL_SERVER_ERROR');

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
      message: translatedMessage,
      timestamp,
      path,
      method,
      requestId,
      details: this.isDevelopment
        ? {
            error: (exception as Error).message,
            stack: (exception as Error).stack,
          }
        : undefined,
    };
  }

  private handlePrismaError(
    exception: PrismaClientKnownRequestError,
    timestamp: string,
    path: string,
    method: string,
    requestId: string,
  ) {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = ErrorCode.DATABASE_QUERY_ERROR;

    switch (exception.code) {
      case 'P2002':
        statusCode = HttpStatus.CONFLICT;
        errorCode = ErrorCode.DATABASE_CONSTRAINT_ERROR;
        break;
      case 'P2025':
        statusCode = HttpStatus.NOT_FOUND;
        errorCode = ErrorCode.NOT_FOUND;
        break;
      case 'P2003':
        statusCode = HttpStatus.BAD_REQUEST;
        errorCode = ErrorCode.DATABASE_CONSTRAINT_ERROR;
        break;
      case 'P2024':
        statusCode = HttpStatus.REQUEST_TIMEOUT;
        errorCode = ErrorCode.DATABASE_TIMEOUT_ERROR;
        break;
    }

    const translatedMessage = this.i18nService.translate(`errors.${errorCode}`);
    const message =
      translatedMessage !== `errors.${errorCode}` ? translatedMessage : exception.message;

    return {
      statusCode,
      errorCode,
      message,
      timestamp,
      path,
      method,
      requestId,
      details: {
        prismaCode: exception.code,
        prismaMessage: exception.message,
        meta: exception.meta,
      },
    };
  }

  private mapHttpStatusToErrorCode(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.REQUEST_TIMEOUT:
        return ErrorCode.DATABASE_TIMEOUT_ERROR;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.SCRAPING_RATE_LIMIT_ERROR;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ErrorCode.INTERNAL_SERVER_ERROR;
      case HttpStatus.BAD_GATEWAY:
        return ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }

  private isRedisError(exception: unknown): boolean {
    return !!(
      exception instanceof Error &&
      (exception.message.includes('Redis') ||
        exception.message.includes('ECONNREFUSED') ||
        exception.message.includes('Connection is closed'))
    );
  }

  private isValidationError(exception: unknown): boolean {
    return !!(
      exception instanceof Error &&
      (exception.name === 'ValidationError' ||
        exception.message.includes('validation') ||
        exception.message.includes('Invalid input'))
    );
  }

  private isTimeoutError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      ((exception.message && exception.message.includes('timeout')) ||
        (exception.message && exception.message.includes('ETIMEDOUT')) ||
        exception.name === 'TimeoutError')
    );
  }

  private getRequestId(request: Request): string {
    return (
      (request.headers['x-request-id'] as string) ||
      (request as any).id ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    );
  }

  private logError(exception: unknown, request: Request, errorResponse: any): void {
    const { statusCode, errorCode, message, requestId } = errorResponse;
    const { method, url, ip, headers } = request;

    const logContext = {
      requestId,
      method,
      url,
      ip,
      userAgent: headers['user-agent'],
      statusCode,
      errorCode,
      userId: (request as any).user?.id,
    };

    // Log with appropriate level based on status code
    if (statusCode >= 500) {
      this.structuredLogger.error(
        `${method} ${url} - ${statusCode} ${errorCode}: ${message}`,
        exception instanceof Error ? exception : undefined,
        logContext,
      );
    } else if (statusCode >= 400) {
      this.structuredLogger.warn(
        `${method} ${url} - ${statusCode} ${errorCode}: ${message}`,
        logContext,
      );
    } else {
      this.structuredLogger.log(
        `${method} ${url} - ${statusCode} ${errorCode}: ${message}`,
        logContext,
      );
    }
  }
}
