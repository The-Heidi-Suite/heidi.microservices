import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        // Enhanced validation error formatting
        if (error.name === 'ValidationError' || error.status === 400) {
          const formattedError = this.formatValidationError(error);
          return throwError(() => new BadRequestException(formattedError));
        }
        return throwError(() => error);
      }),
    );
  }

  private formatValidationError(error: any) {
    if (error.response?.message && Array.isArray(error.response.message)) {
      return {
        message: 'Validation failed',
        errors: error.response.message.map((msg: string) => ({
          field: this.extractField(msg),
          message: msg,
        })),
      };
    }

    return {
      message: error.message || 'Validation failed',
      errors: [],
    };
  }

  private extractField(message: string): string {
    // Try to extract field name from validation message
    const match = message.match(/^(\w+)\s/);
    return match ? match[1] : 'unknown';
  }
}
