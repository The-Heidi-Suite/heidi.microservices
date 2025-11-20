/**
 * Category mapping configuration for Destination One integration
 */
export interface DestinationOneCategoryMapping {
  heidiCategorySlug: string; // Root category slug (e.g., "shopping", "food-and-drink", "tours")
  heidiSubcategorySlug?: string; // Optional subcategory slug (e.g., "poi-museums-galleries")
  doTypes?: string[]; // Destination One types this mapping applies to (e.g., ["POI", "Gastro"])
  doCategoryValues: string[]; // Destination One category values that map to this (e.g., ["Ausstellung", "Kinderprogramm"])
  query: string; // Query parameter for API (e.g., "category:Ausstellung OR Kinderprogramm")
}

/**
 * Configuration interface for Destination One API integration (shared)
 */
export interface DestinationOneConfig {
  experience: string;
  licensekey: string;
  template?: string;
  baseUrl?: string;
  cityId: string;
  typeFilter?: string[]; // e.g., ["Gastro"]
  enabled?: boolean;
  categoryMappings?: DestinationOneCategoryMapping[]; // Category mappings for subcategory assignment
  storeItemCategoriesAsTags?: boolean; // Whether to store item.categories as tags (default: true)
}
