import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { StorageService } from './storage.service';
import { FileUploadService } from './file-upload.service';

@Global()
@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [StorageService, FileUploadService],
  exports: [StorageService, FileUploadService],
})
export class StorageModule {}
