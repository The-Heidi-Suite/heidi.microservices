import { Global, Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { AdminOnlyGuard } from './admin-only.guard';
import { CityHierarchyService } from './city-hierarchy.service';
import { UserContextService } from './user-context.service';
import { PrismaCoreModule, PrismaCityModule } from '@heidi/prisma';
import { LoggerModule } from '@heidi/logger';
import { RedisModule } from '@heidi/redis';

@Global()
@Module({
  imports: [PrismaCoreModule, PrismaCityModule, LoggerModule, RedisModule],
  providers: [
    PermissionService,
    CityHierarchyService,
    UserContextService,
    RolesGuard,
    PermissionsGuard,
    AdminOnlyGuard,
  ],
  exports: [
    PermissionService,
    CityHierarchyService,
    UserContextService,
    RolesGuard,
    PermissionsGuard,
    AdminOnlyGuard,
  ],
})
export class RBACModule {}
