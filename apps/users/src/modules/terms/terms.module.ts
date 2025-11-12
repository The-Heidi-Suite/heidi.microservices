import { Module } from '@nestjs/common';
import { TermsController } from './terms.controller';
import { TermsMessageController } from './terms-message.controller';
import { TermsService } from './terms.service';
import { PrismaUsersModule } from '@heidi/prisma';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';

@Module({
  imports: [PrismaUsersModule, LoggerModule, ConfigModule],
  controllers: [TermsController, TermsMessageController],
  providers: [TermsService],
  exports: [TermsService],
})
export class TermsModule {}
