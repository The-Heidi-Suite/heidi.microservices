import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { PrismaCoreService } from '../services/prisma-core.service';

@Global()
@Module({
  imports: [LoggerModule, ConfigModule],
  providers: [PrismaCoreService],
  exports: [PrismaCoreService],
})
export class PrismaCoreModule {}
