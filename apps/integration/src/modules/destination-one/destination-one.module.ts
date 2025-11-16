import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DestinationOneService } from './destination-one.service';

@Module({
  imports: [HttpModule],
  providers: [DestinationOneService],
  exports: [DestinationOneService],
})
export class DestinationOneModule {}
