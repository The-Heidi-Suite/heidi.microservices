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
}
