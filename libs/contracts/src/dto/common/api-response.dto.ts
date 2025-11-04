import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiSuccessResponseDto<T = any> {
  @ApiProperty({ example: true, description: 'Indicates if the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Response timestamp' })
  timestamp: string;

  @ApiProperty({ example: '/api/auth/login', description: 'Request path' })
  path: string;

  @ApiProperty({ example: 200, description: 'HTTP status code' })
  statusCode: number;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: 'UNAUTHORIZED', description: 'Error code' })
  errorCode: string;

  @ApiProperty({ example: 'Invalid credentials', description: 'Error message' })
  message: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({ example: '/api/auth/login', description: 'Request path' })
  path: string;

  @ApiProperty({ example: 'POST', description: 'HTTP method' })
  method: string;

  @ApiProperty({ example: 'req_1234567890_abc123', description: 'Request ID for tracing' })
  requestId: string;

  @ApiProperty({ example: 401, description: 'HTTP status code' })
  statusCode: number;

  @ApiPropertyOptional({ description: 'Additional error details' })
  details?: any;
}
