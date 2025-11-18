import { Module } from '@nestjs/common';
import { CityController } from './city.controller';
import { CityMessageController } from './city-message.controller';
import { CityService } from './city.service';
import { LoggerModule } from '@heidi/logger';
import { PrismaCityModule } from '@heidi/prisma';
import { StorageModule } from '@heidi/storage';

@Module({
  imports: [LoggerModule, PrismaCityModule, StorageModule],
  controllers: [CityController, CityMessageController],
  providers: [CityService],
})
export class CityModule {}
