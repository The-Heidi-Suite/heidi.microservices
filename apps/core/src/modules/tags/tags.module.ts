import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { LoggerModule } from '@heidi/logger';
import { PrismaCoreModule } from '@heidi/prisma';

@Module({
  imports: [LoggerModule, PrismaCoreModule],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
