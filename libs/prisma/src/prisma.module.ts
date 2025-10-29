import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
