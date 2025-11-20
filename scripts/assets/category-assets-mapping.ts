/**
 * Category Assets Mapping
 *
 * Maps category slugs to their corresponding asset files, display names, colors, and display order.
 * This file is used by seed scripts to populate category styling fields.
 */

// Base URL for assets (adjust based on your CDN/storage setup)
// For now, using relative paths that can be resolved to full URLs by the frontend
export const ASSETS_BASE_URL = process.env.ASSETS_BASE_URL || '/assets';

export interface CategoryAssetMapping {
  slug: string;
  /**
   * File name inside scripts/assets/categories after processing.
   */
  imageFileName: string;
  displayName?: string; // Kiel-specific display name
  subtitle?: string;
  description?: string;
  headerBackgroundColor?: string;
  contentBackgroundColor?: string;
  displayOrder?: number; // For city categories
}

/**
 * Mapping of category slugs to their asset files and styling
 * Based on Musterbilder folder structure
 */
export const CATEGORY_ASSETS: Record<string, CategoryAssetMapping> = {
  // News
  news: {
    slug: 'news',
    imageFileName: 'news.webp',
    displayName: 'News',
    subtitle: 'Latest updates',
    description: 'Latest news and official announcements for your city.',
    headerBackgroundColor: '#1E3A8A', // Blue
    contentBackgroundColor: '#EFF6FF',
    displayOrder: 1,
  },

  // Events
  events: {
    slug: 'events',
    imageFileName: 'events.webp',
    displayName: 'Events',
    subtitle: "What's on",
    description: 'Events, festivals and activities happening in your city.',
    headerBackgroundColor: '#7C3AED', // Purple
    contentBackgroundColor: '#F3E8FF',
    displayOrder: 2,
  },

  // Food & Drink
  'food-and-drink': {
    slug: 'food-and-drink',
    imageFileName: 'food-and-drink.webp',
    displayName: 'Food & Drink',
    subtitle: 'Eat & drink',
    description: 'Restaurants, cafés, bars and culinary experiences across the city.',
    headerBackgroundColor: '#DC2626', // Red
    contentBackgroundColor: '#FEE2E2',
    displayOrder: 3,
  },

  // Tours
  tours: {
    slug: 'tours',
    imageFileName: 'tours.webp',
    displayName: 'Tours',
    subtitle: 'Discover the city',
    description: 'Guided tours, walking routes and experiences to explore the city.',
    headerBackgroundColor: '#059669', // Green
    contentBackgroundColor: '#D1FAE5',
    displayOrder: 4,
  },

  // Shopping (fed from POI)
  shopping: {
    slug: 'shopping',
    imageFileName: 'shopping.webp',
    displayName: 'Shopping',
    subtitle: 'Where to shop',
    description: 'Shops, boutiques and malls in your city.',
    headerBackgroundColor: '#EA580C', // Orange
    contentBackgroundColor: '#FFEDD5',
    displayOrder: 5,
  },

  // Culture
  culture: {
    slug: 'culture',
    imageFileName: 'culture.webp',
    displayName: 'Culture',
    subtitle: 'Arts & culture',
    description: 'Museums, galleries, theaters and cultural venues.',
    headerBackgroundColor: '#BE185D', // Pink
    contentBackgroundColor: '#FCE7F3',
    displayOrder: 6,
  },

  // Points of Interest
  'points-of-interest': {
    slug: 'points-of-interest',
    imageFileName: 'points-of-interest.webp',
    displayName: 'Points of Interest',
    subtitle: 'Explore the city',
    description: 'Landmarks, museums, parks and other sights worth visiting.',
    headerBackgroundColor: '#0891B2', // Cyan
    contentBackgroundColor: '#CFFAFE',
    displayOrder: 7,
  },

  // Hotels & Stays
  'hotels-and-stays': {
    slug: 'hotels-and-stays',
    imageFileName: 'hotels-and-stays.webp',
    displayName: 'Hotels & Stays',
    subtitle: 'Stay overnight',
    description: 'Hotels, guesthouses and other accommodation options.',
    headerBackgroundColor: '#92400E', // Brown/Amber
    contentBackgroundColor: '#FEF3C7',
    displayOrder: 8,
  },

  // Articles & Stories
  'articles-and-stories': {
    slug: 'articles-and-stories',
    imageFileName: 'articles-and-stories.webp',
    displayName: 'Articles & Stories',
    subtitle: 'Stories from the city',
    description: 'Guides, stories and inspiration for exploring the city.',
    headerBackgroundColor: '#4B5563', // Gray
    contentBackgroundColor: '#F3F4F6',
    displayOrder: 9,
  },

  // Restaurants
  restaurants: {
    slug: 'restaurants',
    imageFileName: 'restaurants.webp',
    displayName: 'Restaurants',
    subtitle: 'Great places to eat',
    description: 'Restaurant listings and gastronomy highlights.',
    headerBackgroundColor: '#DC2626',
    contentBackgroundColor: '#FEE2E2',
    displayOrder: 10,
  },

  // Other
  other: {
    slug: 'other',
    imageFileName: 'other.webp',
    displayName: 'Other',
    subtitle: 'More content',
    description: 'Additional content and information.',
    headerBackgroundColor: '#6B7280',
    contentBackgroundColor: '#F9FAFB',
    displayOrder: 11,
  },
};

/**
 * City header image mapping
 * Primary image for Kiel city header
 */
export const CITY_HEADER_IMAGE = {
  kiel: {
    primary: 'city-header-kiel-1.webp',
    alternatives: ['city-header-kiel-2.webp', 'city-header-kiel-3.webp'],
  },
};

/**
 * Get asset URL for a category image (local file path)
 * Note: After upload to storage, this will return storage URLs instead
 */
export function getCategoryImageUrl(fileName: string): string {
  // If fileName is already a full URL (from storage), return as-is
  if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
    return fileName;
  }
  // Otherwise, assume it's in the new categories/ folder structure
  return `${ASSETS_BASE_URL}/categories/${fileName}`;
}

/**
 * Get city header image URL (local file path)
 * Note: After upload to storage, this will return storage URLs instead
 */
export function getCityHeaderImageUrl(cityName: string): string | null {
  const cityMapping = CITY_HEADER_IMAGE[cityName.toLowerCase() as keyof typeof CITY_HEADER_IMAGE];
  if (!cityMapping) return null;
  // If primary is already a full URL (from storage), return as-is
  if (cityMapping.primary.startsWith('http://') || cityMapping.primary.startsWith('https://')) {
    return cityMapping.primary;
  }
  // Otherwise, assume it's in the new city-headers/ folder structure
  return `${ASSETS_BASE_URL}/city-headers/${cityMapping.primary}`;
}
