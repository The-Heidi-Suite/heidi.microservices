import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { DestinationOneModule } from '../destination-one/destination-one.module';
import { MobilithekParkingModule } from '../mobilithek-parking/mobilithek-parking.module';
import { KielNewsletterModule } from '../kiel-newsletter/kiel-newsletter.module';
import { RBACModule } from '@heidi/rbac';

@Module({
  imports: [
    HttpModule,
    DestinationOneModule,
    MobilithekParkingModule,
    KielNewsletterModule,
    RBACModule,
  ],
  controllers: [IntegrationController],
  providers: [IntegrationService],
})
export class IntegrationModule {}
