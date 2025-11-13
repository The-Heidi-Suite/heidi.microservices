import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { DestinationOneService } from './destination-one.service';

@Module({
  imports: [HttpModule],
  controllers: [IntegrationController],
  providers: [IntegrationService, DestinationOneService],
})
export class IntegrationModule {}
