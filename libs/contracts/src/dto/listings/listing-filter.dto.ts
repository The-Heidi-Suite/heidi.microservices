import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  ListingModerationStatus,
  ListingSourceType,
  ListingStatus,
  ListingVisibility,
} from '@prisma/client-core';

const transformArrayParam = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value;
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const transformBooleanParam = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
};

export class ListingFilterDto {
  @ApiPropertyOptional({
    example: 'cleanup',
    description: 'Search term to filter listings by title, summary, or content',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: ['city_01HZXTY0YK3H2V4C5B6N7P8Q'],
    isArray: true,
    description: 'Filter by city IDs (comma-separated or array)',
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => transformArrayParam(value))
  @IsString({ each: true })
  cityIds?: string[];

  @ApiPropertyOptional({
    example: ['c1a2b3c4-d5e6-7890-abcd-ef1234567890'],
    isArray: true,
    description: 'Filter by category IDs (comma-separated or array)',
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => transformArrayParam(value))
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({
    enum: ListingStatus,
    example: ListingStatus.PENDING,
    description: 'Filter by listing status',
  })
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @ApiPropertyOptional({
    enum: ListingModerationStatus,
    example: ListingModerationStatus.PENDING,
    description: 'Filter by moderation status',
  })
  @IsOptional()
  @IsEnum(ListingModerationStatus)
  moderationStatus?: ListingModerationStatus;

  @ApiPropertyOptional({
    enum: ListingVisibility,
    example: ListingVisibility.PUBLIC,
    description: 'Filter by visibility level',
  })
  @IsOptional()
  @IsEnum(ListingVisibility)
  visibility?: ListingVisibility;

  @ApiPropertyOptional({
    enum: ListingSourceType,
    example: ListingSourceType.MANUAL,
    description: 'Filter by source type',
  })
  @IsOptional()
  @IsEnum(ListingSourceType)
  sourceType?: ListingSourceType;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by featured status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => transformBooleanParam(value))
  isFeatured?: boolean;

  @ApiPropertyOptional({
    example: ['en', 'es'],
    isArray: true,
    description: 'Filter by language codes (comma-separated or array)',
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => transformArrayParam(value))
  @IsString({ each: true })
  languageCodes?: string[];

  @ApiPropertyOptional({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Filter listings published after this date',
  })
  @IsOptional()
  @IsDateString()
  publishAfter?: string;

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59.000Z',
    description: 'Filter listings published before this date',
  })
  @IsOptional()
  @IsDateString()
  publishBefore?: string;

  @ApiPropertyOptional({
    example: '2025-01-20T00:00:00.000Z',
    description: 'Filter listings with events starting after this date',
  })
  @IsOptional()
  @IsDateString()
  upcomingAfter?: string;

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59.000Z',
    description: 'Filter listings with events starting before this date',
  })
  @IsOptional()
  @IsDateString()
  upcomingBefore?: string;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Field to sort by (e.g., createdAt, title, publishAt)',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    example: 'desc',
    description: 'Sort direction',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number (1-indexed)',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Number of items per page',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pageSize?: number;

  @ApiPropertyOptional({
    example: 'nearby',
    description:
      'Quick filter key to apply (e.g., "nearby", "see-all"). When "nearby" is used, userLat and userLng must be provided.',
  })
  @IsOptional()
  @IsString()
  quickFilter?: string;

  @ApiPropertyOptional({
    example: 54.3233,
    description:
      'User latitude for distance-based filtering (required when quickFilter is "nearby")',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userLat?: number;

  @ApiPropertyOptional({
    example: 10.1394,
    description:
      'User longitude for distance-based filtering (required when quickFilter is "nearby")',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userLng?: number;

  @ApiPropertyOptional({
    example: 1500,
    description:
      'Search radius in meters for distance-based filtering (defaults to filter-specific value if not provided)',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  radiusMeters?: number;
}
