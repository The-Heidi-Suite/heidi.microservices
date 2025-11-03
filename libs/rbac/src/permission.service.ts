import { Injectable } from '@nestjs/common';
import { PrismaPermissionsService } from '@heidi/prisma-permissions';
import { UserRole } from '@prisma/client-permissions';
import { LoggerService } from '@heidi/logger';

@Injectable()
export class PermissionService {
  private readonly logger: LoggerService;

  constructor(
    private readonly prisma: PrismaPermissionsService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext('PermissionService');
  }

  /**
   * Check if user has a specific permission
   * @param userId User ID
   * @param resource Resource name (e.g., 'users', 'cities')
   * @param action Action name (e.g., 'read', 'write')
   */
  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      // Get user's role from UserCityAssignment or User table
      // For now, we'll need to pass role as parameter or fetch it
      // This will be enhanced when we integrate with auth service
      const permission = await this.prisma.permission.findUnique({
        where: {
          resource_action: {
            resource,
            action,
          },
        },
        include: {
          rolePermissions: true,
        },
      });

      if (!permission) {
        return false;
      }

      // Check if any role has this permission
      return permission.rolePermissions.length > 0;
    } catch (error) {
      this.logger.error('Error checking permission', error);
      return false;
    }
  }

  /**
   * Check if user has a specific role
   * This is a simplified check - actual role should come from JWT/context
   */
  async hasRole(userRole: UserRole, requiredRole: UserRole): Promise<boolean> {
    // Super Admin has all permissions
    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Role hierarchy: SUPER_ADMIN > CITY_ADMIN > CITIZEN
    const roleHierarchy = {
      [UserRole.SUPER_ADMIN]: 3,
      [UserRole.CITY_ADMIN]: 2,
      [UserRole.CITIZEN]: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Get all permissions for a user based on their role
   * @param role User role
   */
  async getUserPermissions(role: UserRole): Promise<string[]> {
    try {
      const rolePermissions = await this.prisma.rolePermission.findMany({
        where: {
          role,
        },
        include: {
          permission: true,
        },
      });

      return rolePermissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`);
    } catch (error) {
      this.logger.error('Error getting user permissions', error);
      return [];
    }
  }

  /**
   * Get all permissions for a role
   * @param role User role
   */
  async getRolePermissions(role: UserRole): Promise<
    Array<{
      id: string;
      resource: string;
      action: string;
      description: string | null;
    }>
  > {
    try {
      const rolePermissions = await this.prisma.rolePermission.findMany({
        where: {
          role,
        },
        include: {
          permission: true,
        },
      });

      return rolePermissions.map((rp) => ({
        id: rp.permission.id,
        resource: rp.permission.resource,
        action: rp.permission.action,
        description: rp.permission.description,
      }));
    } catch (error) {
      this.logger.error('Error getting role permissions', error);
      return [];
    }
  }
}
