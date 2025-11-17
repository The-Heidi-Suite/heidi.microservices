import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MobilithekParkingService } from './mobilithek-parking.service';

@Module({
  imports: [HttpModule],
  providers: [MobilithekParkingService],
  exports: [MobilithekParkingService],
})
export class MobilithekParkingModule {}
