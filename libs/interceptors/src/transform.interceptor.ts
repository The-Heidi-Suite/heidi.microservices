import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { I18nService } from '@heidi/i18n';
import { SuccessMessageService } from './success-message.service';
import { SUCCESS_MESSAGE_KEY } from './decorators/success-message.decorator';
import { Request } from 'express';

export interface Response<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  path: string;
  statusCode: number;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(
    private readonly i18nService: I18nService,
    private readonly successMessageService: SuccessMessageService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        // Check for explicit message key from @SuccessMessage decorator
        const handler = context.getHandler();
        const explicitMessageKey = this.reflector.get<string>(SUCCESS_MESSAGE_KEY, handler);

        // Get success message key - use decorator override if available, otherwise use route mapping
        const messageKey = explicitMessageKey
          ? explicitMessageKey
          : this.successMessageService.getMessageKey(
              request.method,
              request.url,
              response.statusCode,
            );

        // Translate the message using i18n
        const translatedMessage = this.i18nService.translate(`success.${messageKey}`);

        // Use translated message if available, otherwise fallback to key or default
        const message =
          translatedMessage !== `success.${messageKey}`
            ? translatedMessage
            : 'Operation completed successfully';

        return {
          success: true,
          data,
          message,
          timestamp: new Date().toISOString(),
          path: request.url,
          statusCode: response.statusCode,
        };
      }),
    );
  }
}
