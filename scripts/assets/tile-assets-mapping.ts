/**
 * Tile Assets Mapping
 *
 * Maps tile slugs to their corresponding asset files (background and icon).
 * This file is used by upload-tile-assets.ts to upload images to object storage.
 * Tile IDs are looked up dynamically from the database using the slug.
 */

export interface TileAssetMapping {
  slug: string;
  /**
   * File name inside scripts/assets/tiles for the background image.
   */
  backgroundFileName: string;
  /**
   * File name inside scripts/assets/tiles for the icon image.
   */
  iconFileName: string;
}

/**
 * Mapping of tile slugs to their asset files
 */
export const TILE_ASSETS: Record<string, TileAssetMapping> = {
  'zum-verschenken': {
    slug: 'zum-verschenken',
    backgroundFileName: 'voucher_background.webp',
    iconFileName: 'voucher_icon.webp',
  },
  'bereit-f-r-den-sommer': {
    slug: 'bereit-f-r-den-sommer',
    backgroundFileName: 'swimming_background.webp',
    iconFileName: 'swimming_icon.webp',
  },
};
