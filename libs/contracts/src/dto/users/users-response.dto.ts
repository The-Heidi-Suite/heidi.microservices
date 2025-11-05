import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Error Response DTOs
export class ValidationErrorResponseDto {
  @ApiProperty({ example: 'VALIDATION_ERROR', description: 'Error code' })
  errorCode: string;

  @ApiProperty({ example: 'Validation failed', description: 'Error message' })
  message: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({ example: '/register', description: 'Request path' })
  path: string;

  @ApiProperty({ example: 'POST', description: 'HTTP method' })
  method: string;

  @ApiProperty({ example: 'req_1234567890_abc123', description: 'Request ID for tracing' })
  requestId: string;

  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode: number;

  @ApiPropertyOptional({
    description: 'Additional error details',
    example: {
      message: ['email must be an email', 'password must be longer than or equal to 8 characters'],
    },
  })
  details?: any;
}

export class ConflictErrorResponseDto {
  @ApiProperty({ example: 'CONFLICT', description: 'Error code' })
  errorCode: string;

  @ApiProperty({ example: 'User with this email already exists', description: 'Error message' })
  message: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({ example: '/register', description: 'Request path' })
  path: string;

  @ApiProperty({ example: 'POST', description: 'HTTP method' })
  method: string;

  @ApiProperty({ example: 'req_1234567890_abc123', description: 'Request ID for tracing' })
  requestId: string;

  @ApiProperty({ example: 409, description: 'HTTP status code' })
  statusCode: number;
}

export class UnauthorizedErrorResponseDto {
  @ApiProperty({ example: 'UNAUTHORIZED', description: 'Error code' })
  errorCode: string;

  @ApiProperty({ example: 'Invalid or expired token', description: 'Error message' })
  message: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({ example: '/api/users', description: 'Request path' })
  path: string;

  @ApiProperty({ example: 'GET', description: 'HTTP method' })
  method: string;

  @ApiProperty({ example: 'req_1234567890_abc123', description: 'Request ID for tracing' })
  requestId: string;

  @ApiProperty({ example: 401, description: 'HTTP status code' })
  statusCode: number;
}

export class ForbiddenErrorResponseDto {
  @ApiProperty({ example: 'FORBIDDEN', description: 'Error code' })
  errorCode: string;

  @ApiProperty({ example: 'Insufficient permissions', description: 'Error message' })
  message: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({ example: '/api/users', description: 'Request path' })
  path: string;

  @ApiProperty({ example: 'GET', description: 'HTTP method' })
  method: string;

  @ApiProperty({ example: 'req_1234567890_abc123', description: 'Request ID for tracing' })
  requestId: string;

  @ApiProperty({ example: 403, description: 'HTTP status code' })
  statusCode: number;
}

export class NotFoundErrorResponseDto {
  @ApiProperty({ example: 'NOT_FOUND', description: 'Error code' })
  errorCode: string;

  @ApiProperty({ example: 'User not found', description: 'Error message' })
  message: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({ example: '/123e4567-e89b-12d3-a456-426614174000', description: 'Request path' })
  path: string;

  @ApiProperty({ example: 'GET', description: 'HTTP method' })
  method: string;

  @ApiProperty({ example: 'req_1234567890_abc123', description: 'Request ID for tracing' })
  requestId: string;

  @ApiProperty({ example: 404, description: 'HTTP status code' })
  statusCode: number;
}

export class BadRequestErrorResponseDto {
  @ApiProperty({ example: 'BAD_REQUEST', description: 'Error code' })
  errorCode: string;

  @ApiProperty({ example: 'Current password is incorrect', description: 'Error message' })
  message: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({ example: '/profile/me/change-password', description: 'Request path' })
  path: string;

  @ApiProperty({ example: 'POST', description: 'HTTP method' })
  method: string;

  @ApiProperty({ example: 'req_1234567890_abc123', description: 'Request ID for tracing' })
  requestId: string;

  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode: number;
}

// Shared User DTO
export class UserDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'johndoe' })
  username: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'CITIZEN', enum: ['CITIZEN', 'CITY_ADMIN', 'SUPER_ADMIN'] })
  role: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', required: false })
  createdAt?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', required: false })
  updatedAt?: string;
}

// Register Response
export class RegisterResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UserDto })
  data: UserDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/register' })
  path: string;

  @ApiProperty({ example: 201 })
  statusCode: number;
}

// Get All Users Response
export class GetUsersResponseDataDto {
  @ApiProperty({ type: [UserDto] })
  users: UserDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 10 })
  pages: number;
}

export class GetUsersResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: GetUsersResponseDataDto })
  data: GetUsersResponseDataDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

// Get User Response
export class GetUserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UserDto })
  data: UserDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/123e4567-e89b-12d3-a456-426614174000' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

// Create User Response
export class CreateUserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UserDto })
  data: UserDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/' })
  path: string;

  @ApiProperty({ example: 201 })
  statusCode: number;
}

// Update User Response
export class UpdateUserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UserDto })
  data: UserDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/123e4567-e89b-12d3-a456-426614174000' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

// Delete User Response
export class DeleteUserResponseDataDto {
  @ApiProperty({ example: 'User deleted successfully' })
  message: string;
}

export class DeleteUserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: DeleteUserResponseDataDto })
  data: DeleteUserResponseDataDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/123e4567-e89b-12d3-a456-426614174000' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

// Get Profile Response
export class CityAssignmentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  cityId: string;

  @ApiProperty({ example: 'CITIZEN', enum: ['CITIZEN', 'CITY_ADMIN'] })
  role: string;

  @ApiProperty({ example: false })
  canManageAdmins: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;
}

export class GetProfileResponseDataDto extends UserDto {
  @ApiProperty({ type: [CityAssignmentDto] })
  cityAssignments: CityAssignmentDto[];
}

export class GetProfileResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: GetProfileResponseDataDto })
  data: GetProfileResponseDataDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/profile/me' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

// Update Profile Response
export class UpdateProfileResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UserDto })
  data: UserDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/profile/me' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

// Change Password Response
export class ChangePasswordResponseDataDto {
  @ApiProperty({ example: 'Password changed successfully' })
  message: string;
}

export class ChangePasswordResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ChangePasswordResponseDataDto })
  data: ChangePasswordResponseDataDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/profile/me/change-password' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}
