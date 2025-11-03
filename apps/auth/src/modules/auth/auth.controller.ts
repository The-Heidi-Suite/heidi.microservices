import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, AssignCityAdminDto } from '@heidi/contracts';
import { Public, JwtAuthGuard, GetCurrentUser } from '@heidi/jwt';
import { SuperAdminOnly, AdminOnlyGuard } from '@heidi/rbac';

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'User login', description: 'Authenticate user with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          role: 'USER',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, ipAddress as string, userAgent);
  }

  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'User logout',
    description: 'Log out the current user and invalidate session',
  })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.OK)
  async logout(@GetCurrentUser('userId') userId: string, @Req() req: Request) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.authService.logout(userId, ipAddress as string, userAgent);
  }

  @Post('refresh')
  @Public()
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get a new access token using refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('validate')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Validate token', description: 'Validate the current JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Token is valid',
    schema: {
      example: {
        valid: true,
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          role: 'USER',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @HttpCode(HttpStatus.OK)
  async validate(@GetCurrentUser() user: any) {
    return {
      valid: true,
      user,
    };
  }

  @Post('assign-city-admin')
  @SuperAdminOnly()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Assign city admin',
    description: 'Assign a user as admin for a specific city (Super Admin only)',
  })
  @ApiBody({ type: AssignCityAdminDto })
  @ApiResponse({ status: 201, description: 'City admin assigned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin access required' })
  @ApiResponse({ status: 404, description: 'User or city not found' })
  @HttpCode(HttpStatus.CREATED)
  async assignCityAdmin(
    @Body() dto: AssignCityAdminDto,
    @GetCurrentUser('userId') requesterId: string,
  ) {
    return this.authService.assignCityAdmin(dto, requesterId);
  }

  @Get('cities')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user cities',
    description: 'Get all cities assigned to the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user cities',
    schema: {
      example: [
        {
          cityId: '123e4567-e89b-12d3-a456-426614174000',
          cityName: 'Berlin',
          role: 'CITY_ADMIN',
        },
      ],
    },
  })
  @HttpCode(HttpStatus.OK)
  async getUserCities(@GetCurrentUser('userId') userId: string) {
    return this.authService.getUserCities(userId);
  }

  @Get('sessions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user sessions',
    description: 'Get all active sessions for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user sessions',
    schema: {
      example: [
        {
          sessionId: '123e4567-e89b-12d3-a456-426614174000',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          createdAt: '2024-01-01T00:00:00Z',
          expiresAt: '2024-01-02T00:00:00Z',
        },
      ],
    },
  })
  @HttpCode(HttpStatus.OK)
  async getSessions(@GetCurrentUser('userId') userId: string) {
    return this.authService.getSessions(userId);
  }

  @Post('sessions/:sessionId/revoke')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke session', description: 'Revoke a specific session by ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to revoke' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @HttpCode(HttpStatus.OK)
  async revokeSession(
    @GetCurrentUser('userId') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.authService.revokeSession(userId, sessionId);
  }

  @Post('sessions/revoke-all')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Revoke all sessions',
    description: 'Revoke all active sessions for the current user',
  })
  @ApiResponse({ status: 200, description: 'All sessions revoked successfully' })
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(@GetCurrentUser('userId') userId: string) {
    return this.authService.revokeAllSessions(userId);
  }
}
