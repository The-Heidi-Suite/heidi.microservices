import { ApiProperty } from '@nestjs/swagger';
import { IntegrationDto } from './integration.dto';

export class GetIntegrationsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [IntegrationDto] })
  data: IntegrationDto[];

  @ApiProperty({ example: 'Integrations retrieved successfully' })
  message: string;

  @ApiProperty({ example: '2025-01-17T19:42:44.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/integrations' })
  path: string;

  @ApiProperty({ example: 200, description: 'HTTP status code' })
  statusCode: number;
}
