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
import {
  LoginDto,
  LoginResponseDto,
  LoginUnauthorizedErrorResponseDto,
  RefreshTokenDto,
  RefreshTokenResponseDto,
  RefreshTokenUnauthorizedErrorResponseDto,
  AssignCityAdminDto,
  AssignCityAdminResponseDto,
  AuthForbiddenErrorResponseDto,
  AuthNotFoundErrorResponseDto,
  ValidateTokenResponseDto,
  AuthUnauthorizedErrorResponseDto,
  LogoutResponseDto,
  GetUserCitiesResponseDto,
  GetSessionsResponseDto,
  RevokeSessionResponseDto,
  SessionNotFoundErrorResponseDto,
  RevokeAllSessionsResponseDto,
} from '@heidi/contracts';
import { Public, JwtAuthGuard, GetCurrentUser } from '@heidi/jwt';
import { SuperAdminOnly, AdminOnlyGuard } from '@heidi/rbac';

@ApiTags('auth')
@Controller()
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with email or username and password. You can use either email address (e.g., user@example.com) or username (e.g., johndoe) to login.',
  })
  @ApiBody({
    type: LoginDto,
    examples: {
      emailLogin: {
        summary: 'Login with email',
        value: {
          email: 'user@example.com',
          password: 'password123',
        },
      },
      usernameLogin: {
        summary: 'Login with username',
        value: {
          email: 'johndoe',
          password: 'password123',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    type: LoginUnauthorizedErrorResponseDto,
  })
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
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: LogoutResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: AuthUnauthorizedErrorResponseDto,
  })
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
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
    type: RefreshTokenUnauthorizedErrorResponseDto,
  })
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
    type: ValidateTokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired token',
    type: AuthUnauthorizedErrorResponseDto,
  })
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
  @ApiResponse({
    status: 201,
    description: 'City admin assigned successfully',
    type: AssignCityAdminResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super Admin access required',
    type: AuthForbiddenErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User or city not found',
    type: AuthNotFoundErrorResponseDto,
  })
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
    type: GetUserCitiesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: AuthUnauthorizedErrorResponseDto,
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
    type: GetSessionsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: AuthUnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async getSessions(@GetCurrentUser('userId') userId: string) {
    return this.authService.getSessions(userId);
  }

  @Post('sessions/:sessionId/revoke')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke session', description: 'Revoke a specific session by ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to revoke' })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
    type: RevokeSessionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
    type: SessionNotFoundErrorResponseDto,
  })
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
  @ApiResponse({
    status: 200,
    description: 'All sessions revoked successfully',
    type: RevokeAllSessionsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: AuthUnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async revokeAllSessions(@GetCurrentUser('userId') userId: string) {
    return this.authService.revokeAllSessions(userId);
  }
}
