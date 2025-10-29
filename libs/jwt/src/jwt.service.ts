import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { LoggerService } from '@heidi/logger';

export interface TokenPayload {
  sub: string; // user id
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class JwtTokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor(
    private readonly jwtService: NestJwtService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(JwtTokenService.name);
    this.accessTokenSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  /**
   * Generate access token
   */
  async generateAccessToken(userId: string, email: string, role: string): Promise<string> {
    const payload: TokenPayload = {
      sub: userId,
      email,
      role,
      type: 'access',
    };

    return this.jwtService.sign(payload, {
      secret: this.accessTokenSecret,
      expiresIn: this.accessTokenExpiry,
    });
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(userId: string, email: string, role: string): Promise<string> {
    const payload: TokenPayload = {
      sub: userId,
      email,
      role,
      type: 'refresh',
    };

    return this.jwtService.sign(payload, {
      secret: this.refreshTokenSecret,
      expiresIn: this.refreshTokenExpiry,
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  async generateTokenPair(userId: string, email: string, role: string): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email, role),
      this.generateRefreshToken(userId, email, role),
    ]);

    // Parse expiry time to seconds
    const expiresIn = this.parseExpiryToSeconds(this.accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.accessTokenSecret,
      });

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch (error) {
      this.logger.error('Failed to verify access token', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Verify refresh token
   */
  async verifyRefreshToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.refreshTokenSecret,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch (error) {
      this.logger.error('Failed to verify refresh token', error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900; // 15 minutes default
    }
  }
}
