import { ApiProperty } from '@nestjs/swagger';

export class IntegrationDto {
  @ApiProperty({ example: 'e2a8e3f4-1b2c-4d5e-8f9a-0b1c2d3e4f5a', description: 'Integration ID' })
  id: string;

  @ApiProperty({ example: 'Destination One', description: 'Human-readable name' })
  name: string;

  @ApiProperty({ example: 'destination-one', description: 'Provider key/identifier' })
  provider: string;

  @ApiProperty({
    example: 'active',
    description: 'Integration status',
    enum: ['active', 'inactive', 'error'],
  })
  status: 'active' | 'inactive' | 'error';

  @ApiProperty({
    example: '2025-11-04T12:14:57.000Z',
    description: 'Creation timestamp (ISO 8601)',
  })
  createdAt: string;

  @ApiProperty({
    example: '2025-11-15T09:30:00.000Z',
    description: 'Last update timestamp (ISO 8601)',
  })
  updatedAt: string;
}
