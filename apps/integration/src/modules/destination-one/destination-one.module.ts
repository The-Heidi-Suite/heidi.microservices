import { Module } from '@nestjs/common';
import { DestinationOneService } from './destination-one.service';

@Module({
  providers: [DestinationOneService],
  exports: [DestinationOneService],
})
export class DestinationOneModule {}
