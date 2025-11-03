import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SUPER_ADMIN_ONLY_KEY } from './decorators/super-admin-only.decorator';
import { CITY_ADMIN_ONLY_KEY } from './decorators/city-admin-only.decorator';
import { UserRole } from '@prisma/client-permissions';

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isSuperAdminOnly = this.reflector.getAllAndOverride<boolean>(SUPER_ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const isCityAdminOnly = this.reflector.getAllAndOverride<boolean>(CITY_ADMIN_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isSuperAdminOnly && !isCityAdminOnly) {
      return true; // No admin restriction
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = user.role as UserRole;

    if (isSuperAdminOnly) {
      if (userRole !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('This route requires Super Admin role');
      }
      return true;
    }

    if (isCityAdminOnly) {
      if (userRole !== UserRole.SUPER_ADMIN && userRole !== UserRole.CITY_ADMIN) {
        throw new ForbiddenException('This route requires City Admin or Super Admin role');
      }
      return true;
    }

    return true;
  }
}
