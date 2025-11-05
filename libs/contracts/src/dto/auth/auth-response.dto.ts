import { ApiProperty } from '@nestjs/swagger';

// Logout Response
export class LogoutResponseDataDto {
  @ApiProperty({ example: 'Logged out successfully' })
  message: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: LogoutResponseDataDto })
  data: LogoutResponseDataDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/logout' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

// Refresh Token Response
export class RefreshTokenResponseDataDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ example: 900, description: 'Token expiration time in seconds' })
  expiresIn: number;
}

export class RefreshTokenResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: RefreshTokenResponseDataDto })
  data: RefreshTokenResponseDataDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/refresh' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

// Validate Token Response
export class ValidateTokenUserDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'CITIZEN', enum: ['CITIZEN', 'CITY_ADMIN', 'SUPER_ADMIN'] })
  role: string;
}

export class ValidateTokenResponseDataDto {
  @ApiProperty({ example: true })
  valid: boolean;

  @ApiProperty({ type: ValidateTokenUserDto })
  user: ValidateTokenUserDto;
}

export class ValidateTokenResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: ValidateTokenResponseDataDto })
  data: ValidateTokenResponseDataDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/validate' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

// Assign City Admin Response
export class AssignCityAdminResponseDataDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  userId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  cityId: string;

  @ApiProperty({ example: 'CITY_ADMIN', enum: ['CITY_ADMIN'] })
  role: string;
}

export class AssignCityAdminResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: AssignCityAdminResponseDataDto })
  data: AssignCityAdminResponseDataDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/assign-city-admin' })
  path: string;

  @ApiProperty({ example: 201 })
  statusCode: number;
}

// Get User Cities Response
export class UserCityDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  cityId: string;

  @ApiProperty({ example: 'CITY_ADMIN', enum: ['CITIZEN', 'CITY_ADMIN'] })
  role: string;

  @ApiProperty({ example: true })
  canManageAdmins: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;
}

export class GetUserCitiesResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [UserCityDto], isArray: true })
  data: UserCityDto[];

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/cities' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

// Get Sessions Response
export class SessionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'JWT', enum: ['JWT', 'REFRESH'] })
  tokenType: string;

  @ApiProperty({ example: 'LOCAL', enum: ['LOCAL'] })
  provider: string;

  @ApiProperty({ example: '2024-01-02T00:00:00.000Z' })
  expiresAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: null, nullable: true })
  metadata: any;
}

export class GetSessionsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [SessionDto] })
  data: SessionDto[];

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/sessions' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

// Revoke Session Response
export class RevokeSessionResponseDataDto {
  @ApiProperty({ example: 'Session revoked successfully' })
  message: string;
}

export class RevokeSessionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: RevokeSessionResponseDataDto })
  data: RevokeSessionResponseDataDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/sessions/123e4567-e89b-12d3-a456-426614174000/revoke' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}

// Revoke All Sessions Response
export class RevokeAllSessionsResponseDataDto {
  @ApiProperty({ example: 'All sessions revoked successfully' })
  message: string;

  @ApiProperty({ example: 3 })
  sessionsRevoked: number;
}

export class RevokeAllSessionsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: RevokeAllSessionsResponseDataDto })
  data: RevokeAllSessionsResponseDataDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/sessions/revoke-all' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}
