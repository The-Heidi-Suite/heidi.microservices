import { Inject, Injectable, UnauthorizedException, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from './jwt.service';
import { PrismaCoreService } from '@heidi/prisma';
import { PermissionService } from '@heidi/rbac';
import { ConfigService } from '@heidi/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prismaCore: PrismaCoreService,
    @Inject(forwardRef(() => PermissionService))
    private readonly permissionService: PermissionService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'default-secret-change-in-production',
    });
  }

  async validate(payload: TokenPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Use cityAssignments from token if available, otherwise load from database
    let cityAssignments = payload.cityAssignments;
    if (!cityAssignments || cityAssignments.length === 0) {
      const dbAssignments = await this.prismaCore.userCityAssignment.findMany({
        where: {
          userId: payload.sub,
          isActive: true,
        },
        select: {
          cityId: true,
          role: true,
          canManageAdmins: true,
        },
      });

      cityAssignments = dbAssignments.map((a) => ({
        cityId: a.cityId,
        role: a.role,
        canManageAdmins: a.canManageAdmins,
      }));
    }

    const cityIds = cityAssignments.map((assignment) => assignment.cityId);

    // Load user's permissions - use token permissions if available, otherwise fetch
    let permissions = payload.permissions || [];
    if (permissions.length === 0) {
      permissions = await this.permissionService.getUserPermissions(payload.role as any);
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      sub: payload.sub, // For compatibility
      cityId: payload.selectedCityId || payload.cityId,
      selectedCityId: payload.selectedCityId || payload.cityId,
      cityIds: cityIds.length > 0 ? cityIds : payload.cityIds || [],
      cityAssignments,
      permissions: permissions.length > 0 ? permissions : [],
    };
  }
}
