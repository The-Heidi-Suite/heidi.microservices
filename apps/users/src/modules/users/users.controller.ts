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
  ApiErrorResponseDto,
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
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    type: ApiErrorResponseDto,
    schema: {
      example: {
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/users/register',
        method: 'POST',
        requestId: 'req_1234567890_abc123',
        details: {
          message: [
            'email must be an email',
            'password must be longer than or equal to 8 characters',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
    type: ApiErrorResponseDto,
    schema: {
      example: {
        statusCode: 409,
        errorCode: 'CONFLICT',
        message: 'User with this email already exists',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/users/register',
        method: 'POST',
        requestId: 'req_1234567890_abc123',
      },
    },
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
    schema: {
      example: {
        users: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'CITIZEN',
            isActive: true,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        total: 100,
        page: 1,
        limit: 10,
        pages: 10,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
    schema: {
      example: {
        statusCode: 401,
        errorCode: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/users',
        method: 'GET',
        requestId: 'req_1234567890_abc123',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
    type: ApiErrorResponseDto,
    schema: {
      example: {
        statusCode: 403,
        errorCode: 'FORBIDDEN',
        message: 'Insufficient permissions',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/users',
        method: 'GET',
        requestId: 'req_1234567890_abc123',
      },
    },
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
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: ApiErrorResponseDto,
    schema: {
      example: {
        statusCode: 404,
        errorCode: 'NOT_FOUND',
        message: 'User not found',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/users/123e4567-e89b-12d3-a456-426614174000',
        method: 'GET',
        requestId: 'req_1234567890_abc123',
      },
    },
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
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed',
    type: ApiErrorResponseDto,
    schema: {
      example: {
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/users',
        method: 'POST',
        requestId: 'req_1234567890_abc123',
        details: {
          message: ['email must be an email', 'role must be a valid enum value'],
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'User already exists',
    type: ApiErrorResponseDto,
    schema: {
      example: {
        statusCode: 409,
        errorCode: 'CONFLICT',
        message: 'User with this email already exists',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/users',
        method: 'POST',
        requestId: 'req_1234567890_abc123',
      },
    },
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
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'ADMIN',
        isActive: true,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: ApiErrorResponseDto,
    schema: {
      example: {
        statusCode: 404,
        errorCode: 'NOT_FOUND',
        message: 'User not found',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/users/123e4567-e89b-12d3-a456-426614174000',
        method: 'PATCH',
        requestId: 'req_1234567890_abc123',
      },
    },
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
    schema: {
      example: {
        message: 'User deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    type: ApiErrorResponseDto,
    schema: {
      example: {
        statusCode: 404,
        errorCode: 'NOT_FOUND',
        message: 'User not found',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/users/123e4567-e89b-12d3-a456-426614174000',
        method: 'DELETE',
        requestId: 'req_1234567890_abc123',
      },
    },
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
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CITIZEN',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        cityAssignments: [
          {
            cityId: '123e4567-e89b-12d3-a456-426614174001',
            role: 'CITIZEN',
            canManageAdmins: false,
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
    schema: {
      example: {
        statusCode: 401,
        errorCode: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/users/profile/me',
        method: 'GET',
        requestId: 'req_1234567890_abc123',
      },
    },
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
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
      },
    },
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
    schema: {
      example: {
        message: 'Password changed successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - current password incorrect',
    type: ApiErrorResponseDto,
    schema: {
      example: {
        statusCode: 400,
        errorCode: 'BAD_REQUEST',
        message: 'Current password is incorrect',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/users/profile/me/change-password',
        method: 'POST',
        requestId: 'req_1234567890_abc123',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ApiErrorResponseDto,
    schema: {
      example: {
        statusCode: 401,
        errorCode: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        timestamp: '2024-01-01T00:00:00.000Z',
        path: '/api/users/profile/me/change-password',
        method: 'POST',
        requestId: 'req_1234567890_abc123',
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async changePassword(@GetCurrentUser('userId') userId: string, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto);
  }
}
