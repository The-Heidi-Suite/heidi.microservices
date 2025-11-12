import { Module } from '@nestjs/common';
import { CityController } from './city.controller';
import { CityMessageController } from './city-message.controller';
import { CityService } from './city.service';

@Module({
  controllers: [CityController, CityMessageController],
  providers: [CityService],
})
export class CityModule {}
