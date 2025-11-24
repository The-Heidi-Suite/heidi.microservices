import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryQuickFiltersService } from './category-quick-filters.service';
import { PrismaCoreModule, PrismaCityModule } from '@heidi/prisma';
import { StorageModule } from '@heidi/storage';
import { I18nModule } from '@heidi/i18n';
import { ConfigModule } from '@heidi/config';

@Module({
  imports: [PrismaCoreModule, PrismaCityModule, StorageModule, I18nModule, ConfigModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoryQuickFiltersService],
  exports: [CategoriesService, CategoryQuickFiltersService],
})
export class CategoriesModule {}
