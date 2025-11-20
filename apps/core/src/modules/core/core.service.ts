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
  ListingRecurrenceFreq,
  ListingMediaType,
  Prisma,
} from '@prisma/client-core';
import { CoreOperationRequestDto, CoreOperationResponseDto } from '@heidi/contracts';
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
        const category = await this.prisma.category.findUnique({
          where: { slug: categorySlug },
        });
        if (category) {
          categoryIds.push(category.id);
        } else {
          this.logger.warn(`Category with slug ${categorySlug} not found, skipping`);
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
}
