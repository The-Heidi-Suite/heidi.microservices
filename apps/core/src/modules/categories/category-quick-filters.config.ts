/**
 * Quick filter configuration per city and root category.
 * Keys are in the format: `${citySlug}/${rootCategorySlug}`
 *
 * Example: 'kiel/shopping' means quick filters for Shopping category in Kiel city.
 */
export type QuickFilterConfigKey = `${string}/${string}`;

export interface QuickFilterConfig {
  key: string;
  label: string; // Default label in source language (will be translated via i18n)
  order: number;
  radiusMeters?: number;
  sortByDistance?: boolean;
}

/**
 * Quick filter configurations by city slug and root category slug.
 *
 * Structure: Record<citySlug, Record<rootCategorySlug, QuickFilterConfig[]>>
 *
 * For now, we'll use a simple structure keyed by city name/slug.
 * In production, this could be loaded from a database or external config.
 */
const QUICK_FILTER_CONFIGS: Record<string, Record<string, QuickFilterConfig[]>> = {
  // Kiel city quick filters
  kiel: {
    shopping: [
      {
        key: 'nearby',
        label: 'Nearby',
        order: 0,
        radiusMeters: 1500,
        sortByDistance: true,
      },
      {
        key: 'see-all',
        label: 'See all',
        order: 1,
      },
    ],
    events: [
      {
        key: 'nearby',
        label: 'Nearby',
        order: 0,
        radiusMeters: 1500,
        sortByDistance: true,
      },
      {
        key: 'see-all',
        label: 'See all',
        order: 1,
      },
    ],
    'food-and-drink': [
      {
        key: 'nearby',
        label: 'Nearby',
        order: 0,
        radiusMeters: 1500,
        sortByDistance: true,
      },
      {
        key: 'see-all',
        label: 'See all',
        order: 1,
      },
    ],
    tours: [
      {
        key: 'nearby',
        label: 'Nearby',
        order: 0,
        radiusMeters: 2000,
        sortByDistance: true,
      },
      {
        key: 'see-all',
        label: 'See all',
        order: 1,
      },
    ],
    culture: [
      {
        key: 'nearby',
        label: 'Nearby',
        order: 0,
        radiusMeters: 1500,
        sortByDistance: true,
      },
      {
        key: 'see-all',
        label: 'See all',
        order: 1,
      },
    ],
  },
};

/**
 * Get quick filter configurations for a city and root category.
 *
 * @param citySlug - City slug (e.g., 'kiel')
 * @param rootCategorySlug - Root category slug (e.g., 'shopping', 'events')
 * @returns Array of quick filter configurations, or empty array if none configured
 */
export function getQuickFiltersForCategory(
  citySlug: string,
  rootCategorySlug: string,
): QuickFilterConfig[] {
  const cityConfigs = QUICK_FILTER_CONFIGS[citySlug.toLowerCase()];
  if (!cityConfigs) {
    return [];
  }

  return cityConfigs[rootCategorySlug] || [];
}

/**
 * Get all quick filter configurations for a city.
 *
 * @param citySlug - City slug (e.g., 'kiel')
 * @returns Record mapping root category slugs to their quick filter configurations
 */
export function getQuickFiltersForCity(citySlug: string): Record<string, QuickFilterConfig[]> {
  return QUICK_FILTER_CONFIGS[citySlug.toLowerCase()] || {};
}
