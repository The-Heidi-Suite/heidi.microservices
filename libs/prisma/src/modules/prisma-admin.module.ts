import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { PrismaAdminService } from '../services/prisma-admin.service';

@Global()
@Module({
  imports: [LoggerModule, ConfigModule],
  providers: [PrismaAdminService],
  exports: [PrismaAdminService],
})
export class PrismaAdminModule {}
