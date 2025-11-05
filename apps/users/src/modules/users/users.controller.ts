import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  RegisterDto,
  UpdateProfileDto,
  ChangePasswordDto,
  RegisterResponseDto,
  GetUsersResponseDto,
  GetUserResponseDto,
  CreateUserResponseDto,
  UpdateUserResponseDto,
  DeleteUserResponseDto,
  GetProfileResponseDto,
  UpdateProfileResponseDto,
  ChangePasswordResponseDto,
  ValidationErrorResponseDto,
  ConflictErrorResponseDto,
  UnauthorizedErrorResponseDto,
  ForbiddenErrorResponseDto,
  NotFoundErrorResponseDto,
  BadRequestErrorResponseDto,
  GuestLoginDto,
  ConvertGuestDto,
} from '@heidi/contracts';
import { Public, GetCurrentUser, JwtAuthGuard } from '@heidi/jwt';
import { AdminOnlyGuard } from '@heidi/rbac';

@ApiTags('users')
@Controller()
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @Public()
  @ApiOperation({
    summary: 'Register new user',
    description: 'Create a new user account (public endpoint)',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
    type: ConflictErrorResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.usersService.register(dto);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve a paginated list of all users (Admin only)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully',
    type: GetUsersResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    type: ForbiddenErrorResponseDto,
  })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.usersService.findAll(+page, +limit);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve a specific user by their ID (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: GetUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: NotFoundErrorResponseDto,
  })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create user', description: 'Create a new user (Admin only)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: CreateUserResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
    type: ConflictErrorResponseDto,
  })
  async create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update user', description: 'Update a user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UpdateUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: NotFoundErrorResponseDto,
  })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete user', description: 'Delete a user by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    type: DeleteUserResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: NotFoundErrorResponseDto,
  })
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Get('profile/me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get my profile',
    description: 'Get the current authenticated user profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: GetProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async getProfile(@GetCurrentUser('userId') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile/me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update my profile',
    description: 'Update the current authenticated user profile',
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UpdateProfileResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async updateProfile(@GetCurrentUser('userId') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('profile/me/change-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change password',
    description: 'Change the password for the current authenticated user',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    type: ChangePasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - current password incorrect',
    type: BadRequestErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async changePassword(@GetCurrentUser('userId') userId: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto);
  }

  @Post('guest')
  @Public()
  @ApiOperation({
    summary: 'Create guest user (internal)',
    description:
      'Create a new guest user for mobile device (internal endpoint, typically called by auth service)',
  })
  @ApiBody({ type: GuestLoginDto })
  @ApiResponse({
    status: 201,
    description: 'Guest user created or retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    type: ValidationErrorResponseDto,
    examples: {
      validationError: {
        value: {
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/guest',
          method: 'POST',
          requestId: 'req_1234567890_abc123',
          statusCode: 400,
          details: {
            message: [
              'deviceId must be a string',
              'devicePlatform must be one of the following values: IOS, ANDROID',
            ],
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async createGuest(@Body() dto: GuestLoginDto) {
    return this.usersService.createGuest(dto.deviceId, dto.devicePlatform, dto.deviceMetadata);
  }

  @Post('guest/convert')
  @Public()
  @ApiOperation({
    summary: 'Convert guest to registered user',
    description:
      'Convert a guest user account to a registered user account with automatic data migration',
  })
  @ApiBody({ type: ConvertGuestDto })
  @ApiResponse({
    status: 200,
    description: 'Guest user converted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Guest user not found',
    type: NotFoundErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email or username already exists',
    type: ConflictErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async convertGuest(@Body() dto: ConvertGuestDto) {
    return this.usersService.convertGuestToUser(dto.guestUserId, {
      email: dto.email,
      username: dto.username,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      cityId: dto.cityId,
    });
  }
}
