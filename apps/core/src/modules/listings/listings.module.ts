import { Module } from '@nestjs/common';
import { ListingController } from './listing.controller';
import { ListingsService } from './listings.service';
import { LoggerModule } from '@heidi/logger';
import { FavoritesController } from './favorites.controller';
import { PrismaCoreModule } from '@heidi/prisma';

@Module({
  imports: [LoggerModule, PrismaCoreModule],
  controllers: [ListingController, FavoritesController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
