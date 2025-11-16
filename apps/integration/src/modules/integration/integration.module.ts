import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { DestinationOneModule } from '../destination-one/destination-one.module';

@Module({
  imports: [HttpModule, DestinationOneModule],
  controllers: [IntegrationController],
  providers: [IntegrationService],
})
export class IntegrationModule {}
