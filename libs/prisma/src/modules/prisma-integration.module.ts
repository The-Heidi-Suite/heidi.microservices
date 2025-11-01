import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { PrismaIntegrationService } from '../services/prisma-integration.service';

@Global()
@Module({
  imports: [LoggerModule, ConfigModule],
  providers: [PrismaIntegrationService],
  exports: [PrismaIntegrationService],
})
export class PrismaIntegrationModule {}
