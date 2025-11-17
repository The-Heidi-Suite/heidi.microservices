import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { PrismaCoreModule } from '@heidi/prisma';
import { StorageModule } from '@heidi/storage';

@Module({
  imports: [PrismaCoreModule, StorageModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
