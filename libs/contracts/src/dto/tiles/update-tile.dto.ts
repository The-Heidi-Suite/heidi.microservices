import { PartialType } from '@nestjs/mapped-types';
import { CreateTileDto } from './create-tile.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTileDto extends PartialType(CreateTileDto) {
  @ApiPropertyOptional({
    description: 'URL-friendly slug for the tile',
    example: 'kiel-gift-card-promo',
  })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Header background color in hex format',
  })
  headerBackgroundColor?: string;

  @ApiPropertyOptional({
    description: 'Header text for the tile',
  })
  header?: string;

  @ApiPropertyOptional({
    description: 'Subheader text for the tile',
  })
  subheader?: string;

  @ApiPropertyOptional({
    description: 'Description/content text for the tile',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Content background color in hex format',
  })
  contentBackgroundColor?: string;

  @ApiPropertyOptional({
    description: 'Optional website URL to link to',
  })
  websiteUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether to open the website in external browser',
  })
  openInExternalBrowser?: boolean;

  @ApiPropertyOptional({
    description: 'Display order for sorting tiles',
  })
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the tile is active',
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Publish date/time (ISO 8601)',
  })
  publishAt?: string;

  @ApiPropertyOptional({
    description: 'Expiration date/time (ISO 8601)',
  })
  expireAt?: string;

  @ApiPropertyOptional({
    description: 'Cities to associate with this tile',
  })
  cities?: CreateTileDto['cities'];
}
