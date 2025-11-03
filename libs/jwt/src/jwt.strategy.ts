import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from './jwt.service';
import { PrismaPermissionsService } from '@heidi/prisma-permissions';
import { PermissionService } from '@heidi/rbac';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prismaPermissions: PrismaPermissionsService,
    private readonly permissionService: PermissionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'default-secret-change-in-production',
    });
  }

  async validate(payload: TokenPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Load user's city assignments from database
    const cityAssignments = await this.prismaPermissions.userCityAssignment.findMany({
      where: {
        userId: payload.sub,
      },
      select: {
        cityId: true,
        role: true,
      },
    });

    const cityIds = cityAssignments.map((assignment) => assignment.cityId);

    // Load user's permissions based on role
    const permissions = await this.permissionService.getUserPermissions(
      payload.role as any,
    );

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      cityId: payload.cityId,
      cityIds: cityIds.length > 0 ? cityIds : payload.cityIds || [],
      permissions: permissions.length > 0 ? permissions : payload.permissions || [],
    };
  }
}
