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
  Prisma,
} from '@prisma/client-core';
import { CoreOperationRequestDto, CoreOperationResponseDto } from '@heidi/contracts';

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

  async assignCityAdmin(userId: string, cityId: string) {
    this.logger.log(`Assigning city admin: userId=${userId}, cityId=${cityId}`);

    const assignment = await this.prisma.userCityAssignment.upsert({
      where: {
        userId_cityId: {
          userId,
          cityId,
        },
      },
      update: {
        role: UserRole.CITY_ADMIN,
        canManageAdmins: true,
        isActive: true,
      },
      create: {
        userId,
        cityId,
        role: UserRole.CITY_ADMIN,
        canManageAdmins: true,
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
}
