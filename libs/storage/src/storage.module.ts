import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
