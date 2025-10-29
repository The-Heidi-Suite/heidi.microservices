import { Module, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ErrorReportingService } from './error-reporting.service';

@Global()
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    ErrorReportingService,
  ],
  exports: [ErrorReportingService],
})
export class ErrorHandlingModule {}
