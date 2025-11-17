import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncIntegrationDataDto {
  @ApiProperty({ example: 'job_01HZY3QG9J6S7WQ1V3D4', description: 'Background job ID' })
  jobId: string;

  @ApiProperty({
    example: 'queued',
    enum: ['queued', 'started', 'completed'],
    description: 'Sync status',
  })
  status: 'queued' | 'started' | 'completed';

  @ApiProperty({ example: '2025-11-16T21:05:00.000Z', description: 'Sync start time (ISO 8601)' })
  startedAt: string;

  @ApiPropertyOptional({
    example: '2025-11-16T21:10:00.000Z',
    description: 'Sync completion time (ISO 8601)',
  })
  completedAt?: string;

  @ApiPropertyOptional({
    example: 'Initial full sync triggered by admin',
    description: 'Optional message',
  })
  message?: string;
}

export class SyncIntegrationResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: SyncIntegrationDataDto })
  data: SyncIntegrationDataDto;

  @ApiProperty({ example: 'Integration sync initiated successfully' })
  message: string;

  @ApiProperty({ example: '2025-01-17T19:42:44.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/integrations/123e4567-e89b-12d3-a456-426614174000/sync' })
  path: string;

  @ApiProperty({ example: 202, description: 'HTTP status code' })
  statusCode: number;
}
