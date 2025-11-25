import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaIntegrationService } from '@heidi/prisma';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';
import { firstValueFrom } from 'rxjs';
import { createHash } from 'crypto';
import { ListingRecurrenceFreq, CategoryType, ListingMediaType } from '@prisma/client-core';
import { DestinationOneConfig } from '@heidi/contracts';

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
    repeatUntil?: string;
  }>;
  company?: string;
  district?: string;
  cuisine_types?: string[];
  features?: string[];
  attributes?: Array<{ key: string; value: string }>;
}

interface DestinationOneResult {
  status: string;
  count: number;
  overallcount: number;
  channels?: any[];
  items: DestinationOneItem[];
  // Optional facet groups (present when facets=true is used on the API)
  facetGroups?: Array<{
    field: string;
    facets: Array<{
      value: string;
      count: number;
    }>;
  }>;
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
  tags?: string[]; // Destination One category values to store as tags
  timeIntervals?: Array<{
    weekdays: string[];
    start: string;
    end: string;
    tz: string;
    freq: ListingRecurrenceFreq;
    interval: number;
    repeatUntil?: string;
  }>;
  eventStart?: string;
  eventEnd?: string;
  mediaItems?: Array<{
    type: ListingMediaType;
    url: string;
    altText?: string;
    caption?: string;
    order: number;
    metadata?: Record<string, unknown>;
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

  async fetchData(
    config: DestinationOneConfig,
    query?: string,
    apiCalls?: string[],
  ): Promise<DestinationOneResponse> {
    const baseUrl = config.baseUrl || 'https://meta.et4.de/rest.ashx/search/';
    const template = config.template || 'ET2014A_MULTI.json';

    const params = new URLSearchParams({
      experience: config.experience,
      licensekey: config.licensekey,
      template,
    });

    if (config.typeFilter && config.typeFilter.length > 0) {
      params.append('type', config.typeFilter.join(','));
    }

    if (query) {
      params.append('q', query);
    }

    const url = `${baseUrl}?${params.toString()}`;
    const sanitizedUrl = url.replace(config.licensekey, '***');

    // Track the sanitized URL
    if (apiCalls) {
      apiCalls.push(sanitizedUrl);
    }

    this.logger.log(`Fetching data from destination_one API: ${sanitizedUrl}`);

    try {
      const response = await firstValueFrom(
        this.http.get<DestinationOneResponse>(url, {
          timeout: 30000,
        }),
      );
      const itemsCount = response.data.results[0]?.items.length || 0;
      this.logger.log(`Fetched ${itemsCount} items from destination_one API`);
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch from destination_one API: ${sanitizedUrl}`,
        error?.message,
      );
      throw error;
    }
  }

  /**
   * Fetches Destination One facets for Event categories.
   * Uses facets=true and extracts facetGroups where field === "category".
   */
  private async fetchEventCategoryFacets(
    config: DestinationOneConfig,
    apiCalls?: string[],
  ): Promise<string[]> {
    const baseUrl = config.baseUrl || 'https://meta.et4.de/rest.ashx/search/';
    const template = config.template || 'ET2014A_MULTI.json';

    const params = new URLSearchParams({
      experience: config.experience,
      licensekey: config.licensekey,
      template,
      type: 'Event',
      facets: 'true',
    });

    const url = `${baseUrl}?${params.toString()}`;
    const sanitizedUrl = url.replace(config.licensekey, '***');

    // Track the sanitized URL
    if (apiCalls) {
      apiCalls.push(sanitizedUrl);
    }

    this.logger.debug(`Fetching Event category facets from destination_one API: ${sanitizedUrl}`);

    try {
      const response = await firstValueFrom(
        this.http.get<DestinationOneResponse>(url, {
          timeout: 30000,
        }),
      );

      const result = response.data.results?.[0];
      const facetGroups = result?.facetGroups || [];
      const categoryGroup = facetGroups.find((g) => g.field === 'category');
      const facetValues =
        categoryGroup?.facets
          ?.map((f) => f.value)
          .filter((v): v is string => typeof v === 'string' && v.trim().length > 0) || [];

      const uniqueSorted = Array.from(new Set(facetValues)).sort((a, b) => a.localeCompare(b));

      this.logger.log(
        `Fetched ${uniqueSorted.length} Event category facets from destination_one API: ${JSON.stringify(uniqueSorted)}`,
      );

      return uniqueSorted;
    } catch (error: any) {
      this.logger.warn(
        `Failed to fetch Event category facets from destination_one API: ${sanitizedUrl}`,
        error?.message,
      );
      return [];
    }
  }

  /**
   * Fetches all items for a given type using pagination parameters.
   * If the API ignores pagination params, it will still return items and stop after the first page.
   */
  private async fetchDataPaginatedForType(
    config: DestinationOneConfig,
    type: string,
    query?: string,
    apiCalls?: string[],
  ): Promise<{ items: DestinationOneItem[] }> {
    const baseUrl = config.baseUrl || 'https://meta.et4.de/rest.ashx/search/';
    const template = config.template || 'ET2014A_MULTI.json';
    const pageSize = (config as any).pageSize || 100;

    let page = 1;
    const allItems: DestinationOneItem[] = [];

    // Loop with an upper bound to avoid infinite loops in case API ignores pagination
    for (; page <= 1000; page++) {
      const params = new URLSearchParams({
        experience: config.experience,
        licensekey: config.licensekey,
        template,
        type,
      });

      if (query) {
        params.append('q', query);
      }

      // Common pagination params (best-effort)
      params.append('page', `${page}`);
      params.append('pagesize', `${pageSize}`);

      const url = `${baseUrl}?${params.toString()}`;
      const sanitizedUrl = url.replace(config.licensekey, '***');

      // Track the sanitized URL
      if (apiCalls) {
        apiCalls.push(sanitizedUrl);
      }

      this.logger.debug(
        `Fetching page ${page} for type="${type}" from destination_one: ${sanitizedUrl}`,
      );

      const response = await firstValueFrom(
        this.http.get<DestinationOneResponse>(url, {
          timeout: 30000,
        }),
      );

      const pageItems = response.data?.results?.[0]?.items || [];
      allItems.push(...pageItems);

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

    return { items: allItems };
  }

  /**
   * Generates a query string from category values
   * Format: category:"value1" OR category:"value2"
   * If empty array, returns undefined (fetch all items of the type)
   */
  private generateQueryFromCategoryValues(categoryValues: string[]): string | undefined {
    if (!categoryValues || categoryValues.length === 0) {
      return undefined; // No query means fetch all
    }
    return categoryValues.map((val) => `category:"${val}"`).join(' OR ');
  }

  private generateSyncHash(title: string, summary: string | undefined, content: string): string {
    const hashData = {
      title,
      summary: summary || '',
      content,
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
    // Get content from texts
    // Prefer HTML "details" (rich content), then HTML "teaser", then plain-text fallbacks
    const detailsHtml =
      item.texts?.find((t) => t.rel === 'details' && t.type === 'text/html')?.value || undefined;
    const teaserHtml =
      item.texts?.find((t) => t.rel === 'teaser' && t.type === 'text/html')?.value || undefined;
    const detailsPlain =
      item.texts?.find((t) => t.rel === 'details' && t.type === 'text/plain')?.value || undefined;
    const teaserPlain =
      item.texts?.find((t) => t.rel === 'teaser' && t.type === 'text/plain')?.value || undefined;

    const content = detailsHtml || teaserHtml || detailsPlain || teaserPlain || item.title || '';

    // For summary we keep it short and prefer plain teaser text (no heavy HTML), fallback to HTML
    const teaserText = teaserPlain || teaserHtml || '';

    const slug = this.slugify(item.title || `item-${item.id}`);

    const addressParts = [item.street, item.zip, item.city].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(', ') : undefined;

    const heroImage = item.media_objects?.find((m) => m.rel === 'default')?.url;
    const galleryMedia = item.media_objects?.filter((m) => m.rel === 'imagegallery') || [];

    // Get root category for this item type (fallback)
    const rootCategory = TYPE_TO_ROOT_CATEGORY[item.type];
    const rootSlug = rootCategory?.slug;

    // Build category slugs using mappings
    const categorySlugsSet = new Set<string>();

    // Always include root category slug for the type (fallback)
    if (rootSlug) {
      categorySlugsSet.add(rootSlug);
    }

    // Process category mappings from config
    if (config.categoryMappings && config.categoryMappings.length > 0 && item.categories) {
      for (const mapping of config.categoryMappings) {
        // Check if this mapping applies to this item type
        if (mapping.doTypes && !mapping.doTypes.includes(item.type)) {
          continue;
        }

        // Check if any of the item's categories match this mapping
        const hasMatchingCategory = item.categories.some((cat) =>
          mapping.doCategoryValues.includes(cat),
        );

        if (hasMatchingCategory) {
          // Add root category slug
          categorySlugsSet.add(mapping.heidiCategorySlug);

          // Add subcategory slug if specified
          if (mapping.heidiSubcategorySlug) {
            categorySlugsSet.add(mapping.heidiSubcategorySlug);
          }
        }
      }
    }

    // Fallback: Process item.categories using automatic mapping strategy if no mappings matched
    if (
      item.categories &&
      item.categories.length > 0 &&
      categorySlugsSet.size === (rootSlug ? 1 : 0)
    ) {
      for (const doCategory of item.categories) {
        if (rootSlug) {
          const categorySlug = `${rootSlug}-${this.slugify(doCategory)}`;
          categorySlugsSet.add(categorySlug);
        }
      }
    }

    const categorySlugs = Array.from(categorySlugsSet);

    // Extract tags from item.categories (store all categories as tags)
    const tags: string[] = [];
    if (config.storeItemCategoriesAsTags !== false && item.categories) {
      // Deduplicate and normalize tags
      const tagSet = new Set<string>();
      for (const cat of item.categories) {
        if (cat && cat.trim()) {
          tagSet.add(cat.trim());
        }
      }
      tags.push(...Array.from(tagSet));
    }

    const timeIntervals = item.timeIntervals?.map((ti) => ({
      weekdays: this.convertWeekdays(ti.weekdays),
      start: ti.start,
      end: ti.end,
      tz: ti.tz,
      freq: this.mapRecurrenceFreq(ti.freq),
      interval: ti.interval || 1,
      repeatUntil: ti.repeatUntil ? new Date(ti.repeatUntil).toISOString() : undefined,
    }));

    // Build attribute map (for interval_start / interval_end etc.)
    const attributeMap = new Map<string, string>(
      (item.attributes || []).map((a) => [a.key, a.value]),
    );

    let eventStart: string | undefined;
    let eventEnd: string | undefined;

    const intervalStartAttr = attributeMap.get('interval_start');
    const intervalEndAttr = attributeMap.get('interval_end');

    if (intervalStartAttr && intervalEndAttr) {
      // Use explicit interval_start / interval_end when the API was called with mode=date&unrollintervals=true
      eventStart = new Date(intervalStartAttr).toISOString();
      eventEnd = new Date(intervalEndAttr).toISOString();
    } else if (item.timeIntervals && item.timeIntervals.length > 0) {
      // Fallback: derive a coarse listing-level window from timeIntervals
      const starts = item.timeIntervals.map((ti) => new Date(ti.start).getTime());
      const ends = item.timeIntervals.map((ti) => new Date(ti.end).getTime());
      eventStart = new Date(Math.min(...starts)).toISOString();
      eventEnd = new Date(Math.max(...ends)).toISOString();
    }

    const mediaItems =
      galleryMedia.length > 0
        ? galleryMedia.map((media, index) => ({
            type: ListingMediaType.IMAGE,
            url: media.url,
            altText: media.value,
            caption: media.value,
            order: index,
            metadata: {
              rel: media.rel,
              type: media.type,
              source: media.source,
              license: media.license,
            },
          }))
        : undefined;

    const transformed: TransformedListingData = {
      title: item.title,
      summary: teaserText || undefined,
      content: content || item.title,
      slug,
      externalSource: 'destination_one',
      externalId: item.id,
      syncHash: this.generateSyncHash(item.title, teaserText || undefined, content || item.title),
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
      tags: tags.length > 0 ? tags : undefined,
      timeIntervals,
      eventStart,
      eventEnd,
      mediaItems,
    };

    return transformed;
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
    const syncStats = {
      itemsByType: {} as Record<string, number>,
      itemsByMapping: {} as Record<string, number>,
      tagOperations: { created: 0, updated: 0 },
      errorsByCategory: {} as Record<string, number>,
      eventCategoryFacets: [] as string[],
      apiCalls: [] as string[], // Track all API call URLs (sanitized)
    };

    // Fetch items using category mapping queries only
    let items: DestinationOneItem[] = [];

    try {
      const processedIds = new Set<string>();

      // Optionally prefetch Event category facets for logging / downstream usage
      if (config.eventFacetsEnabled !== false && config.typeFilter?.includes('Event')) {
        syncStats.eventCategoryFacets = await this.fetchEventCategoryFacets(
          config,
          syncStats.apiCalls,
        );
      }

      // Fetch items using category mapping queries only
      if (config.categoryMappings && config.categoryMappings.length > 0) {
        for (const mapping of config.categoryMappings) {
          if (!mapping.doTypes || mapping.doTypes.length === 0) {
            continue;
          }

          // Generate query from category values
          const query = this.generateQueryFromCategoryValues(mapping.doCategoryValues);

          // Fetch items for each type in the mapping using the generated query
          for (const type of mapping.doTypes) {
            // Only fetch if type is in typeFilter (if typeFilter is specified)
            if (config.typeFilter && !config.typeFilter.includes(type)) {
              continue;
            }

            try {
              const result = await this.fetchDataPaginatedForType(
                config,
                type,
                query,
                syncStats.apiCalls,
              );
              const mappingItems = result.items.filter((it) => !processedIds.has(it.id));
              items.push(...mappingItems);
              mappingItems.forEach((it) => processedIds.add(it.id));
              const mappingKey = `${mapping.heidiCategorySlug}${mapping.heidiSubcategorySlug ? `/${mapping.heidiSubcategorySlug}` : ''}`;
              syncStats.itemsByMapping[mappingKey] =
                (syncStats.itemsByMapping[mappingKey] || 0) + mappingItems.length;
              this.logger.log(
                `Fetched ${mappingItems.length} items for mapping "${mappingKey}" using query "${query || 'all'}"`,
              );
            } catch (error: any) {
              const errorCategory = 'mapping_fetch';
              syncStats.errorsByCategory[errorCategory] =
                (syncStats.errorsByCategory[errorCategory] || 0) + 1;
              this.logger.warn(
                `Failed to fetch items for mapping "${mapping.heidiCategorySlug}" with query "${query || 'all'}": ${error?.message}`,
              );
            }
          }
        }
      } else if (config.typeFilter && config.typeFilter.length > 0) {
        // Fallback: if no category mappings, fetch by type
        for (const t of config.typeFilter) {
          const result = await this.fetchDataPaginatedForType(
            config,
            t,
            undefined,
            syncStats.apiCalls,
          );
          const typeItems = result.items.filter((it) => !processedIds.has(it.id));
          items.push(...typeItems);
          typeItems.forEach((it) => processedIds.add(it.id));
          syncStats.itemsByType[t] = (syncStats.itemsByType[t] || 0) + typeItems.length;
          this.logger.log(`Fetched ${typeItems.length} items for type "${t}"`);
        }
      } else {
        // No mappings and no typeFilter - single fetch
        const response = await this.fetchData(config, undefined, syncStats.apiCalls);
        items = response.results[0]?.items || [];
        this.logger.log(`Fetched ${items.length} items from single API call`);
      }

      this.logger.log(`Processing ${items.length} total items from destination_one API`);

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

            // Track tag operations (tags are created/updated in Core service)
            if (listingData.tags && listingData.tags.length > 0) {
              if (result.action === 'created') {
                syncStats.tagOperations.created += listingData.tags.length;
              } else if (result.action === 'updated') {
                syncStats.tagOperations.updated += listingData.tags.length;
              }
            }
          }
        } catch (error: any) {
          const errorCategory = 'listing_processing';
          syncStats.errorsByCategory[errorCategory] =
            (syncStats.errorsByCategory[errorCategory] || 0) + 1;
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
          payload: {
            itemsProcessed: items.length,
            itemsByType: syncStats.itemsByType,
            itemsByMapping: syncStats.itemsByMapping,
            tagOperations: syncStats.tagOperations,
            eventCategoryFacets: syncStats.eventCategoryFacets,
            apiCalls: syncStats.apiCalls,
            apiCallCount: syncStats.apiCalls.length,
          },
          response: {
            created,
            updated,
            skipped,
            errors: errorCount,
            errorsByCategory: syncStats.errorsByCategory,
          },
          status: 'SUCCESS',
        },
      });

      this.logger.log(
        `Sync completed: ${created} created, ${updated} updated, ${skipped} skipped, ${errorCount} errors`,
      );
      this.logger.log(`Items by type: ${JSON.stringify(syncStats.itemsByType)}`);
      if (Object.keys(syncStats.itemsByMapping).length > 0) {
        this.logger.log(`Items by mapping: ${JSON.stringify(syncStats.itemsByMapping)}`);
      }
      this.logger.log(
        `Tag operations: ${syncStats.tagOperations.created} created, ${syncStats.tagOperations.updated} updated`,
      );
      if (Object.keys(syncStats.errorsByCategory).length > 0) {
        this.logger.warn(`Errors by category: ${JSON.stringify(syncStats.errorsByCategory)}`);
      }

      return { created, updated, skipped };
    } catch (error: any) {
      this.logger.error(`Sync failed for integration ${integrationId}`, error);

      await this.prisma.integrationLog.create({
        data: {
          integrationId,
          event: 'sync_failed',
          payload: {
            error: error?.message,
            itemsProcessed: items.length,
            itemsByType: syncStats.itemsByType,
            itemsByMapping: syncStats.itemsByMapping,
            errorsByCategory: syncStats.errorsByCategory,
            apiCalls: syncStats.apiCalls,
            apiCallCount: syncStats.apiCalls.length,
          },
          response: {
            created,
            updated,
            skipped,
            errors: errorCount,
          },
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
