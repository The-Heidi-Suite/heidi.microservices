import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsUUID, IsOptional, IsString, IsArray, IsNumber, Min } from 'class-validator';
import { ListingResponseDto } from './listing-response.dto';

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

export class AddFavoriteDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Identifier of the listing to add or remove from favorites',
  })
  @IsUUID()
  listingId: string;

  @ApiProperty({
    example: true,
    description: 'Set to true to add favorite, false to remove favorite',
  })
  @IsBoolean()
  isFavorite: boolean;
}

export class FavoriteListingDto {
  @ApiProperty({ example: 'fav_01J3M9Z0YK3H2V4C5B6N7P8Q' })
  id: string;

  @ApiPropertyOptional({
    example: 'user_01HZXTY0YK3H2V4C5B6N7P8Q',
    description: 'Identifier of the user who created the favorite (only returned on creation)',
  })
  userId?: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  listingId: string;

  @ApiProperty({
    type: ListingResponseDto,
    description: 'Snapshot of the associated listing when the favorite was created',
  })
  @Type(() => ListingResponseDto)
  listing: ListingResponseDto;

  @ApiProperty({
    example: '2025-01-15T10:30:00.000Z',
    description: 'Timestamp when the favorite entry was created',
  })
  createdAt: string;
}

export class AddFavoriteResponseDto extends FavoriteListingDto {
  @ApiProperty({
    example: 'user_01HZXTY0YK3H2V4C5B6N7P8Q',
    description: 'Identifier of the user who favorited the listing',
  })
  userId!: string;
}

export class RemoveFavoriteResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    example: 'Favorite removed successfully',
    description: 'Confirmation message describing the operation outcome',
  })
  message: string;
}

export class FavoriteFilterDto {
  @ApiPropertyOptional({
    example: 'cleanup',
    description: 'Search term to filter favorites by listing title, summary, or content',
  })
  @IsOptional()
  @IsString()
  search?: string;

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
    example: 1,
    description: 'Page number (1-indexed)',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Number of items per page',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  pageSize?: number;
}
