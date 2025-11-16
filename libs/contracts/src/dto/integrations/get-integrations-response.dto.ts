import { ApiProperty } from '@nestjs/swagger';
import { IntegrationDto } from './integration.dto';

export class GetIntegrationsResponseDto {
  @ApiProperty({ type: [IntegrationDto] })
  data: IntegrationDto[];

  @ApiProperty({ example: 2, description: 'Total count of integrations' })
  total: number;

  @ApiProperty({ example: 200, description: 'HTTP status code' })
  statusCode: number;
}
