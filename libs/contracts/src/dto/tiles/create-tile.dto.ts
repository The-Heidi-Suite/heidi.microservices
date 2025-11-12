import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUrl,
  IsDateString,
  IsNumber,
  ValidateNested,
  IsArray,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TileCityReferenceDto {
  @ApiPropertyOptional({
    description: 'Existing TileCity ID for updates',
    example: 'tile_city_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({
    description: 'City ID to associate with the tile',
    example: 'city_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @IsString()
  cityId: string;

  @ApiPropertyOptional({
    description: 'Whether this is the primary city for the tile',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    description: 'Display order for this city association',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class CreateTileDto {
  @ApiPropertyOptional({
    description: 'URL-friendly slug for the tile (auto-generated from header if not provided)',
    example: 'kiel-gift-card-promo',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Background image URL for the tile',
    example: 'https://example.com/images/tile-background.jpg',
  })
  @IsOptional()
  @IsUrl()
  backgroundImageUrl?: string;

  @ApiPropertyOptional({
    description: 'Header background color in hex format',
    example: '#1E40AF',
    pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'headerBackgroundColor must be a valid hex color code',
  })
  headerBackgroundColor?: string;

  @ApiProperty({
    description: 'Header text for the tile',
    example: 'Kielgutschein',
  })
  @IsString()
  header: string;

  @ApiPropertyOptional({
    description: 'Subheader text for the tile',
    example: 'Ein Gutschein, so viele Möglichkeiten',
  })
  @IsOptional()
  @IsString()
  subheader?: string;

  @ApiPropertyOptional({
    description: 'Description/content text for the tile',
    example:
      'Der KielGutschein steht für bunte Vielfalt und kann bei über 120 lokalen Geschäften eingelöst werden.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Content background color in hex format',
    example: '#3B82F6',
    pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'contentBackgroundColor must be a valid hex color code',
  })
  contentBackgroundColor?: string;

  @ApiPropertyOptional({
    description: 'Optional website URL to link to',
    example: 'https://www.kiel.de/gutschein',
  })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether to open the website in external browser (true) or in-app browser (false)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  openInExternalBrowser?: boolean;

  @ApiPropertyOptional({
    description: 'Display order for sorting tiles',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the tile is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Publish date/time (ISO 8601)',
    example: '2025-01-20T09:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @ApiPropertyOptional({
    description: 'Expiration date/time (ISO 8601)',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expireAt?: string;

  @ApiPropertyOptional({
    description: 'Cities to associate with this tile',
    type: [TileCityReferenceDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TileCityReferenceDto)
  @IsArray()
  cities?: TileCityReferenceDto[];
}
