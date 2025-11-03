import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, AssignCityAdminDto } from './dto';
import { Public, JwtAuthGuard, GetCurrentUser } from '@heidi/jwt';
import { SuperAdminOnly, AdminOnlyGuard } from '@heidi/rbac';

@Controller('auth')
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@GetCurrentUser('userId') userId: string) {
    return this.authService.logout(userId);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(@GetCurrentUser() user: any) {
    return {
      valid: true,
      user,
    };
  }

  @Post('assign-city-admin')
  @SuperAdminOnly()
  @HttpCode(HttpStatus.CREATED)
  async assignCityAdmin(
    @Body() dto: AssignCityAdminDto,
    @GetCurrentUser('userId') requesterId: string,
  ) {
    return this.authService.assignCityAdmin(dto, requesterId);
  }

  @Get('cities')
  @HttpCode(HttpStatus.OK)
  async getUserCities(@GetCurrentUser('userId') userId: string) {
    return this.authService.getUserCities(userId);
  }
}
