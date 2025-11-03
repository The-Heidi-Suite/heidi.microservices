import { Global, Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { AdminOnlyGuard } from './admin-only.guard';
import { PrismaPermissionsModule } from '@heidi/prisma-permissions';
import { LoggerModule } from '@heidi/logger';

@Global()
@Module({
  imports: [PrismaPermissionsModule, LoggerModule],
  providers: [PermissionService, RolesGuard, PermissionsGuard, AdminOnlyGuard],
  exports: [PermissionService, RolesGuard, PermissionsGuard, AdminOnlyGuard],
})
export class RBACModule {}
