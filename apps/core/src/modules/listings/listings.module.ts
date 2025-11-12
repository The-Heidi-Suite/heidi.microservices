import { Module } from '@nestjs/common';
import { ListingController } from './listing.controller';
import { ListingsService } from './listings.service';
import { LoggerModule } from '@heidi/logger';
import { FavoritesController } from './favorites.controller';
import { PrismaCoreModule } from '@heidi/prisma';
import { StorageModule } from '@heidi/storage';

@Module({
  imports: [LoggerModule, PrismaCoreModule, StorageModule],
  controllers: [ListingController, FavoritesController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
