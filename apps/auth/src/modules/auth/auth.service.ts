import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '@heidi/prisma';
import { JwtTokenService } from '@heidi/jwt';
import { RedisService } from '@heidi/redis';
import { RabbitMQService, RabbitMQPatterns } from '@heidi/rabbitmq';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
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
        role: 'USER',
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    // Emit user created event
    await this.rabbitmq.emit(RabbitMQPatterns.USER_CREATED, {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    // Generate tokens
    const tokens = await this.jwtService.generateTokenPair(user.id, user.email, user.role);

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

    // Generate tokens
    const tokens = await this.jwtService.generateTokenPair(user.id, user.email, user.role);

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

      // Generate new tokens
      const tokens = await this.jwtService.generateTokenPair(user.id, user.email, user.role);

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
}
