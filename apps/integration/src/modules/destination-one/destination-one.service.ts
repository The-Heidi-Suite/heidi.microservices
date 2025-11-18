import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaIntegrationService } from '@heidi/prisma';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';
import { firstValueFrom } from 'rxjs';
import { createHash } from 'crypto';
import { ListingRecurrenceFreq, CategoryType } from '@prisma/client-core';
import { DestinationOneConfig } from '@heidi/contracts';

interface DestinationOneFacet {
  value: string;
  count: number;
  q: string;
  label: string;
}

interface DestinationOneFacetGroup {
  field: string;
  facets: DestinationOneFacet[];
}

interface DestinationOneItem {
  global_id: string;
  id: string;
  title: string;
  type: string;
  categories: string[];
  texts?: Array<{ rel: string; type?: string; value: string }>;
  country?: string;
  city?: string;
  zip?: string;
  street?: string;
  phone?: string;
  web?: string;
  email?: string;
  geo?: { main?: { latitude: number; longitude: number } };
  media_objects?: Array<{
    rel?: string;
    url: string;
    type?: string;
    value?: string;
    source?: string;
    license?: string;
  }>;
  timeIntervals?: Array<{
    weekdays: string[];
    start: string;
    end: string;
    tz: string;
    freq: string;
    interval: number;
  }>;
  company?: string;
  district?: string;
  cuisine_types?: string[];
  features?: string[];
}

interface DestinationOneResult {
  status: string;
  count: number;
  overallcount: number;
  channels?: any[];
  facetGroups?: DestinationOneFacetGroup[];
  items: DestinationOneItem[];
}

interface DestinationOneResponse {
  count: number;
  overallcount: number;
  results: DestinationOneResult[];
}

interface TransformedListingData {
  title: string;
  summary?: string;
  content: string;
  slug: string;
  externalSource: string;
  externalId: string;
  syncHash: string;
  sourceType: 'API_IMPORT';
  primaryCityId: string;
  venueName?: string;
  address?: string;
  geoLat?: number;
  geoLng?: number;
  timezone?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  heroImageUrl?: string;
  categorySlugs: string[];
  timeIntervals?: Array<{
    weekdays: string[];
    start: string;
    end: string;
    tz: string;
    freq: ListingRecurrenceFreq;
    interval: number;
  }>;
}

/**
 * Maps Destination One item types to root category slugs and CategoryType
 */
const TYPE_TO_ROOT_CATEGORY: Record<string, { slug: string; categoryType: CategoryType }> = {
  Gastro: { slug: 'food-and-drink', categoryType: CategoryType.GASTRO },
  Event: { slug: 'events', categoryType: CategoryType.EVENT },
  Tour: { slug: 'tours', categoryType: CategoryType.TOUR },
  POI: { slug: 'points-of-interest', categoryType: CategoryType.POI },
  Hotel: { slug: 'hotels-and-stays', categoryType: CategoryType.HOTEL },
  Article: { slug: 'articles-and-stories', categoryType: CategoryType.ARTICLE },
};

@Injectable()
export class DestinationOneService {
  private readonly logger: LoggerService;

  constructor(
    private readonly prisma: PrismaIntegrationService,
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly http: HttpService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(DestinationOneService.name);
  }

  async fetchData(config: DestinationOneConfig): Promise<DestinationOneResponse> {
    const baseUrl = config.baseUrl || 'https://meta.et4.de/rest.ashx/search/';
    const template = config.template || 'ET2014A_MULTI.json';

    const params = new URLSearchParams({
      experience: config.experience,
      licensekey: config.licensekey,
      template,
      facets: 'true',
    });

    if (config.typeFilter && config.typeFilter.length > 0) {
      params.append('type', config.typeFilter.join(','));
    }

    const url = `${baseUrl}?${params.toString()}`;
    this.logger.log(
      `Fetching data from destination_one API: ${url.replace(config.licensekey, '***')}`,
    );

    try {
      const response = await firstValueFrom(
        this.http.get<DestinationOneResponse>(url, {
          timeout: 30000,
        }),
      );
      const itemsCount = response.data.results[0]?.items.length || 0;
      const facetGroupsCount = response.data.results[0]?.facetGroups?.length || 0;
      this.logger.log(
        `Fetched ${itemsCount} items and ${facetGroupsCount} facet groups from destination_one API`,
      );
      if (facetGroupsCount > 0) {
        const facetFields = response.data.results[0]?.facetGroups?.map((fg) => fg.field) || [];
        this.logger.debug(`Facet fields found: ${facetFields.join(', ')}`);
      }
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch from destination_one API: ${url.replace(config.licensekey, '***')}`,
        error?.message,
      );
      throw error;
    }
  }

  /**
   * Fetches all items for a given type using pagination parameters.
   * If the API ignores pagination params, it will still return items and stop after the first page.
   * Returns both items and facetGroups from the last page (facets are typically the same across pages).
   */
  private async fetchDataPaginatedForType(
    config: DestinationOneConfig,
    type: string,
  ): Promise<{ items: DestinationOneItem[]; facetGroups?: DestinationOneFacetGroup[] }> {
    const baseUrl = config.baseUrl || 'https://meta.et4.de/rest.ashx/search/';
    const template = config.template || 'ET2014A_MULTI.json';
    const pageSize = (config as any).pageSize || 100;

    let page = 1;
    const allItems: DestinationOneItem[] = [];
    let lastFacetGroups: DestinationOneFacetGroup[] | undefined;

    // Loop with an upper bound to avoid infinite loops in case API ignores pagination
    for (; page <= 1000; page++) {
      const params = new URLSearchParams({
        experience: config.experience,
        licensekey: config.licensekey,
        template,
        type,
        facets: 'true',
      });
      // Common pagination params (best-effort)
      params.append('page', `${page}`);
      params.append('pagesize', `${pageSize}`);

      const url = `${baseUrl}?${params.toString()}`;
      this.logger.debug(
        `Fetching page ${page} for type="${type}" from destination_one: ${url.replace(config.licensekey, '***')}`,
      );

      const response = await firstValueFrom(
        this.http.get<DestinationOneResponse>(url, {
          timeout: 30000,
        }),
      );

      const pageItems = response.data?.results?.[0]?.items || [];
      allItems.push(...pageItems);

      // Store facetGroups from this page (they should be consistent across pages)
      if (response.data?.results?.[0]?.facetGroups) {
        lastFacetGroups = response.data.results[0].facetGroups;
      }

      const count = response.data?.results?.[0]?.count ?? pageItems.length;
      const overallcount = response.data?.results?.[0]?.overallcount ?? allItems.length;

      // Break conditions:
      // - No items returned
      // - Retrieved items count reached or exceeded overall count (when provided)
      // - Returned count less than requested pageSize (likely last page)
      if (pageItems.length === 0) break;
      if (overallcount && allItems.length >= overallcount) break;
      if (count < pageSize) break;
    }

    return { items: allItems, facetGroups: lastFacetGroups };
  }

  private generateSyncHash(item: DestinationOneItem): string {
    const hashData = {
      id: item.id,
      global_id: item.global_id,
      title: item.title,
      updated: new Date().toISOString(),
    };
    return createHash('sha256').update(JSON.stringify(hashData)).digest('hex');
  }

  private convertWeekdays(weekdays: string[]): string[] {
    const validWeekdays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    return weekdays.filter((day) => validWeekdays.includes(day));
  }

  private mapRecurrenceFreq(freq: string): ListingRecurrenceFreq {
    const freqMap: Record<string, ListingRecurrenceFreq> = {
      Daily: ListingRecurrenceFreq.DAILY,
      Weekly: ListingRecurrenceFreq.WEEKLY,
      Monthly: ListingRecurrenceFreq.MONTHLY,
      Yearly: ListingRecurrenceFreq.YEARLY,
    };
    return freqMap[freq] || ListingRecurrenceFreq.NONE;
  }

  transformToListing(
    item: DestinationOneItem,
    config: DestinationOneConfig,
  ): TransformedListingData {
    // Get content from texts (prefer HTML details, fallback to plain text, then teaser)
    const detailsHtml = item.texts?.find(
      (t) => t.rel === 'details' && t.type === 'text/html',
    )?.value;
    const detailsPlain = item.texts?.find(
      (t) => t.rel === 'details' && t.type === 'text/plain',
    )?.value;
    const teaserText = item.texts?.find((t) => t.rel === 'teaser')?.value || '';
    const content = detailsHtml || detailsPlain || teaserText || item.title || '';

    const slug = this.slugify(item.title || `item-${item.id}`);

    const addressParts = [item.street, item.zip, item.city].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(', ') : undefined;

    const heroImage = item.media_objects?.find((m) => m.rel === 'default')?.url;

    // Get root category for this item type
    const rootCategory = TYPE_TO_ROOT_CATEGORY[item.type];
    const rootSlug = rootCategory?.slug;

    // Build category slugs
    const categorySlugsSet = new Set<string>();

    // Always include root category slug for the type
    if (rootSlug) {
      categorySlugsSet.add(rootSlug);
    }

    // Process item.categories with manual mappings and automatic fallback
    if (item.categories && item.categories.length > 0) {
      for (const doCategory of item.categories) {
        let categorySlug: string | undefined;

        // Check manual mapping first
        if (config.categoryMappings && config.categoryMappings[doCategory]) {
          categorySlug = config.categoryMappings[doCategory];
        } else if (rootSlug) {
          // Automatic strategy: rootSlug + slugified category value
          categorySlug = `${rootSlug}-${this.slugify(doCategory)}`;
        }

        if (categorySlug) {
          categorySlugsSet.add(categorySlug);
        }
      }
    }

    const categorySlugs = Array.from(categorySlugsSet);

    const timeIntervals = item.timeIntervals?.map((ti) => ({
      weekdays: this.convertWeekdays(ti.weekdays),
      start: ti.start,
      end: ti.end,
      tz: ti.tz,
      freq: this.mapRecurrenceFreq(ti.freq),
      interval: ti.interval || 1,
    }));

    return {
      title: item.title,
      summary: teaserText || undefined,
      content: content || item.title,
      slug,
      externalSource: 'destination_one',
      externalId: item.id,
      syncHash: this.generateSyncHash(item),
      sourceType: 'API_IMPORT',
      primaryCityId: config.cityId,
      venueName: item.company || item.title,
      address,
      geoLat: item.geo?.main?.latitude,
      geoLng: item.geo?.main?.longitude,
      timezone: item.timeIntervals?.[0]?.tz,
      contactPhone: item.phone,
      contactEmail: item.email,
      website: item.web,
      heroImageUrl: heroImage,
      categorySlugs,
      timeIntervals,
    };
  }

  async syncIntegration(
    integrationId: string,
  ): Promise<{ created: number; updated: number; skipped: number }> {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    if (integration.provider !== 'DESTINATION_ONE') {
      throw new Error(`Integration ${integrationId} is not a DESTINATION_ONE integration`);
    }

    if (!integration.isActive) {
      this.logger.log(`Integration ${integrationId} is not active`);
      return { created: 0, updated: 0, skipped: 0 };
    }

    const config = integration.config as unknown as DestinationOneConfig;
    if (!config) {
      throw new Error(`Integration ${integrationId} has no configuration`);
    }

    if (config.enabled === false) {
      this.logger.log(`Integration ${integrationId} is disabled`);
      return { created: 0, updated: 0, skipped: 0 };
    }

    if (!config.experience || !config.licensekey || !config.cityId) {
      throw new Error(
        `Integration ${integrationId} has invalid configuration: missing required fields`,
      );
    }

    this.logger.log(`Starting sync for integration ${integrationId}`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let errorCount = 0;

    try {
      // Fetch items per type (best coverage) with pagination; fall back to single fetch if no typeFilter
      let items: DestinationOneItem[] = [];
      const processedIds = new Set<string>();
      const categoryFacets: Array<{
        type: string;
        field: string;
        value: string;
        label: string;
      }> = [];

      if (config.typeFilter && config.typeFilter.length > 0) {
        for (const t of config.typeFilter) {
          const result = await this.fetchDataPaginatedForType(config, t);
          for (const it of result.items) {
            if (!processedIds.has(it.id)) {
              items.push(it);
              processedIds.add(it.id);
            }
          }

          // Collect facet categories for this type
          if (result.facetGroups) {
            for (const facetGroup of result.facetGroups) {
              // Focus on 'category' field for now, but can extend to others later
              if (facetGroup.field === 'category') {
                for (const facet of facetGroup.facets) {
                  categoryFacets.push({
                    type: t,
                    field: facetGroup.field,
                    value: facet.value,
                    label: facet.label,
                  });
                }
              }
            }
          }
        }
      } else {
        const response = await this.fetchData(config);
        items = response.results[0]?.items || [];

        // Collect facet categories from single fetch
        if (response.results[0]?.facetGroups) {
          for (const facetGroup of response.results[0].facetGroups) {
            if (facetGroup.field === 'category') {
              // For single fetch without type filter, we need to infer type from items
              // Group facets by the most common type in items that match this facet
              // For simplicity, we'll collect all and let Core handle deduplication
              for (const facet of facetGroup.facets) {
                // Try to find a matching item to infer type
                const matchingItem = items.find((item) => item.categories?.includes(facet.value));
                const inferredType = matchingItem?.type || 'Unknown';
                categoryFacets.push({
                  type: inferredType,
                  field: facetGroup.field,
                  value: facet.value,
                  label: facet.label,
                });
              }
            }
          }
        }
      }

      // Send category sync message to Core before processing listings
      if (categoryFacets.length > 0) {
        try {
          this.logger.log(`Sending ${categoryFacets.length} category facets to Core for sync`);
          await firstValueFrom(
            this.client.send(RabbitMQPatterns.INTEGRATION_SYNC_CATEGORIES, {
              integrationId,
              cityId: config.cityId,
              provider: 'DESTINATION_ONE',
              categoryMappings: config.categoryMappings || {},
              categoryFacets,
              timestamp: new Date().toISOString(),
            }),
          );
          this.logger.log('Category facets sync message sent successfully');
        } catch (error: any) {
          this.logger.error(
            `Failed to send category facets sync message: ${error?.message}`,
            error,
          );
          // Don't fail the entire sync if category sync fails
        }
      }

      this.logger.log(`Processing ${items.length} items from destination_one API`);

      for (const item of items) {
        try {
          const listingData = this.transformToListing(item, config);

          const result = await firstValueFrom(
            this.client.send<{ action: string; listingId: string }>(
              RabbitMQPatterns.INTEGRATION_SYNC_LISTING,
              {
                integrationId,
                listingData,
                timestamp: new Date().toISOString(),
              },
            ),
          );

          if (result) {
            if (result.action === 'created') {
              created++;
            } else if (result.action === 'updated') {
              updated++;
            } else if (result.action === 'skipped') {
              skipped++;
            }
          }
        } catch (error: any) {
          this.logger.error(`Failed to process item ${item.id}: ${error?.message}`, error);
          errorCount++;
        }
      }

      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date() },
      });

      await this.prisma.integrationLog.create({
        data: {
          integrationId,
          event: 'sync_completed',
          payload: { itemsProcessed: items.length },
          response: { created, updated, skipped, errors: errorCount },
          status: 'SUCCESS',
        },
      });

      this.logger.log(
        `Sync completed: ${created} created, ${updated} updated, ${skipped} skipped, ${errorCount} errors`,
      );

      return { created, updated, skipped };
    } catch (error: any) {
      this.logger.error(`Sync failed for integration ${integrationId}`, error);

      await this.prisma.integrationLog.create({
        data: {
          integrationId,
          event: 'sync_failed',
          payload: { error: error?.message },
          status: 'FAILED',
          errorMessage: error?.message || 'Unknown error',
        },
      });

      throw error;
    }
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
