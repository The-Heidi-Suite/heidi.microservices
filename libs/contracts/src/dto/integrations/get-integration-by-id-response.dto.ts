import { ApiProperty } from '@nestjs/swagger';
import { IntegrationDto } from './integration.dto';

export class IntegrationNotFoundErrorResponseDto {
  @ApiProperty({ example: 'NOT_FOUND', description: 'Error code' })
  errorCode: string;

  @ApiProperty({ example: 'Integration not found', description: 'Error message' })
  message: string;

  @ApiProperty({ example: '2025-11-16T21:05:00.000Z', description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({ example: '/integrations/unknown-id', description: 'Request path' })
  path: string;

  @ApiProperty({ example: 'GET', description: 'HTTP method' })
  method: string;

  @ApiProperty({ example: 'req_1234567890_abc123', description: 'Request ID for tracing' })
  requestId: string;

  @ApiProperty({ example: 404, description: 'HTTP status code' })
  statusCode: number;
}

export class GetIntegrationByIdResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: IntegrationDto })
  data: IntegrationDto;

  @ApiProperty({ example: 'Integration retrieved successfully' })
  message: string;

  @ApiProperty({ example: '2025-01-17T19:42:44.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/integrations/123e4567-e89b-12d3-a456-426614174000' })
  path: string;

  @ApiProperty({ example: 200, description: 'HTTP status code' })
  statusCode: number;
}
