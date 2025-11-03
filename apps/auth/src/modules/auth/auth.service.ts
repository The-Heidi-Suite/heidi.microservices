import { Injectable, UnauthorizedException, ConflictException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaAuthService } from '@heidi/prisma';
import { PrismaPermissionsService } from '@heidi/prisma-permissions';
import { PermissionService } from '@heidi/rbac';
import { JwtTokenService } from '@heidi/jwt';
import { RedisService } from '@heidi/redis';
import { RabbitMQService, RabbitMQPatterns } from '@heidi/rabbitmq';
import { UserRole } from '@prisma/client-permissions';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto, AssignCityAdminDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaAuthService,
    private readonly prismaPermissions: PrismaPermissionsService,
    private readonly permissionService: PermissionService,
    private readonly jwtService: JwtTokenService,
    private readonly redis: RedisService,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  /**
   * Register a new user
   */
  async register(dto: RegisterDto) {
    this.logger.log(`Registering user: ${dto.email}`);

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'CITIZEN',
        cityId: dto.cityId || null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        cityId: true,
        createdAt: true,
      },
    });

    // Create UserCityAssignment if cityId provided
    let cityIds: string[] = [];
    if (dto.cityId) {
      await this.prismaPermissions.userCityAssignment.create({
        data: {
          userId: user.id,
          cityId: dto.cityId,
          role: UserRole.CITIZEN,
        },
      });
      cityIds = [dto.cityId];
    }

    // Load user permissions
    const permissions = await this.permissionService.getUserPermissions(
      user.role as UserRole,
    );

    // Emit user created event
    await this.rabbitmq.emit(RabbitMQPatterns.USER_CREATED, {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    // Generate tokens with city context and permissions
    const tokens = await this.jwtService.generateTokenPair(user.id, user.email, user.role, {
      cityId: dto.cityId,
      cityIds: cityIds.length > 0 ? cityIds : undefined,
      permissions: permissions.length > 0 ? permissions : undefined,
    });

    // Store refresh token in Redis
    await this.redis.set(
      `refresh_token:${user.id}`,
      tokens.refreshToken,
      7 * 24 * 60 * 60, // 7 days
    );

    this.logger.log(`User registered successfully: ${user.id}`);

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Login user
   */
  async login(dto: LoginDto) {
    this.logger.log(`Login attempt for: ${dto.email}`);

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Load user's city assignments
    const cityAssignments = await this.prismaPermissions.userCityAssignment.findMany({
      where: { userId: user.id },
      select: { cityId: true },
    });
    const cityIds = cityAssignments.map((a) => a.cityId);

    // Load user permissions
    const permissions = await this.permissionService.getUserPermissions(
      user.role as UserRole,
    );

    // Generate tokens with city context and permissions
    const tokens = await this.jwtService.generateTokenPair(user.id, user.email, user.role, {
      cityId: user.cityId || (cityIds.length > 0 ? cityIds[0] : undefined),
      cityIds: cityIds.length > 0 ? cityIds : undefined,
      permissions: permissions.length > 0 ? permissions : undefined,
    });

    // Store refresh token in Redis
    await this.redis.set(
      `refresh_token:${user.id}`,
      tokens.refreshToken,
      7 * 24 * 60 * 60, // 7 days
    );

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
  }

  /**
   * Logout user
   */
  async logout(userId: string) {
    this.logger.log(`Logging out user: ${userId}`);

    // Remove refresh token from Redis
    await this.redis.del(`refresh_token:${userId}`);

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

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Load user's city assignments
      const cityAssignments = await this.prismaPermissions.userCityAssignment.findMany({
        where: { userId: user.id },
        select: { cityId: true },
      });
      const cityIds = cityAssignments.map((a) => a.cityId);

      // Load user permissions
      const permissions = await this.permissionService.getUserPermissions(
        user.role as UserRole,
      );

      // Generate new tokens with city context and permissions
      const tokens = await this.jwtService.generateTokenPair(user.id, user.email, user.role, {
        cityId: user.cityId || (cityIds.length > 0 ? cityIds[0] : undefined),
        cityIds: cityIds.length > 0 ? cityIds : undefined,
        permissions: permissions.length > 0 ? permissions : undefined,
      });

      // Update refresh token in Redis
      await this.redis.set(
        `refresh_token:${user.id}`,
        tokens.refreshToken,
        7 * 24 * 60 * 60, // 7 days
      );

      this.logger.log(`Tokens refreshed for user: ${user.id}`);

      return tokens;
    } catch (error) {
      this.logger.error('Failed to refresh tokens', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Assign city admin (Super Admin only)
   */
  async assignCityAdmin(dto: AssignCityAdminDto, requesterId: string) {
    this.logger.log(`Assigning city admin: ${dto.userId} to city: ${dto.cityId}`);

    // Verify requester is Super Admin
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
    });

    if (!requester || requester.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admins can assign city admins');
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Create or update UserCityAssignment
    const assignment = await this.prismaPermissions.userCityAssignment.upsert({
      where: {
        userId_cityId: {
          userId: dto.userId,
          cityId: dto.cityId,
        },
      },
      update: {
        role: dto.role,
      },
      create: {
        userId: dto.userId,
        cityId: dto.cityId,
        role: dto.role,
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

    const assignments = await this.prismaPermissions.userCityAssignment.findMany({
      where: { userId },
      select: {
        cityId: true,
        role: true,
        createdAt: true,
      },
    });

    return assignments;
  }
}
