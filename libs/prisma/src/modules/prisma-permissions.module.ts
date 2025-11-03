import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { PrismaPermissionsService } from '../services/prisma-permissions.service';

@Global()
@Module({
  imports: [LoggerModule, ConfigModule],
  providers: [PrismaPermissionsService],
  exports: [PrismaPermissionsService],
})
export class PrismaPermissionsModule {}
