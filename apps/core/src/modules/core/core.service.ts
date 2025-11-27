import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { RedisService } from '@heidi/redis';
import { LoggerService } from '@heidi/logger';
import { PrismaCoreService } from '@heidi/prisma';
import { TranslationService, TranslationSource } from '@heidi/translations';
import { ConfigService } from '@heidi/config';
import { I18nService } from '@heidi/i18n';
import {
  UserRole,
  ListingStatus,
  ListingModerationStatus,
  ListingSourceType,
  ListingVisibility,
  ListingRecurrenceFreq,
  ListingMediaType,
  Prisma,
  CategoryType,
  ListingReminderType,
} from '@prisma/client-core';
import {
  CoreOperationRequestDto,
  CoreOperationResponseDto,
  SendNotificationDto,
} from '@heidi/contracts';
import { roleToNumber } from '@heidi/rbac';
import { firstValueFrom } from 'rxjs';
import { createHash } from 'crypto';

@Injectable()
export class CoreService implements OnModuleInit {
  private readonly defaultSourceLocale: string;
  private readonly supportedLocales: string[];
  private readonly translatableFields = ['title', 'summary', 'description'];

  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly redis: RedisService,
    private readonly prisma: PrismaCoreService,
    private readonly translationService: TranslationService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly i18nService: I18nService,
  ) {
    this.logger.setContext(CoreService.name);
    this.defaultSourceLocale = this.configService.get<string>(
      'translations.defaultSourceLocale',
      'en',
    );
    this.supportedLocales = this.configService.get<string[]>('i18n.supportedLanguages') || [
      'de',
      'en',
      'dk',
      'no',
      'se',
      'ar',
      'fa',
      'tr',
      'ru',
      'uk',
    ];
  }

  async onModuleInit() {
    this.logger.log('Core service initialized - listening to events');
  }

  async getStatus() {
    const cachedStatus = await this.redis.get('core:status');
    if (cachedStatus) {
      return cachedStatus;
    }

    const status = {
      service: 'core',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
    };

    await this.redis.set('core:status', status, 30);
    return status;
  }

  async executeOperation(dto: CoreOperationRequestDto): Promise<CoreOperationResponseDto> {
    this.logger.log(`Queueing operation: ${dto.operation}`);

    this.client.emit(RabbitMQPatterns.CORE_OPERATION, {
      operation: dto.operation,
      payload: dto.payload ?? {},
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Operation queued for execution',
      operationId: Date.now().toString(),
    };
  }

  async getUserAssignments(userId: string, role?: string) {
    this.logger.log(`Getting user assignments for userId: ${userId}, role: ${role || 'all'}`);

    const assignments = await this.prisma.userCityAssignment.findMany({
      where: {
        userId,
        isActive: true,
        ...(role && { role: role as UserRole }),
      },
      select: {
        id: true,
        cityId: true,
        role: true,
        canManageAdmins: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return assignments.map((assignment) => ({
      cityId: assignment.cityId,
      role: assignment.role,
      canManageAdmins: assignment.canManageAdmins,
      createdAt: assignment.createdAt,
    }));
  }

  async getUserCities(userId: string) {
    this.logger.log(`Getting cities for userId: ${userId}`);

    const assignments = await this.prisma.userCityAssignment.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        cityId: true,
      },
    });

    return assignments.map((assignment) => assignment.cityId);
  }

  async createUserCityAssignment(userId: string, cityId: string, role: string) {
    this.logger.log(
      `Creating user city assignment: userId=${userId}, cityId=${cityId}, role=${role}`,
    );

    try {
      const assignment = await this.prisma.userCityAssignment.create({
        data: {
          userId,
          cityId,
          role: role as UserRole,
          canManageAdmins: role === UserRole.CITY_ADMIN,
        },
        select: {
          id: true,
          userId: true,
          cityId: true,
          role: true,
          canManageAdmins: true,
          createdAt: true,
        },
      });

      return {
        success: true,
        assignment,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('User already assigned to this city');
      }
      throw error;
    }
  }

  async assignCityAdmin(
    userId: string,
    cityId: string,
    role: string | number,
    assignedBy: string,
    canManageAdmins?: boolean,
  ) {
    this.logger.log(
      `Assigning city admin: userId=${userId}, cityId=${cityId}, role=${role}, assignedBy=${assignedBy}, canManageAdmins=${canManageAdmins}`,
    );

    // Normalize role - handle both string and number formats
    let normalizedRole: UserRole;
    if (typeof role === 'number') {
      // Convert number to enum (1=SUPER_ADMIN, 2=CITY_ADMIN, 3=CITIZEN)
      const roleMap: Record<number, UserRole> = {
        1: UserRole.SUPER_ADMIN,
        2: UserRole.CITY_ADMIN,
        3: UserRole.CITIZEN,
      };
      normalizedRole = roleMap[role] || UserRole.CITIZEN;
    } else {
      normalizedRole = role.toUpperCase() as UserRole;
    }

    // Create or update the city assignment
    const assignment = await this.prisma.userCityAssignment.upsert({
      where: {
        userId_cityId: {
          userId,
          cityId,
        },
      },
      update: {
        role: normalizedRole,
        canManageAdmins: canManageAdmins ?? true,
        isActive: true,
        assignedBy,
      },
      create: {
        userId,
        cityId,
        role: normalizedRole,
        canManageAdmins: canManageAdmins ?? true,
        assignedBy,
      },
      select: {
        id: true,
        userId: true,
        cityId: true,
        role: true,
        canManageAdmins: true,
        assignedBy: true,
        createdAt: true,
      },
    });

    // Always update user's role in the users table to match the assignment
    // This ensures the role is updated even when changing back to CITIZEN
    try {
      this.logger.log(
        `Updating user role in users table: userId=${userId}, role=${normalizedRole}`,
      );

      // Emit event to users service to update the role
      await firstValueFrom(
        this.client.send(RabbitMQPatterns.USER_UPDATE_ROLE, {
          userId,
          role: normalizedRole,
          updatedBy: assignedBy,
        }),
      );

      this.logger.log(`User role updated successfully in users table: userId=${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update user role in users table: userId=${userId}`, error);
      // Don't fail the assignment if role update fails
      // The assignment is still created, just log the error
    }

    return {
      success: true,
      assignment: {
        ...assignment,
        role: roleToNumber(assignment.role), // Convert enum string to number
      },
    };
  }

  async syncListingFromIntegration(listingData: {
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
      metadata?: Record<string, unknown> | null;
    }>;
  }): Promise<{ action: string; listingId: string }> {
    this.logger.log(`Syncing listing from integration: ${listingData.externalId}`);

    // Resolve category IDs from slugs
    const categoryIds: string[] = [];
    if (listingData.categorySlugs && listingData.categorySlugs.length > 0) {
      for (const categorySlug of listingData.categorySlugs) {
        let category = await this.prisma.category.findUnique({
          where: { slug: categorySlug },
        });

        // Auto-create missing Event subcategories (slugs like "events-something")
        if (!category) {
          category = await this.ensureCategoryForSlug(categorySlug, listingData.primaryCityId);
        }

        if (category) {
          categoryIds.push(category.id);

          // Ensure city category mapping exists for Event subcategories
          if (listingData.primaryCityId && category.slug.startsWith('events-')) {
            await this.ensureCityCategoryMapping(
              listingData.primaryCityId,
              category.id,
              category.name,
              'de', // Destination One category names are in German
            );
          }
        } else {
          this.logger.warn(
            `Category with slug ${categorySlug} not found and could not be auto-created, skipping`,
          );
        }
      }
    }

    // Check if listing exists by externalId
    const existing = await this.prisma.listing.findFirst({
      where: {
        externalSource: listingData.externalSource,
        externalId: listingData.externalId,
      },
    });

    if (existing) {
      // Update if syncHash changed
      if (existing.syncHash !== listingData.syncHash) {
        this.logger.log(`Updating existing listing ${existing.id} (syncHash changed)`);

        // Update categories
        if (categoryIds.length > 0) {
          // Delete existing categories
          await this.prisma.listingCategory.deleteMany({
            where: { listingId: existing.id },
          });

          // Create new category associations
          await this.prisma.listingCategory.createMany({
            data: categoryIds.map((categoryId) => ({
              listingId: existing.id,
              categoryId,
            })),
          });
        }

        // Update time intervals
        if (listingData.timeIntervals) {
          // Delete existing time intervals
          await this.prisma.listingTimeInterval.deleteMany({
            where: { listingId: existing.id },
          });

          // Create new time intervals
          if (listingData.timeIntervals.length > 0) {
            await this.prisma.listingTimeInterval.createMany({
              data: listingData.timeIntervals.map((ti) => ({
                listingId: existing.id,
                weekdays: ti.weekdays,
                start: new Date(ti.start),
                end: new Date(ti.end),
                tz: ti.tz,
                freq: ti.freq,
                interval: ti.interval,
                repeatUntil: ti.repeatUntil ? new Date(ti.repeatUntil) : null,
              })),
            });
          }
        }

        if (listingData.mediaItems) {
          await this.prisma.listingMedia.deleteMany({
            where: { listingId: existing.id },
          });

          if (listingData.mediaItems.length > 0) {
            await this.prisma.listingMedia.createMany({
              data: listingData.mediaItems.map((media) => ({
                listingId: existing.id,
                type: media.type,
                url: media.url,
                altText: media.altText,
                caption: media.caption,
                order: media.order ?? 0,
                metadata:
                  media.metadata === undefined
                    ? undefined
                    : (media.metadata as Prisma.InputJsonValue),
              })),
            });
          }
        }

        // Update listing fields
        await this.prisma.listing.update({
          where: { id: existing.id },
          data: {
            title: listingData.title,
            summary: listingData.summary,
            content: listingData.content,
            syncHash: listingData.syncHash,
            lastSyncedAt: new Date(),
            languageCode: 'de', // Destination One data is in German
            venueName: listingData.venueName,
            address: listingData.address,
            geoLat: listingData.geoLat ? new Prisma.Decimal(listingData.geoLat) : undefined,
            geoLng: listingData.geoLng ? new Prisma.Decimal(listingData.geoLng) : undefined,
            timezone: listingData.timezone,
            contactPhone: listingData.contactPhone,
            contactEmail: listingData.contactEmail,
            website: listingData.website,
            heroImageUrl: listingData.heroImageUrl,
            eventStart: listingData.eventStart ? new Date(listingData.eventStart) : null, // clear if no value
            eventEnd: listingData.eventEnd ? new Date(listingData.eventEnd) : null,
          },
        });

        // Sync tags if provided
        if (listingData.tags && listingData.tags.length > 0) {
          await this.syncTagsForListing(existing.id, listingData.externalSource, listingData.tags);
        }

        // Trigger translations for changed translatable fields
        await this.triggerTranslationsForListing(existing.id, {
          ...listingData,
          languageCode: 'de', // Destination One data is in German
        });

        return { action: 'updated', listingId: existing.id };
      }

      this.logger.log(`Skipping listing ${existing.id} (syncHash unchanged)`);
      return { action: 'skipped', listingId: existing.id };
    }

    // Create new listing
    this.logger.log(`Creating new listing for externalId: ${listingData.externalId}`);

    const listing = await this.prisma.listing.create({
      data: {
        slug: listingData.slug,
        title: listingData.title,
        summary: listingData.summary,
        content: listingData.content,
        status: ListingStatus.APPROVED, // Auto-approve imports
        moderationStatus: ListingModerationStatus.APPROVED,
        sourceType: ListingSourceType.API_IMPORT,
        externalSource: listingData.externalSource,
        externalId: listingData.externalId,
        syncHash: listingData.syncHash,
        lastSyncedAt: new Date(),
        ingestedAt: new Date(),
        ingestedByService: 'integration',
        languageCode: 'de', // Destination One data is in German
        primaryCityId: listingData.primaryCityId,
        venueName: listingData.venueName,
        address: listingData.address,
        geoLat: listingData.geoLat ? new Prisma.Decimal(listingData.geoLat) : undefined,
        geoLng: listingData.geoLng ? new Prisma.Decimal(listingData.geoLng) : undefined,
        timezone: listingData.timezone,
        contactPhone: listingData.contactPhone,
        contactEmail: listingData.contactEmail,
        website: listingData.website,
        heroImageUrl: listingData.heroImageUrl,
        eventStart: listingData.eventStart ? new Date(listingData.eventStart) : undefined,
        eventEnd: listingData.eventEnd ? new Date(listingData.eventEnd) : undefined,
        categories:
          categoryIds.length > 0
            ? {
                create: categoryIds.map((categoryId) => ({
                  categoryId,
                })),
              }
            : undefined,
        media:
          listingData.mediaItems && listingData.mediaItems.length > 0
            ? {
                create: listingData.mediaItems.map((media) => ({
                  type: media.type,
                  url: media.url,
                  altText: media.altText,
                  caption: media.caption,
                  order: media.order ?? 0,
                  metadata:
                    media.metadata === undefined
                      ? undefined
                      : (media.metadata as Prisma.InputJsonValue),
                })),
              }
            : undefined,
        cities: listingData.primaryCityId
          ? {
              create: [
                {
                  cityId: listingData.primaryCityId,
                  isPrimary: true,
                },
              ],
            }
          : undefined,
        timeIntervals:
          listingData.timeIntervals && listingData.timeIntervals.length > 0
            ? {
                create: listingData.timeIntervals.map((ti) => ({
                  weekdays: ti.weekdays,
                  start: new Date(ti.start),
                  end: new Date(ti.end),
                  tz: ti.tz,
                  freq: ti.freq,
                  interval: ti.interval,
                  repeatUntil: ti.repeatUntil ? new Date(ti.repeatUntil) : null,
                })),
              }
            : undefined,
      },
    });

    // Sync tags if provided
    if (listingData.tags && listingData.tags.length > 0) {
      await this.syncTagsForListing(listing.id, listingData.externalSource, listingData.tags);
    }

    // Trigger translations for new listing
    await this.triggerTranslationsForListing(listing.id, {
      ...listingData,
      languageCode: 'de', // Destination One data is in German
    });

    return { action: 'created', listingId: listing.id };
  }

  /**
   * Sync tags for a listing from an external integration
   * Creates or updates Tag records and links them to the listing
   */
  private async syncTagsForListing(
    listingId: string,
    externalSource: string,
    tagValues: string[],
  ): Promise<void> {
    if (!tagValues || tagValues.length === 0) {
      return;
    }

    // Determine provider from externalSource
    const provider =
      externalSource === 'destination_one' ? 'DESTINATION_ONE' : externalSource.toUpperCase();

    // Delete existing tag associations for this listing
    await this.prisma.listingTag.deleteMany({
      where: { listingId },
    });

    // Upsert tags and create associations
    const tagIds: string[] = [];
    for (const tagValue of tagValues) {
      if (!tagValue || !tagValue.trim()) {
        continue;
      }

      const normalizedValue = tagValue.trim();

      // Find or create tag
      let tag = await this.prisma.tag.findUnique({
        where: {
          provider_externalValue: {
            provider,
            externalValue: normalizedValue,
          },
        },
      });

      if (!tag) {
        // Create new tag
        tag = await this.prisma.tag.create({
          data: {
            provider,
            externalValue: normalizedValue,
            label: normalizedValue, // Use value as default label
            languageCode: 'de', // Destination One data is in German
          },
        });

        // Create translation entry for the tag label (source language)
        await this.translationService.saveTranslation(
          'tag',
          tag.id,
          'label',
          'de',
          normalizedValue,
          'de',
          undefined,
          TranslationSource.IMPORT,
        );
      } else {
        // Update label if it changed
        if (tag.label !== normalizedValue) {
          await this.prisma.tag.update({
            where: { id: tag.id },
            data: { label: normalizedValue },
          });
        }
      }

      tagIds.push(tag.id);
    }

    // Create listing-tag associations
    if (tagIds.length > 0) {
      await this.prisma.listingTag.createMany({
        data: tagIds.map((tagId) => ({
          listingId,
          tagId,
        })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * Helper method to compute source hash for a field value
   */
  private computeSourceHash(text: string): string {
    return createHash('sha256')
      .update(text || '')
      .digest('hex');
  }

  /**
   * Trigger translations for listing fields
   * The translation service will check sourceHash and skip unchanged fields
   */
  private async triggerTranslationsForListing(
    listingId: string,
    listingData: {
      title: string;
      summary?: string;
      content: string;
      languageCode?: string;
    },
  ): Promise<void> {
    // Check if auto-translation on sync is enabled
    if (!this.configService.translationsAutoTranslateOnSync) {
      this.logger.debug(
        `Auto-translation on sync is disabled, skipping translations for listing ${listingId}`,
      );
      return;
    }

    // Get the listing to determine its source language
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { languageCode: true },
    });

    // Use listing's languageCode, or fall back to provided languageCode, or default
    const sourceLocale =
      listing?.languageCode || listingData.languageCode || this.defaultSourceLocale;

    const targetLocales = this.supportedLocales.filter((locale) => locale !== sourceLocale);

    if (targetLocales.length === 0) {
      return; // No target locales to translate to
    }

    // Map field names to values
    const fieldMapping: Record<string, { value: string; fieldName: string }> = {
      title: { value: listingData.title, fieldName: 'title' },
      summary: { value: listingData.summary || '', fieldName: 'summary' },
      content: { value: listingData.content, fieldName: 'content' },
    };

    for (const [fieldKey, fieldData] of Object.entries(fieldMapping)) {
      if (!fieldData.value || fieldData.value.trim().length === 0) {
        continue; // Skip empty fields
      }

      const sourceHash = this.computeSourceHash(fieldData.value);

      try {
        // Publish translation job with correct source locale
        // The translation service will check sourceHash internally and skip if unchanged
        this.client.emit(RabbitMQPatterns.TRANSLATION_AUTO_TRANSLATE, {
          entityType: 'listing',
          entityId: listingId,
          field: fieldData.fieldName,
          sourceLocale,
          targetLocales,
          text: fieldData.value,
          sourceHash,
        });
      } catch (error: any) {
        this.logger.error(
          `Error checking translation for listing ${listingId}, field ${fieldKey}: ${error?.message}`,
        );
        // Continue with other fields even if one fails
      }
    }
  }

  async syncParkingSpace(data: {
    integrationId: string;
    cityId: string;
    parkingData: any;
  }): Promise<void> {
    this.logger.log(`Syncing parking space for city ${data.cityId}`);

    const parking = data.parkingData;

    // Extract coordinates from location
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (parking.location) {
      if (parking.location.coordinates && Array.isArray(parking.location.coordinates)) {
        // GeoJSON format: [longitude, latitude]
        [longitude, latitude] = parking.location.coordinates;
      } else if (
        typeof parking.location.latitude === 'number' &&
        typeof parking.location.longitude === 'number'
      ) {
        // Direct lat/lng format
        latitude = parking.location.latitude;
        longitude = parking.location.longitude;
      }
    }

    if (latitude == null || longitude == null) {
      this.logger.warn(
        `Invalid location coordinates for parking space ${parking.id || parking.parkingSiteId}`,
      );
      return;
    }

    const parkingSiteId = parking.parkingSiteId || parking.id;
    if (!parkingSiteId) {
      this.logger.warn(`Missing parkingSiteId for parking space`);
      return;
    }

    // Calculate available spots from various sources
    const totalFromSlots =
      (parking.fourWheelerSlots?.totalSlotNumber ?? 0) +
      (parking.twoWheelerSlots?.totalSlotNumber ?? 0) +
      (parking.unclassifiedSlots?.totalSpotNumber ?? 0);

    const occupiedFromSlots =
      (parking.fourWheelerSlots?.occupiedSlotNumber ?? 0) +
      (parking.twoWheelerSlots?.occupiedSlotNumber ?? 0) +
      (parking.unclassifiedSlots?.occupiedSpotNumber ?? 0);

    const totalSpotNumber =
      typeof parking.totalSpotNumber === 'number' && parking.totalSpotNumber > 0
        ? parking.totalSpotNumber
        : totalFromSlots;

    const occupiedSpotNumber =
      typeof parking.occupiedSpotNumber === 'number' && parking.occupiedSpotNumber >= 0
        ? parking.occupiedSpotNumber
        : occupiedFromSlots;

    const availableSpotNumber =
      totalSpotNumber > 0 ? Math.max(0, totalSpotNumber - occupiedSpotNumber) : null;

    const occupancy =
      totalSpotNumber > 0 ? Number((occupiedSpotNumber / totalSpotNumber).toFixed(4)) : null;

    // Determine status
    let status = 'unknown';

    // OffStreetParking schema defines `status` as array<string>, but some APIs might use a string
    const rawStatus = parking.status;
    const statusValues: string[] = Array.isArray(rawStatus)
      ? rawStatus
      : typeof rawStatus === 'string'
        ? [rawStatus]
        : [];

    if (statusValues.length > 0) {
      const statusLower = statusValues.map((s) => s.toLowerCase());
      if (statusLower.some((s) => s.includes('open') || s.includes('spacesavailable'))) {
        status = 'open';
      } else if (
        statusLower.some(
          (s) => s.includes('closed') || s.includes('full') || s.includes('unavailable'),
        )
      ) {
        status = 'closed';
      } else {
        // Fallback to first raw value
        status = statusLower[0];
      }
    } else if (totalSpotNumber > 0) {
      if (availableSpotNumber === 0) {
        status = 'closed';
      } else if (availableSpotNumber && availableSpotNumber > 0) {
        status = 'open';
      }
    }

    try {
      await this.prisma.parkingSpace.upsert({
        where: {
          cityId_parkingSiteId: {
            cityId: data.cityId,
            parkingSiteId,
          },
        },
        update: {
          name: parking.name || null,
          description: parking.description || null,
          latitude: new Prisma.Decimal(latitude),
          longitude: new Prisma.Decimal(longitude),
          address: parking.address || null,
          totalSpotNumber: totalSpotNumber > 0 ? totalSpotNumber : null,
          occupiedSpotNumber: occupiedSpotNumber > 0 ? occupiedSpotNumber : null,
          availableSpotNumber,
          occupancy: occupancy ? new Prisma.Decimal(occupancy) : null,
          fourWheelerSlots: parking.fourWheelerSlots || null,
          twoWheelerSlots: parking.twoWheelerSlots || null,
          unclassifiedSlots: parking.unclassifiedSlots || null,
          status,
          outOfServiceSlotNumber: parking.outOfServiceSlotNumber || null,
          category: parking.category || null,
          allowedVehicleType: parking.allowedVehicleType || null,
          chargeType: parking.chargeType || null,
          acceptedPaymentMethod: parking.acceptedPaymentMethod || null,
          priceRatePerMinute: parking.priceRatePerMinute
            ? new Prisma.Decimal(parking.priceRatePerMinute)
            : null,
          priceCurrency: parking.priceCurrency || null,
          languageCode: 'de', // Mobilithek data is in German
          occupancyModified: parking.occupancyModified ? new Date(parking.occupancyModified) : null,
          observationDateTime: parking.observationDateTime
            ? new Date(parking.observationDateTime)
            : null,
          lastSyncAt: new Date(),
          metadata: parking,
        },
        create: {
          cityId: data.cityId,
          integrationId: data.integrationId,
          parkingSiteId,
          name: parking.name || null,
          description: parking.description || null,
          latitude: new Prisma.Decimal(latitude),
          longitude: new Prisma.Decimal(longitude),
          address: parking.address || null,
          totalSpotNumber: totalSpotNumber > 0 ? totalSpotNumber : null,
          occupiedSpotNumber: occupiedSpotNumber > 0 ? occupiedSpotNumber : null,
          availableSpotNumber,
          occupancy: occupancy ? new Prisma.Decimal(occupancy) : null,
          fourWheelerSlots: parking.fourWheelerSlots || null,
          twoWheelerSlots: parking.twoWheelerSlots || null,
          unclassifiedSlots: parking.unclassifiedSlots || null,
          status,
          outOfServiceSlotNumber: parking.outOfServiceSlotNumber || null,
          category: parking.category || null,
          allowedVehicleType: parking.allowedVehicleType || null,
          chargeType: parking.chargeType || null,
          acceptedPaymentMethod: parking.acceptedPaymentMethod || null,
          priceRatePerMinute: parking.priceRatePerMinute
            ? new Prisma.Decimal(parking.priceRatePerMinute)
            : null,
          priceCurrency: parking.priceCurrency || null,
          languageCode: 'de', // Mobilithek data is in German
          occupancyModified: parking.occupancyModified ? new Date(parking.occupancyModified) : null,
          observationDateTime: parking.observationDateTime
            ? new Date(parking.observationDateTime)
            : null,
          lastSyncAt: new Date(),
          metadata: parking,
        },
      });

      // Invalidate cache for this city
      await this.redis.del(`parking:spaces:${data.cityId}`);
    } catch (error: any) {
      this.logger.error(`Failed to sync parking space ${parkingSiteId}: ${error?.message}`, error);
      throw error;
    }
  }

  /**
   * Ensures a Category exists for the given slug.
   * - For Event subcategories (slugs starting with "events-"), it will auto-create a child
   *   of the root "events" category with type CategoryType.EVENT.
   * - For all other slugs, it returns null (no auto-creation).
   * - If cityId is provided and a new category is created, it will also create a CityCategory
   *   mapping for that city.
   */
  private async ensureCategoryForSlug(categorySlug: string, cityId?: string) {
    // Only auto-create Event subcategories for now
    if (!categorySlug.startsWith('events-')) {
      return null;
    }

    const existing = await this.prisma.category.findUnique({
      where: { slug: categorySlug },
    });
    if (existing) {
      return existing;
    }

    const rootEventsCategory = await this.prisma.category.findUnique({
      where: { slug: 'events' },
    });

    if (!rootEventsCategory) {
      this.logger.error(
        `Cannot auto-create Event subcategory "${categorySlug}" because root 'events' category is missing`,
      );
      return null;
    }

    // Derive a human-readable name from the slug part after "events-"
    const rawNamePart = categorySlug.replace(/^events-/, '');
    const name =
      rawNamePart.length > 0
        ? rawNamePart
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        : 'Events';

    try {
      const created = await this.prisma.category.create({
        data: {
          name,
          slug: categorySlug,
          type: CategoryType.EVENT,
          isActive: true,
          parent: {
            connect: { id: rootEventsCategory.id },
          },
        },
      });

      this.logger.log(
        `Auto-created Event subcategory "${categorySlug}" with id=${created.id} under root 'events'`,
      );

      // If cityId is provided, create a CityCategory mapping for this newly created category
      if (cityId) {
        await this.ensureCityCategoryMapping(
          cityId,
          created.id,
          name,
          'de', // Destination One category names are in German
        );
      }

      return created;
    } catch (error: any) {
      // Handle potential race condition on unique slug
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' // Unique constraint violation
      ) {
        return this.prisma.category.findUnique({
          where: { slug: categorySlug },
        });
      }

      this.logger.error(`Failed to auto-create category with slug "${categorySlug}"`, error);
      return null;
    }
  }

  /**
   * Ensures a CityCategory mapping exists for the given city and category.
   * Creates the mapping if it does not exist, and is safe to call repeatedly.
   */
  private async ensureCityCategoryMapping(
    cityId: string,
    categoryId: string,
    displayName: string,
    languageCode: string,
    displayOrder = 99,
  ): Promise<void> {
    try {
      // Check if CityCategory already exists (race condition handling)
      const existingCityCategory = await this.prisma.cityCategory.findUnique({
        where: {
          cityId_categoryId: {
            cityId,
            categoryId,
          },
        },
      });

      if (!existingCityCategory) {
        await this.prisma.cityCategory.create({
          data: {
            cityId,
            categoryId,
            displayName,
            languageCode,
            displayOrder,
            isActive: true,
          },
        });

        this.logger.log(
          `Auto-created CityCategory mapping for cityId=${cityId} and categoryId=${categoryId}`,
        );
      }
    } catch (error: any) {
      // Handle potential race condition on unique constraint
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' // Unique constraint violation
      ) {
        this.logger.debug(
          `CityCategory already exists for cityId=${cityId} and categoryId=${categoryId}`,
        );
      } else {
        this.logger.warn(
          `Failed to ensure CityCategory for cityId=${cityId} and categoryId=${categoryId}: ${error?.message}`,
        );
        // Don't fail the caller if city category mapping fails
      }
    }
  }

  async getParkingSpaces(cityId: string): Promise<any[]> {
    // Check Redis cache first (store base data, apply translations per request)
    const cacheKey = `parking:spaces:${cityId}`;
    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for parking spaces: ${cityId}`);
      return this.applyParkingSpaceTranslations(cached);
    }

    // Check if city has parking feature enabled
    try {
      const city = await firstValueFrom(
        this.client.send(RabbitMQPatterns.CITY_FIND_BY_ID, { cityId }),
      );

      if (!city) {
        throw new Error(`City ${cityId} not found`);
      }

      // Check if parking feature is enabled in city metadata
      const features = (city.metadata as any)?.features || {};
      if (!features.parking) {
        throw new Error('Parking feature is not enabled for this city');
      }
    } catch (error: any) {
      this.logger.error(`Error checking city feature: ${error?.message}`, error);
      throw error;
    }

    // Query database
    const spaces = await this.prisma.parkingSpace.findMany({
      where: {
        cityId,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Transform to API response format
    const result = spaces.map((space) => ({
      id: space.id,
      parkingSiteId: space.parkingSiteId,
      name: space.name,
      description: space.description,
      location: {
        latitude: Number(space.latitude),
        longitude: Number(space.longitude),
        address: space.address,
      },
      capacity: {
        total: space.totalSpotNumber,
        available: space.availableSpotNumber,
        occupied: space.occupiedSpotNumber,
        occupancy: space.occupancy ? Number(space.occupancy) : null,
      },
      vehicleSlots: {
        fourWheeler: space.fourWheelerSlots,
        twoWheeler: space.twoWheelerSlots,
        unclassified: space.unclassifiedSlots,
      },
      status: space.status,
      lastUpdate: space.observationDateTime || space.lastSyncAt,
      pricing:
        space.priceRatePerMinute && space.priceCurrency
          ? {
              ratePerMinute: Number(space.priceRatePerMinute),
              currency: space.priceCurrency,
            }
          : null,
      metadata: space.metadata,
    }));

    // Cache base result for 60 seconds (matches API update interval)
    await this.redis.set(cacheKey, result, 60);

    return this.applyParkingSpaceTranslations(result);
  }

  /**
   * Apply translations to parking space fields based on current request language
   */
  private async applyParkingSpaceTranslations(spaces: any[]): Promise<any[]> {
    const locale = this.i18nService.getLanguage();
    const defaultLocale = this.configService.get<string>('i18n.defaultLanguage', 'en');

    if (!locale || locale === defaultLocale) {
      return spaces;
    }

    return Promise.all(
      spaces.map(async (space) => {
        // Get source language from parking space (defaults to 'de' for Mobilithek data)
        const sourceLocale = space.languageCode || 'de';

        const [name, description] = await Promise.all([
          this.translationService.getTranslation(
            'parkingSpace',
            space.id,
            'name',
            locale,
            space.name ?? '',
            sourceLocale,
          ),
          this.translationService.getTranslation(
            'parkingSpace',
            space.id,
            'description',
            locale,
            space.description ?? '',
            sourceLocale,
          ),
        ]);

        return {
          ...space,
          name,
          description,
        };
      }),
    );
  }

  private async checkCityFeature(cityId: string, featureName: string): Promise<boolean> {
    try {
      const city = await firstValueFrom(
        this.client.send(RabbitMQPatterns.CITY_FIND_BY_ID, { cityId }),
      );

      if (!city) {
        return false;
      }

      const features = (city.metadata as any)?.features || {};
      return features[featureName] === true;
    } catch (error) {
      this.logger.error(`Error checking city feature: ${featureName}`, error);
      return false;
    }
  }

  /**
   * Process favorite event reminders and emit push notifications
   * Called by scheduler via RabbitMQ
   */
  async processFavoriteEventReminders(
    triggeredAt?: string,
    scheduleRunId?: string,
  ): Promise<{
    sent24h: number;
    sent2h: number;
  }> {
    const now = triggeredAt ? new Date(triggeredAt) : new Date();
    this.logger.log(`Processing favorite event reminders at ${now.toISOString()}`);

    // Acquire lock to prevent concurrent runs
    const lockKey = 'core:favorite-reminders:lock';
    const acquired = await this.redis.acquireLock(lockKey, 300); // 5 minute lock

    if (!acquired) {
      this.logger.warn(
        'Could not acquire lock for favorite event reminders - another run may be in progress',
      );
      return { sent24h: 0, sent2h: 0 };
    }

    try {
      const graceWindow = 60 * 60 * 1000; // 1 hour grace window

      // Compute time windows
      // 24h reminders: [now + 24h, now + 24h + graceWindow]
      const window24hStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const window24hEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000 + graceWindow);
      // 2h reminders: [now + 2h, now + 2h + graceWindow]
      const window2hStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const window2hEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000 + graceWindow);

      this.logger.debug(
        `Time windows - Now: ${now.toISOString()}, 24h: [${window24hStart.toISOString()}, ${window24hEnd.toISOString()}], 2h: [${window2hStart.toISOString()}, ${window2hEnd.toISOString()}]`,
      );

      // Fetch all active favorites with their listings
      const favorites = await this.prisma.userFavorite.findMany({
        include: {
          listing: {
            include: {
              timeIntervals: true,
              cities: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      });

      this.logger.debug(`Found ${favorites.length} total favorites to process`);

      let sent24h = 0;
      let sent2h = 0;
      let skippedCount = 0;
      const skipReasons: Record<string, number> = {};

      // Cache user notification preferences to avoid repeated RabbitMQ calls
      const userNotificationCache = new Map<string, boolean>();

      for (const favorite of favorites) {
        const listing = favorite.listing;

        this.logger.debug(
          `Processing favorite ${favorite.id} for listing ${listing.id} (eventStart: ${listing.eventStart?.toISOString() || 'null'})`,
        );

        // Skip if listing is not approved/visible or archived
        if (
          listing.status !== ListingStatus.APPROVED ||
          listing.moderationStatus !== ListingModerationStatus.APPROVED ||
          listing.visibility !== ListingVisibility.PUBLIC ||
          listing.isArchived
        ) {
          skippedCount++;
          const reason = `listing not approved/visible (status: ${listing.status}, moderation: ${listing.moderationStatus}, visibility: ${listing.visibility}, archived: ${listing.isArchived})`;
          skipReasons[reason] = (skipReasons[reason] || 0) + 1;
          this.logger.debug(`Skipping listing ${listing.id} - ${reason}`);
          continue;
        }

        // Check if user has notifications enabled
        let notificationsEnabled = userNotificationCache.get(favorite.userId);
        if (notificationsEnabled === undefined) {
          try {
            const userData = await firstValueFrom(
              this.client.send<
                { id: string; notificationsEnabled?: boolean } | null,
                { id: string }
              >(RabbitMQPatterns.USER_FIND_BY_ID, { id: favorite.userId }),
            );
            notificationsEnabled = userData?.notificationsEnabled !== false; // Default to true if not set
            userNotificationCache.set(favorite.userId, notificationsEnabled);
          } catch (error) {
            this.logger.warn(
              `Failed to fetch user notification preferences for user ${favorite.userId}, defaulting to enabled`,
            );
            notificationsEnabled = true;
            userNotificationCache.set(favorite.userId, notificationsEnabled);
          }
        }

        // Skip if user has disabled notifications
        if (!notificationsEnabled) {
          skippedCount++;
          skipReasons['notifications disabled'] = (skipReasons['notifications disabled'] || 0) + 1;
          this.logger.debug(
            `Skipping reminder for user ${favorite.userId} - notifications disabled`,
          );
          continue;
        }

        // Skip if listing has no event start time
        if (!listing.eventStart) {
          skippedCount++;
          skipReasons['no eventStart'] = (skipReasons['no eventStart'] || 0) + 1;
          this.logger.debug(`Skipping listing ${listing.id} - no eventStart`);
          continue;
        }

        // Compute upcoming occurrences - use eventStart only for both recurring and non-recurring
        // Search window spans from earliest (2h start) to latest (24h end) to capture all reminder types
        const allOccurrences = this.computeUpcomingOccurrences(
          {
            eventStart: listing.eventStart,
            eventEnd: listing.eventEnd,
            timeIntervals: [], // Ignore timeIntervals, use eventStart only
            timezone: listing.timezone,
          },
          window2hStart, // Earliest boundary (now + 2h)
          window24hEnd,  // Latest boundary (now + 25h)
        );

        this.logger.debug(
          `Listing ${listing.id} - eventStart: ${listing.eventStart.toISOString()}, found ${allOccurrences.length} occurrences in search window`,
        );
        if (allOccurrences.length > 0) {
          this.logger.debug(
            `Occurrences: ${allOccurrences.map((o) => o.toISOString()).join(', ')}`,
          );
        }

        // Process 24h reminders
        const occurrences24h = allOccurrences.filter(
          (occ) => occ >= window24hStart && occ <= window24hEnd,
        );

        this.logger.debug(
          `Listing ${listing.id} - ${occurrences24h.length} occurrences in 24h window [${window24hStart.toISOString()}, ${window24hEnd.toISOString()}]`,
        );

        for (const occurrence of occurrences24h) {
          // Check if reminder already sent
          const existing = await this.prisma.listingReminder.findUnique({
            where: {
              userId_listingId_occurrenceStart_reminderType: {
                userId: favorite.userId,
                listingId: listing.id,
                occurrenceStart: occurrence,
                reminderType: ListingReminderType.H24,
              },
            },
          });

          if (!existing) {
            this.logger.debug(
              `Creating 24h reminder for user ${favorite.userId}, listing ${listing.id}, occurrence ${occurrence.toISOString()}`,
            );
            // Create reminder record
            await this.prisma.listingReminder.create({
              data: {
                userId: favorite.userId,
                listingId: listing.id,
                occurrenceStart: occurrence,
                reminderType: ListingReminderType.H24,
              },
            });

            // Emit notification
            await this.emitEventReminderNotification(
              favorite.userId,
              listing,
              occurrence,
              ListingReminderType.H24,
              scheduleRunId,
            );

            sent24h++;
            this.logger.debug(
              `Sent 24h reminder to user ${favorite.userId} for listing ${listing.id} at ${occurrence.toISOString()}`,
            );
          } else {
            this.logger.debug(
              `Skipping 24h reminder for user ${favorite.userId}, listing ${listing.id}, occurrence ${occurrence.toISOString()} - already sent (reminder ID: ${existing.id})`,
            );
          }
        }

        // Process 2h reminders
        const occurrences2h = allOccurrences.filter(
          (occ) => occ >= window2hStart && occ <= window2hEnd,
        );

        this.logger.debug(
          `Listing ${listing.id} - ${occurrences2h.length} occurrences in 2h window [${window2hStart.toISOString()}, ${window2hEnd.toISOString()}]`,
        );

        for (const occurrence of occurrences2h) {
          // Check if reminder already sent
          const existing = await this.prisma.listingReminder.findUnique({
            where: {
              userId_listingId_occurrenceStart_reminderType: {
                userId: favorite.userId,
                listingId: listing.id,
                occurrenceStart: occurrence,
                reminderType: ListingReminderType.H2,
              },
            },
          });

          if (!existing) {
            this.logger.debug(
              `Creating 2h reminder for user ${favorite.userId}, listing ${listing.id}, occurrence ${occurrence.toISOString()}`,
            );
            // Create reminder record
            await this.prisma.listingReminder.create({
              data: {
                userId: favorite.userId,
                listingId: listing.id,
                occurrenceStart: occurrence,
                reminderType: ListingReminderType.H2,
              },
            });

            // Emit notification
            await this.emitEventReminderNotification(
              favorite.userId,
              listing,
              occurrence,
              ListingReminderType.H2,
              scheduleRunId,
            );

            sent2h++;
            this.logger.debug(
              `Sent 2h reminder to user ${favorite.userId} for listing ${listing.id} at ${occurrence.toISOString()}`,
            );
          } else {
            this.logger.debug(
              `Skipping 2h reminder for user ${favorite.userId}, listing ${listing.id}, occurrence ${occurrence.toISOString()} - already sent (reminder ID: ${existing.id})`,
            );
          }
        }
      }

      this.logger.log(
        `Processed favorite event reminders: ${sent24h} 24h reminders, ${sent2h} 2h reminders, ${skippedCount} skipped`,
      );
      if (Object.keys(skipReasons).length > 0) {
        this.logger.debug(`Skip reasons: ${JSON.stringify(skipReasons, null, 2)}`);
      }

      return { sent24h, sent2h };
    } finally {
      await this.redis.releaseLock(lockKey);
    }
  }

  /**
   * Compute upcoming event occurrences for a listing within a time window
   */
  private computeUpcomingOccurrences(
    listing: {
      eventStart: Date | null;
      eventEnd: Date | null;
      timeIntervals: Array<{
        weekdays: string[];
        start: Date;
        end: Date;
        tz: string;
        freq: ListingRecurrenceFreq;
        interval: number;
        repeatUntil: Date | null;
      }>;
      timezone: string | null;
    },
    windowStart: Date,
    windowEnd: Date,
  ): Date[] {
    const occurrences: Date[] = [];

    // Use eventStart directly from database for both recurring and non-recurring events
    if (listing.eventStart) {
      if (listing.eventStart >= windowStart && listing.eventStart <= windowEnd) {
        occurrences.push(listing.eventStart);
      }
      return occurrences;
    }

    // Fallback: if no eventStart, check timeIntervals (should not happen with new logic)
    if (listing.timeIntervals && listing.timeIntervals.length > 0) {
      // Map weekday names to day numbers (0 = Sunday, 1 = Monday, etc.)
      const weekdayToNumber: Record<string, number> = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
      };

      for (const interval of listing.timeIntervals) {
        if (interval.freq === ListingRecurrenceFreq.NONE) {
          // Single occurrence
          if (interval.start >= windowStart && interval.start <= windowEnd) {
            occurrences.push(interval.start);
          }
          continue;
        }

        const repeatUntil = interval.repeatUntil
          ? new Date(interval.repeatUntil)
          : new Date(windowEnd.getTime() + 7 * 24 * 60 * 60 * 1000); // Default to 7 days beyond window

        // Special handling for WEEKLY frequency with multiple weekdays
        if (
          interval.freq === ListingRecurrenceFreq.WEEKLY &&
          interval.weekdays &&
          interval.weekdays.length > 0
        ) {
          // Get the time portion from interval.start (hours, minutes, seconds)
          const startTime = {
            hours: interval.start.getHours(),
            minutes: interval.start.getMinutes(),
            seconds: interval.start.getSeconds(),
            milliseconds: interval.start.getMilliseconds(),
          };

          // Find the Monday of the week containing interval.start
          const startDate = new Date(interval.start);
          const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to get Monday
          const weekStart = new Date(startDate);
          weekStart.setDate(startDate.getDate() + mondayOffset);
          weekStart.setHours(0, 0, 0, 0);

          let currentWeekStart = new Date(weekStart);
          let iterations = 0;
          const maxIterations = 1000;

          while (iterations < maxIterations) {
            // For each specified weekday, generate an occurrence in this week
            for (const weekdayName of interval.weekdays) {
              const weekdayNum = weekdayToNumber[weekdayName];
              if (weekdayNum === undefined) continue;

              // Calculate the date for this weekday in the current week
              // Monday = 1, so we need to offset from Monday (which is our week start)
              const daysFromMonday = weekdayNum === 0 ? 6 : weekdayNum - 1; // Sunday is 6 days from Monday
              const occurrenceDate = new Date(currentWeekStart);
              occurrenceDate.setDate(currentWeekStart.getDate() + daysFromMonday);
              occurrenceDate.setHours(
                startTime.hours,
                startTime.minutes,
                startTime.seconds,
                startTime.milliseconds,
              );

              // Check if this occurrence is valid
              if (
                occurrenceDate >= interval.start &&
                occurrenceDate <= repeatUntil &&
                occurrenceDate >= windowStart &&
                occurrenceDate <= windowEnd
              ) {
                occurrences.push(new Date(occurrenceDate));
              }
            }

            // Advance to the next week (respecting interval)
            currentWeekStart = new Date(
              currentWeekStart.getTime() + interval.interval * 7 * 24 * 60 * 60 * 1000,
            );

            // Stop if we've passed the repeatUntil or windowEnd
            if (currentWeekStart > repeatUntil || currentWeekStart > windowEnd) {
              break;
            }

            iterations++;
          }
        } else {
          // Original logic for non-weekly or no weekday filter
          let current = new Date(interval.start);

          // Limit iterations to prevent infinite loops
          let iterations = 0;
          const maxIterations = 1000;

          while (current <= repeatUntil && current <= windowEnd && iterations < maxIterations) {
            if (current >= windowStart) {
              // Check if this occurrence matches the weekday filter (if any)
              if (interval.weekdays && interval.weekdays.length > 0) {
                const weekday = current
                  .toLocaleDateString('en-US', { weekday: 'short' })
                  .toUpperCase();
                if (interval.weekdays.includes(weekday)) {
                  occurrences.push(new Date(current));
                }
              } else {
                occurrences.push(new Date(current));
              }
            }

            // Advance to next occurrence based on frequency
            switch (interval.freq) {
              case ListingRecurrenceFreq.DAILY:
                current = new Date(current.getTime() + interval.interval * 24 * 60 * 60 * 1000);
                break;
              case ListingRecurrenceFreq.WEEKLY:
                current = new Date(current.getTime() + interval.interval * 7 * 24 * 60 * 60 * 1000);
                break;
              case ListingRecurrenceFreq.MONTHLY:
                current = new Date(current);
                current.setMonth(current.getMonth() + interval.interval);
                break;
              case ListingRecurrenceFreq.YEARLY:
                current = new Date(current);
                current.setFullYear(current.getFullYear() + interval.interval);
                break;
              default:
                break;
            }

            iterations++;
          }
        }
      }
    }

    // Sort and deduplicate occurrences
    return Array.from(new Set(occurrences.map((d) => d.getTime())))
      .map((t) => new Date(t))
      .sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Emit a push notification for an event reminder
   */
  private async emitEventReminderNotification(
    userId: string,
    listing: {
      id: string;
      title: string;
      primaryCityId: string | null;
      cities: Array<{ cityId: string }>;
    },
    occurrenceStart: Date,
    reminderType: ListingReminderType,
    scheduleRunId?: string,
  ): Promise<void> {
    try {
      // Get city name if available
      let cityName: string | undefined;
      const cityId = listing.primaryCityId || listing.cities[0]?.cityId;
      if (cityId) {
        try {
          const city = await firstValueFrom(
            this.client.send(RabbitMQPatterns.CITY_FIND_BY_ID, { id: cityId }),
          );
          cityName = city?.name;
        } catch (error) {
          this.logger.warn(`Failed to fetch city name for cityId: ${cityId}`, error);
        }
      }

      // Format occurrence date
      const occurrenceDate = occurrenceStart.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // Determine translation key based on reminder type
      const translationKey =
        reminderType === ListingReminderType.H24
          ? 'notifications.event.reminder24h'
          : 'notifications.event.reminder2h';

      // Build notification DTO
      const notificationDto: SendNotificationDto = {
        userId,
        type: 'EVENT_REMINDER',
        channel: 'PUSH',
        translationKey,
        translationParams: {
          eventTitle: listing.title,
          eventDate: occurrenceDate,
          cityName: cityName || '',
        },
        cityId: cityId || undefined,
        fcmData: {
          kind: 'event',
          listingId: listing.id,
          occurrenceStartIso: occurrenceStart.toISOString(),
        },
        content: '', // Will be filled by translation service
        subject: '', // Will be filled by translation service
        metadata: scheduleRunId ? { scheduleRunId } : undefined,
      };

      // Emit notification
      this.client.emit(RabbitMQPatterns.NOTIFICATION_SEND, notificationDto);

      this.logger.log(
        `Emitted ${reminderType} reminder notification for user ${userId}, listing ${listing.id}, occurrence ${occurrenceStart.toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit reminder notification for user ${userId}, listing ${listing.id}`,
        error,
      );
      // Don't throw - continue processing other reminders
    }
  }
}
