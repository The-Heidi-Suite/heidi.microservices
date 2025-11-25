import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class TagFilterDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number (1-indexed)' })
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page' })
  @Type(() => Number)
  @IsOptional()
  @IsPositive()
  pageSize?: number = 20;

  @ApiPropertyOptional({ example: 'DESTINATION_ONE', description: 'Filter by provider' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    example: 'museum',
    description: 'Search term applied to external value or label',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
