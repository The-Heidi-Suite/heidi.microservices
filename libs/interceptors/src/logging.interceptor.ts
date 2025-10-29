import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, headers } = request;
    const serviceName = process.env.SERVICE_NAME || 'unknown-service';
    const startTime = Date.now();

    // Log incoming request
    this.logger.log({
      message: 'Incoming request',
      service: serviceName,
      method,
      url,
      body: this.sanitizeBody(body),
      userAgent: headers['user-agent'],
      ip: request.ip,
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;

          // Log successful response
          this.logger.log({
            message: 'Request completed',
            service: serviceName,
            method,
            url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          // Log error response
          this.logger.error({
            message: 'Request failed',
            service: serviceName,
            method,
            url,
            error: error.message,
            duration: `${duration}ms`,
          });
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
