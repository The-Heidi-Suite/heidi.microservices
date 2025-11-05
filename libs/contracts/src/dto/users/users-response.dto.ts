import { ApiProperty } from '@nestjs/swagger';

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
