import { ApiProperty } from '@nestjs/swagger';

// Login Error Responses
export class LoginUnauthorizedErrorResponseDto {
  @ApiProperty({ example: 'UNAUTHORIZED', description: 'Error code' })
  errorCode: string;

  @ApiProperty({ example: 'Invalid credentials', description: 'Error message' })
  message: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({ example: '/login', description: 'Request path' })
  path: string;

  @ApiProperty({ example: 'POST', description: 'HTTP method' })
  method: string;

  @ApiProperty({ example: 'req_1234567890_abc123', description: 'Request ID for tracing' })
  requestId: string;

  @ApiProperty({ example: 401, description: 'HTTP status code' })
  statusCode: number;
}

export class LoginUserDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'user@example.com', required: false })
  email?: string;

  @ApiProperty({ example: 'johndoe', required: false })
  username?: string;

  @ApiProperty({ example: 'CITIZEN', enum: ['CITIZEN', 'CITY_ADMIN', 'SUPER_ADMIN'] })
  role: string;

  @ApiProperty({ example: 'REGISTERED', enum: ['GUEST', 'REGISTERED'] })
  userType: string;

  @ApiProperty({ example: 'John', required: false })
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  lastName?: string;
}

export class LoginResponseDataDto {
  @ApiProperty({ type: LoginUserDto })
  user: LoginUserDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ example: 900, description: 'Token expiration time in seconds' })
  expiresIn: number;
}

export class LoginResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: LoginResponseDataDto })
  data: LoginResponseDataDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/login' })
  path: string;

  @ApiProperty({ example: 200 })
  statusCode: number;
}
