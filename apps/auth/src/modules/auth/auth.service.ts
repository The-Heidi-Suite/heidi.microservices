import {
  Injectable,
  UnauthorizedException,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaAuthService, PrismaUsersService, PrismaCoreService } from '@heidi/prisma';
import { PermissionService } from '@heidi/rbac';
import { JwtTokenService, CityAssignment } from '@heidi/jwt';
import { RedisService } from '@heidi/redis';
import { RabbitMQService } from '@heidi/rabbitmq';
import { UserRole } from '@prisma/client-core';
import { AuthAction, AuthProvider, TokenType } from '@prisma/client-auth';
import * as bcrypt from 'bcrypt';
import { LoginDto, AssignCityAdminDto } from '@heidi/contracts';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prismaUsers: PrismaUsersService, // For reading users
    private readonly prismaAuth: PrismaAuthService, // For sessions and audit logs
    private readonly prismaCore: PrismaCoreService, // For UserCityAssignment and permissions
    private readonly permissionService: PermissionService,
    private readonly jwtService: JwtTokenService,
    private readonly redis: RedisService,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    userId: string | null,
    action: AuthAction,
    success: boolean,
    failureReason?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>,
  ) {
    try {
      await this.prismaAuth.authAuditLog.create({
        data: {
          userId,
          action,
          success,
          failureReason,
          ipAddress,
          userAgent,
          metadata: metadata ? metadata : undefined,
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      // Don't throw - audit logging failure shouldn't break auth flow
    }
  }

  /**
   * Store session (for future OAuth/BIND_ID support)
   */
  private async storeSession(
    userId: string,
    tokenType: TokenType,
    expiresAt: Date,
    provider: AuthProvider = AuthProvider.LOCAL,
    metadata?: Record<string, any>,
  ) {
    try {
      await this.prismaAuth.session.create({
        data: {
          userId,
          tokenType,
          expiresAt,
          provider,
          metadata: metadata ? metadata : undefined,
        },
      });
    } catch (error) {
      this.logger.error('Failed to store session', error);
      // Don't throw - session storage failure shouldn't break auth flow
    }
  }

  /**
   * Login user
   */
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    this.logger.log(`Login attempt for: ${dto.email}`);

    let failureReason: string | undefined;

    try {
      // Find user from users database
      const user = await this.prismaUsers.user.findUnique({
        where: { email: dto.email },
      });

      if (!user || !user.isActive) {
        failureReason = 'User not found or inactive';
        await this.createAuditLog(
          null,
          AuthAction.LOGIN,
          false,
          failureReason,
          ipAddress,
          userAgent,
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        failureReason = 'Invalid password';
        await this.createAuditLog(
          user.id,
          AuthAction.LOGIN,
          false,
          failureReason,
          ipAddress,
          userAgent,
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Load user's city assignments with full details
      const dbAssignments = await this.prismaCore.userCityAssignment.findMany({
        where: { userId: user.id, isActive: true },
        select: {
          cityId: true,
          role: true,
          canManageAdmins: true,
        },
      });

      const cityAssignments: CityAssignment[] = dbAssignments.map((a) => ({
        cityId: a.cityId,
        role: a.role,
        canManageAdmins: a.canManageAdmins,
      }));

      // Determine highest role for permissions (use auth role or highest assignment role)
      const roleHierarchy = [UserRole.SUPER_ADMIN, UserRole.CITY_ADMIN, UserRole.CITIZEN];
      const userRoleIndex = roleHierarchy.indexOf(user.role as UserRole);
      const assignmentRoles = dbAssignments.map((a) => a.role);
      const highestAssignmentIndex =
        assignmentRoles.length > 0
          ? Math.min(...assignmentRoles.map((r) => roleHierarchy.indexOf(r)))
          : roleHierarchy.length - 1;

      const effectiveRole =
        userRoleIndex >= 0 && userRoleIndex < highestAssignmentIndex
          ? user.role
          : assignmentRoles.length > 0
            ? roleHierarchy[highestAssignmentIndex]
            : UserRole.CITIZEN;

      const permissions = await this.permissionService.getUserPermissions(
        effectiveRole as UserRole,
      );

      // Generate tokens with city context and permissions
      const selectedCityId = cityAssignments.length > 0 ? cityAssignments[0].cityId : undefined;
      const tokens = await this.jwtService.generateTokenPair(user.id, user.email, user.role, {
        selectedCityId,
        cityAssignments: cityAssignments.length > 0 ? cityAssignments : undefined,
        permissions: permissions.length > 0 ? permissions : undefined,
      });

      // Store refresh token in Redis
      const refreshTokenExpiry = 7 * 24 * 60 * 60; // 7 days
      await this.redis.set(`refresh_token:${user.id}`, tokens.refreshToken, refreshTokenExpiry);

      // Store session in auth database (for audit and future OAuth/BIND_ID)
      const expiresAt = new Date(Date.now() + refreshTokenExpiry * 1000);
      await this.storeSession(user.id, TokenType.JWT, expiresAt, AuthProvider.LOCAL);

      // Create audit log for successful login
      await this.createAuditLog(user.id, AuthAction.LOGIN, true, undefined, ipAddress, userAgent, {
        tokenType: 'JWT',
      });

      this.logger.log(`User logged in successfully: ${user.id}`);

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        ...tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      failureReason = error instanceof Error ? error.message : 'Unknown error';
      await this.createAuditLog(null, AuthAction.LOGIN, false, failureReason, ipAddress, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, ipAddress?: string, userAgent?: string) {
    this.logger.log(`Logging out user: ${userId}`);

    // Remove refresh token from Redis
    await this.redis.del(`refresh_token:${userId}`);

    // Revoke active sessions
    await this.prismaAuth.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    // Create audit log
    await this.createAuditLog(userId, AuthAction.LOGOUT, true, undefined, ipAddress, userAgent);

    // Could also add access token to blacklist here
    // await this.redis.set(`blacklist:${accessToken}`, '1', tokenTtl);

    return {
      message: 'Logged out successfully',
    };
  }

  /**
   * Refresh tokens
   */
  async refreshTokens(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyRefreshToken(refreshToken);

      // Check if refresh token exists in Redis
      const storedToken = await this.redis.get<string>(`refresh_token:${payload.sub}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user from users database
      const user = await this.prismaUsers.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        await this.createAuditLog(
          payload.sub,
          AuthAction.TOKEN_REFRESH,
          false,
          'User not found or inactive',
        );
        throw new UnauthorizedException('User not found or inactive');
      }

      // Load user's city assignments with full details
      const dbAssignments = await this.prismaCore.userCityAssignment.findMany({
        where: { userId: user.id, isActive: true },
        select: {
          cityId: true,
          role: true,
          canManageAdmins: true,
        },
      });

      const cityAssignments: CityAssignment[] = dbAssignments.map((a) => ({
        cityId: a.cityId,
        role: a.role,
        canManageAdmins: a.canManageAdmins,
      }));

      // Determine effective role for permissions
      const roleHierarchy = [UserRole.SUPER_ADMIN, UserRole.CITY_ADMIN, UserRole.CITIZEN];
      const userRoleIndex = roleHierarchy.indexOf(user.role as UserRole);
      const assignmentRoles = dbAssignments.map((a) => a.role);
      const highestAssignmentIndex =
        assignmentRoles.length > 0
          ? Math.min(...assignmentRoles.map((r) => roleHierarchy.indexOf(r)))
          : roleHierarchy.length - 1;

      const effectiveRole =
        userRoleIndex >= 0 && userRoleIndex < highestAssignmentIndex
          ? user.role
          : assignmentRoles.length > 0
            ? roleHierarchy[highestAssignmentIndex]
            : UserRole.CITIZEN;

      const permissions = await this.permissionService.getUserPermissions(
        effectiveRole as UserRole,
      );

      // Generate new tokens with city context and permissions
      const selectedCityId = cityAssignments.length > 0 ? cityAssignments[0].cityId : undefined;
      const tokens = await this.jwtService.generateTokenPair(user.id, user.email, user.role, {
        selectedCityId,
        cityAssignments: cityAssignments.length > 0 ? cityAssignments : undefined,
        permissions: permissions.length > 0 ? permissions : undefined,
      });

      // Update refresh token in Redis
      const refreshTokenExpiry = 7 * 24 * 60 * 60; // 7 days
      await this.redis.set(`refresh_token:${user.id}`, tokens.refreshToken, refreshTokenExpiry);

      // Update session expiry
      const expiresAt = new Date(Date.now() + refreshTokenExpiry * 1000);
      await this.storeSession(user.id, TokenType.REFRESH, expiresAt, AuthProvider.LOCAL);

      // Create audit log
      await this.createAuditLog(user.id, AuthAction.TOKEN_REFRESH, true);

      this.logger.log(`Tokens refreshed for user: ${user.id}`);

      return tokens;
    } catch (error) {
      this.logger.error('Failed to refresh tokens', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Assign city admin (Super Admin or City Admin with canManageAdmins permission)
   */
  async assignCityAdmin(dto: AssignCityAdminDto, requesterId: string) {
    this.logger.log(`Assigning city admin: ${dto.userId} to city: ${dto.cityId}`);

    // Check if requester can manage city admins for this city
    const canManage = await this.permissionService.canManageCityAdmins(requesterId, dto.cityId);
    if (!canManage) {
      throw new ForbiddenException('Insufficient permissions to assign city admins');
    }

    // Verify user exists in users database
    const user = await this.prismaUsers.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Determine canManageAdmins based on requester's permissions and role being assigned
    // Only CITY_ADMIN role can have canManageAdmins=true, and only if requester has that permission
    const requesterAssignments = await this.permissionService.getUserCityAssignments(requesterId);
    const requesterAssignment = requesterAssignments.find((a) => {
      // Find assignment that covers this city (could be parent)
      return a.cityId === dto.cityId || a.canManageAdmins;
    });
    const canGrantManageAdmins =
      requesterAssignment?.canManageAdmins === true && dto.role === UserRole.CITY_ADMIN;

    // Create or update UserCityAssignment
    const assignment = await this.prismaCore.userCityAssignment.upsert({
      where: {
        userId_cityId: {
          userId: dto.userId,
          cityId: dto.cityId,
        },
      },
      update: {
        role: dto.role,
        canManageAdmins: canGrantManageAdmins,
        assignedBy: requesterId,
      },
      create: {
        userId: dto.userId,
        cityId: dto.cityId,
        role: dto.role,
        canManageAdmins: canGrantManageAdmins,
        assignedBy: requesterId,
      },
    });

    this.logger.log(`City admin assigned successfully: ${assignment.id}`);

    return assignment;
  }

  /**
   * Get user's accessible cities
   */
  async getUserCities(userId: string) {
    this.logger.log(`Getting cities for user: ${userId}`);

    const assignments = await this.prismaCore.userCityAssignment.findMany({
      where: { userId, isActive: true },
      select: {
        cityId: true,
        role: true,
        canManageAdmins: true,
        createdAt: true,
      },
    });

    return assignments;
  }

  /**
   * Get user's managed cities (including child cities)
   */
  async getUserManagedCities(userId: string): Promise<string[]> {
    // This would require injecting UserContextService, but for now return assignments
    const assignments = await this.prismaCore.userCityAssignment.findMany({
      where: { userId, isActive: true, role: UserRole.CITY_ADMIN },
      select: { cityId: true },
    });

    return assignments.map((a) => a.cityId);
  }

  /**
   * Get user's active sessions
   */
  async getSessions(userId: string) {
    this.logger.log(`Getting sessions for user: ${userId}`);

    const sessions = await this.prismaAuth.session.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      select: {
        id: true,
        tokenType: true,
        provider: true,
        expiresAt: true,
        createdAt: true,
        metadata: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sessions;
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string) {
    this.logger.log(`Revoking session ${sessionId} for user: ${userId}`);

    // Verify session belongs to user
    const session = await this.prismaAuth.session.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found or already revoked');
    }

    // Revoke session
    await this.prismaAuth.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    // If it's a refresh token session, remove from Redis
    if (session.tokenType === TokenType.JWT || session.tokenType === TokenType.REFRESH) {
      await this.redis.del(`refresh_token:${userId}`);
    }

    // Create audit log
    await this.createAuditLog(userId, AuthAction.LOGOUT, true, undefined, undefined, undefined, {
      sessionId,
      action: 'session_revoked',
    });

    this.logger.log(`Session ${sessionId} revoked successfully`);

    return { message: 'Session revoked successfully' };
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllSessions(userId: string) {
    this.logger.log(`Revoking all sessions for user: ${userId}`);

    // Revoke all active sessions
    const result = await this.prismaAuth.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    // Remove refresh token from Redis
    await this.redis.del(`refresh_token:${userId}`);

    // Create audit log
    await this.createAuditLog(userId, AuthAction.LOGOUT, true, undefined, undefined, undefined, {
      action: 'all_sessions_revoked',
      sessionsRevoked: result.count,
    });

    this.logger.log(`Revoked ${result.count} sessions for user: ${userId}`);

    return {
      message: 'All sessions revoked successfully',
      sessionsRevoked: result.count,
    };
  }
}
