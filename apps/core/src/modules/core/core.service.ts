import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { RedisService } from '@heidi/redis';
import { LoggerService } from '@heidi/logger';
import { PrismaCoreService } from '@heidi/prisma';
import {
  UserRole,
  ListingStatus,
  ListingModerationStatus,
  ListingSourceType,
  ListingRecurrenceFreq,
  CategoryType,
  Prisma,
} from '@prisma/client-core';
import { CoreOperationRequestDto, CoreOperationResponseDto } from '@heidi/contracts';
import { roleToNumber } from '@heidi/rbac';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CoreService implements OnModuleInit {
  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly redis: RedisService,
    private readonly prisma: PrismaCoreService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(CoreService.name);
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
    timeIntervals?: Array<{
      weekdays: string[];
      start: string;
      end: string;
      tz: string;
      freq: ListingRecurrenceFreq;
      interval: number;
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

        // Update listing fields
        await this.prisma.listing.update({
          where: { id: existing.id },
          data: {
            title: listingData.title,
            summary: listingData.summary,
            content: listingData.content,
            syncHash: listingData.syncHash,
            lastSyncedAt: new Date(),
            venueName: listingData.venueName,
            address: listingData.address,
            geoLat: listingData.geoLat ? new Prisma.Decimal(listingData.geoLat) : undefined,
            geoLng: listingData.geoLng ? new Prisma.Decimal(listingData.geoLng) : undefined,
            timezone: listingData.timezone,
            contactPhone: listingData.contactPhone,
            contactEmail: listingData.contactEmail,
            website: listingData.website,
            heroImageUrl: listingData.heroImageUrl,
          },
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
        categories:
          categoryIds.length > 0
            ? {
                create: categoryIds.map((categoryId) => ({
                  categoryId,
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

    return { action: 'created', listingId: listing.id };
  }

  /**
   * Maps Destination One item types to root category slugs and CategoryType
   * Must match the mapping in destination-one.service.ts
   */
  private readonly TYPE_TO_ROOT_CATEGORY: Record<
    string,
    { slug: string; categoryType: CategoryType }
  > = {
    Gastro: { slug: 'food-and-drink', categoryType: CategoryType.GASTRO },
    Event: { slug: 'events', categoryType: CategoryType.EVENT },
    Tour: { slug: 'tours', categoryType: CategoryType.TOUR },
    POI: { slug: 'points-of-interest', categoryType: CategoryType.POI },
    Hotel: { slug: 'hotels-and-stays', categoryType: CategoryType.HOTEL },
    Article: { slug: 'articles-and-stories', categoryType: CategoryType.ARTICLE },
  };

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async syncCategoriesFromIntegration(data: {
    cityId: string;
    categoryFacets: Array<{ type: string; field: string; value: string; label: string }>;
  }): Promise<{
    created: number;
    updated: number;
    cityCategoriesCreated: number;
    cityCategoriesUpdated: number;
  }> {
    this.logger.log(
      `Syncing categories from integration for city ${data.cityId}, ${data.categoryFacets.length} facets`,
    );

    let categoriesCreated = 0;
    let categoriesUpdated = 0;
    let cityCategoriesCreated = 0;
    let cityCategoriesUpdated = 0;

    // Group facets by type to process them together
    const facetsByType = new Map<string, Array<{ field: string; value: string; label: string }>>();
    for (const facet of data.categoryFacets) {
      if (!facetsByType.has(facet.type)) {
        facetsByType.set(facet.type, []);
      }
      facetsByType.get(facet.type)!.push(facet);
    }

    for (const [type, facets] of facetsByType.entries()) {
      const rootCategoryInfo = this.TYPE_TO_ROOT_CATEGORY[type];
      if (!rootCategoryInfo) {
        this.logger.warn(`Unknown type "${type}" in category facets, skipping`);
        continue;
      }

      // Find or create root category
      const rootCategory = await this.prisma.category.findUnique({
        where: { slug: rootCategoryInfo.slug },
      });

      if (!rootCategory) {
        this.logger.warn(
          `Root category with slug "${rootCategoryInfo.slug}" not found. Please ensure categories are seeded.`,
        );
        continue;
      }

      // Process each facet
      for (const facet of facets) {
        if (facet.field !== 'category') {
          // Only process 'category' field for now
          continue;
        }

        // Determine slug to use (automatic strategy: rootSlug + slugified facet label)
        const categorySlug = `${rootCategoryInfo.slug}-${this.slugify(facet.label)}`;

        // Upsert Category
        const category = await this.prisma.category.upsert({
          where: { slug: categorySlug },
          update: {
            name: facet.label,
            type: rootCategoryInfo.categoryType,
            parentId: rootCategory.id,
            isActive: true,
          },
          create: {
            name: facet.label,
            slug: categorySlug,
            type: rootCategoryInfo.categoryType,
            parentId: rootCategory.id,
            isActive: true,
          },
        });

        if (category.createdAt.getTime() === category.updatedAt.getTime()) {
          categoriesCreated++;
        } else {
          categoriesUpdated++;
        }

        // Check if CityCategory exists before upsert
        const existingCityCategory = await this.prisma.cityCategory.findUnique({
          where: {
            cityId_categoryId: {
              cityId: data.cityId,
              categoryId: category.id,
            },
          },
        });

        // Upsert CityCategory
        await this.prisma.cityCategory.upsert({
          where: {
            cityId_categoryId: {
              cityId: data.cityId,
              categoryId: category.id,
            },
          },
          update: {
            displayName: facet.label,
            isActive: true,
          },
          create: {
            cityId: data.cityId,
            categoryId: category.id,
            displayName: facet.label,
            isActive: true,
          },
        });

        if (!existingCityCategory) {
          cityCategoriesCreated++;
        } else {
          cityCategoriesUpdated++;
        }
      }
    }

    this.logger.log(
      `Category sync completed: ${categoriesCreated} categories created, ${categoriesUpdated} updated, ${cityCategoriesCreated} city categories created, ${cityCategoriesUpdated} updated`,
    );

    return {
      created: categoriesCreated,
      updated: categoriesUpdated,
      cityCategoriesCreated,
      cityCategoriesUpdated,
    };
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
      } else if (parking.location.latitude && parking.location.longitude) {
        // Direct lat/lng format
        latitude = parking.location.latitude;
        longitude = parking.location.longitude;
      }
    }

    if (!latitude || !longitude) {
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
    const totalSpotNumber =
      parking.totalSpotNumber ||
      parking.fourWheelerSlots?.totalSlotNumber ||
      parking.twoWheelerSlots?.totalSlotNumber ||
      parking.unclassifiedSlots?.totalSpotNumber ||
      0;

    const occupiedSpotNumber =
      parking.occupiedSpotNumber ||
      parking.fourWheelerSlots?.occupiedSlotNumber ||
      parking.twoWheelerSlots?.occupiedSlotNumber ||
      parking.unclassifiedSlots?.occupiedSpotNumber ||
      0;

    const availableSpotNumber =
      totalSpotNumber > 0 ? Math.max(0, totalSpotNumber - occupiedSpotNumber) : null;

    const occupancy =
      totalSpotNumber > 0 ? Number((occupiedSpotNumber / totalSpotNumber).toFixed(4)) : null;

    // Determine status
    let status = 'unknown';
    if (parking.status) {
      const statusLower = parking.status.toLowerCase();
      if (statusLower.includes('open') || statusLower.includes('available')) {
        status = 'open';
      } else if (statusLower.includes('closed') || statusLower.includes('unavailable')) {
        status = 'closed';
      } else {
        status = statusLower;
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
    // Check Redis cache first
    const cacheKey = `parking:spaces:${cityId}`;
    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for parking spaces: ${cityId}`);
      return cached;
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

    // Cache result for 60 seconds (matches API update interval)
    await this.redis.set(cacheKey, result, 60);

    return result;
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
