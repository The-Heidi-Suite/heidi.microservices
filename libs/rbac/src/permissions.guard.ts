import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './decorators/permissions.decorator';
import { PermissionService } from './permission.service';
import { UserRole } from '@prisma/client-permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionMetadata = this.reflector.getAllAndOverride<{
      resource: string;
      action: string;
    }>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!permissionMetadata) {
      return true; // No permission required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = user.role as UserRole;

    // Super Admin has all permissions
    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Check if user has the required permission
    const hasPermission = await this.permissionService.hasPermission(
      user.sub || user.userId,
      permissionMetadata.resource,
      permissionMetadata.action,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `This route requires permission: ${permissionMetadata.resource}:${permissionMetadata.action}`,
      );
    }

    return true;
  }
}
