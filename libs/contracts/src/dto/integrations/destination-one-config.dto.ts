/**
 * Category mapping configuration for Destination One integration
 */
export interface DestinationOneCategoryMapping {
  heidiCategorySlug: string; // Root category slug (e.g., "shopping", "food-and-drink", "tours")
  heidiSubcategorySlug?: string; // Optional subcategory slug (e.g., "poi-museums-galleries")
  doTypes?: string[]; // Destination One types this mapping applies to (e.g., ["POI", "Gastro"])
  doCategoryValues: string[]; // Destination One category values that map to this (e.g., ["Ausstellung", "Kinderprogramm"])
  // Query is generated dynamically from doCategoryValues: category:"value1" OR category:"value2"
  // Empty array means fetch all items of the specified types
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
  /**
   * When true (default), the integration will query Destination One facets for Event categories
   * and log them during sync. This can be used to drive dynamic Event subcategory creation.
   */
  eventFacetsEnabled?: boolean;
  /**
   * When true, the integration will query Destination One facets for Tour/POI categories
   * and log them during sync. This can be used to drive dynamic Tour subcategory creation.
   */
  tourFacetsEnabled?: boolean;
}
