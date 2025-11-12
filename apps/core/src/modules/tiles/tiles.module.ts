import { Module } from '@nestjs/common';
import { TilesController } from './tiles.controller';
import { TilesService } from './tiles.service';
import { LoggerModule } from '@heidi/logger';
import { PrismaCoreModule } from '@heidi/prisma';
import { RBACModule } from '@heidi/rbac';
import { StorageModule } from '@heidi/storage';

@Module({
  imports: [LoggerModule, PrismaCoreModule, RBACModule, StorageModule],
  controllers: [TilesController],
  providers: [TilesService],
  exports: [TilesService],
})
export class TilesModule {}
