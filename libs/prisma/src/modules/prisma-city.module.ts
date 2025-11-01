import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@heidi/logger';
import { ConfigModule } from '@heidi/config';
import { PrismaCityService } from '../services/prisma-city.service';

@Global()
@Module({
  imports: [LoggerModule, ConfigModule],
  providers: [PrismaCityService],
  exports: [PrismaCityService],
})
export class PrismaCityModule {}
