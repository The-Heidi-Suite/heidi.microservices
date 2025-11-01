import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { PrismaAuthService } from '../services/prisma-auth.service';

@Global()
@Module({
  imports: [LoggerModule, ConfigModule],
  providers: [PrismaAuthService],
  exports: [PrismaAuthService],
})
export class PrismaAuthModule {}
