import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaCoreService } from '@heidi/prisma';
import { LoggerService } from '@heidi/logger';
import { Prisma, UserRole } from '@prisma/client-core';
import {
  CreateTileDto,
  TileCityReferenceDto,
  TileFilterDto,
  TileResponseDto,
  TileCityDto,
  UpdateTileDto,
  TileSortDirection,
} from '@heidi/contracts';
import { UserContextService } from '@heidi/rbac';
import { StorageService } from '@heidi/storage';
import { ConfigService } from '@heidi/config';

const tileWithRelations = Prisma.validator<Prisma.TileDefaultArgs>()({
  include: {
    cities: true,
  },
});

type TileWithRelations = Prisma.TileGetPayload<typeof tileWithRelations>;

@Injectable()
export class TilesService {
  constructor(
    private readonly prisma: PrismaCoreService,
    private readonly logger: LoggerService,
    private readonly userContext: UserContextService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(TilesService.name);
  }

  private isAdmin(roles: UserRole[] = []) {
    return roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.CITY_ADMIN);
  }

  private extractKeyFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Extract pathname and remove leading slash and bucket name
      // Format: /bucket-name/tiles/tileId/background.webp
      const pathname = urlObj.pathname;
      // Remove leading slash and first segment (bucket name)
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 1) {
        return parts.slice(1).join('/');
      }
      return pathname.replace(/^\/[^\/]+\//, '');
    } catch (error) {
      this.logger.warn(`Failed to parse URL: ${url}`, error);
      // Fallback: try to extract from pathname directly
      return url.split('?')[0].replace(/^https?:\/\/[^\/]+\//, '');
    }
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async ensureUniqueSlug(baseSlug: string, currentId?: string) {
    let candidate = baseSlug;
    let counter = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.tile.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing || existing.id === currentId) {
        return candidate;
      }

      candidate = `${baseSlug}-${counter++}`;
    }
  }

  private mapTile(tile: TileWithRelations): TileResponseDto {
    return {
      id: tile.id,
      slug: tile.slug,
      backgroundImageUrl: tile.backgroundImageUrl,
      iconImageUrl: tile.iconImageUrl,
      headerBackgroundColor: tile.headerBackgroundColor,
      header: tile.header,
      subheader: tile.subheader,
      description: tile.description,
      contentBackgroundColor: tile.contentBackgroundColor,
      websiteUrl: tile.websiteUrl,
      openInExternalBrowser: tile.openInExternalBrowser,
      displayOrder: tile.displayOrder,
      isActive: tile.isActive,
      publishAt: tile.publishAt?.toISOString() ?? null,
      expireAt: tile.expireAt?.toISOString() ?? null,
      createdByUserId: tile.createdByUserId,
      lastEditedByUserId: tile.lastEditedByUserId,
      createdAt: tile.createdAt.toISOString(),
      updatedAt: tile.updatedAt.toISOString(),
      cities: tile.cities.map<TileCityDto>((city) => ({
        id: city.id,
        cityId: city.cityId,
        isPrimary: city.isPrimary,
        displayOrder: city.displayOrder,
      })),
    };
  }

  private async syncTileCities(
    tx: Prisma.TransactionClient,
    tileId: string,
    cities?: TileCityReferenceDto[],
  ) {
    if (cities === undefined) {
      return;
    }

    if (!cities.length) {
      await tx.tileCity.deleteMany({ where: { tileId } });
      return;
    }

    const cityIds = cities.map((city) => city.cityId);

    await tx.tileCity.deleteMany({
      where: {
        tileId,
        cityId: {
          notIn: cityIds,
        },
      },
    });

    await Promise.all(
      cities.map((city, index) =>
        tx.tileCity.upsert({
          where: {
            tileId_cityId: {
              tileId,
              cityId: city.cityId,
            },
          },
          update: {
            isPrimary: city.isPrimary ?? index === 0,
            displayOrder: city.displayOrder ?? index,
          },
          create: {
            ...(city.id ? { id: city.id } : {}),
            tileId,
            cityId: city.cityId,
            isPrimary: city.isPrimary ?? index === 0,
            displayOrder: city.displayOrder ?? index,
          },
        }),
      ),
    );
  }

  async createTile(
    userId: string,
    roles: UserRole[],
    dto: CreateTileDto,
  ): Promise<TileResponseDto> {
    if (!this.isAdmin(roles)) {
      throw new ForbiddenException('Only admins can create tiles');
    }

    // Validate city access for CITY_ADMIN
    if (roles.includes(UserRole.CITY_ADMIN) && !roles.includes(UserRole.SUPER_ADMIN)) {
      if (!dto.cities || dto.cities.length === 0) {
        throw new ForbiddenException('City admins must specify at least one city');
      }

      const managedCities = await this.userContext.getUserManagedCities(userId);
      const requestedCityIds = dto.cities.map((c) => c.cityId);

      // If managedCities is empty, user is SUPER_ADMIN (shouldn't happen here, but check anyway)
      if (managedCities.length > 0) {
        const hasAccess = requestedCityIds.every((cityId) => managedCities.includes(cityId));
        if (!hasAccess) {
          throw new ForbiddenException(
            'You do not have access to create tiles for one or more specified cities',
          );
        }
      }
    }

    // Generate slug from header (slug is auto-generated, not provided during creation)
    const baseSlug = this.slugify(dto.header) || this.slugify(`tile-${Date.now()}`);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const data: Prisma.TileCreateInput = {
      slug,
      headerBackgroundColor: dto.headerBackgroundColor,
      header: dto.header,
      subheader: dto.subheader,
      description: dto.description,
      contentBackgroundColor: dto.contentBackgroundColor,
      websiteUrl: dto.websiteUrl,
      openInExternalBrowser: dto.openInExternalBrowser ?? false,
      displayOrder: dto.displayOrder ?? 0,
      isActive: dto.isActive ?? true,
      // publishAt and expireAt are not set during creation
      createdByUserId: userId,
      lastEditedByUserId: userId,
      cities: dto.cities?.length
        ? {
            create: dto.cities.map((city, index) => ({
              // id is not provided during creation (TileCity IDs are auto-generated)
              cityId: city.cityId,
              isPrimary: city.isPrimary ?? index === 0,
              displayOrder: city.displayOrder ?? index,
            })),
          }
        : undefined,
    };

    const tile = await this.prisma.tile.create({
      data,
      include: tileWithRelations.include,
    });

    return this.mapTile(tile);
  }

  async updateTile(
    tileId: string,
    userId: string,
    roles: UserRole[],
    dto: UpdateTileDto,
  ): Promise<TileResponseDto> {
    if (!this.isAdmin(roles)) {
      throw new ForbiddenException('Only admins can update tiles');
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.tile.findUnique({
        where: { id: tileId },
        include: { cities: true },
      });

      if (!existing) {
        throw new NotFoundException('Tile not found');
      }

      // Validate city access for CITY_ADMIN
      if (roles.includes(UserRole.CITY_ADMIN) && !roles.includes(UserRole.SUPER_ADMIN)) {
        const managedCities = await this.userContext.getUserManagedCities(userId);

        // Check access to existing cities
        if (existing.cities.length > 0) {
          const existingCityIds = existing.cities.map((c) => c.cityId);
          if (managedCities.length > 0) {
            const hasAccess = existingCityIds.every((cityId) => managedCities.includes(cityId));
            if (!hasAccess) {
              throw new ForbiddenException('You do not have access to update this tile');
            }
          }
        }

        // Check access to new cities if being updated
        if (dto.cities && dto.cities.length > 0) {
          const requestedCityIds = dto.cities.map((c) => c.cityId);
          if (managedCities.length > 0) {
            const hasAccess = requestedCityIds.every((cityId) => managedCities.includes(cityId));
            if (!hasAccess) {
              throw new ForbiddenException(
                'You do not have access to assign tiles to one or more specified cities',
              );
            }
          }
        }
      }

      const updateData: Prisma.TileUpdateInput = {
        lastEditedByUserId: userId,
      };

      if (dto.slug !== undefined) {
        const slug = await this.ensureUniqueSlug(this.slugify(dto.slug), tileId);
        updateData.slug = slug;
      }

      if (dto.headerBackgroundColor !== undefined) {
        updateData.headerBackgroundColor = dto.headerBackgroundColor;
      }

      if (dto.header !== undefined) {
        updateData.header = dto.header;
      }

      if (dto.subheader !== undefined) {
        updateData.subheader = dto.subheader;
      }

      if (dto.description !== undefined) {
        updateData.description = dto.description;
      }

      if (dto.contentBackgroundColor !== undefined) {
        updateData.contentBackgroundColor = dto.contentBackgroundColor;
      }

      if (dto.websiteUrl !== undefined) {
        updateData.websiteUrl = dto.websiteUrl;
      }

      if (dto.openInExternalBrowser !== undefined) {
        updateData.openInExternalBrowser = dto.openInExternalBrowser;
      }

      if (dto.displayOrder !== undefined) {
        updateData.displayOrder = dto.displayOrder;
      }

      if (dto.isActive !== undefined) {
        updateData.isActive = dto.isActive;
      }

      if (dto.publishAt !== undefined) {
        updateData.publishAt = dto.publishAt ? new Date(dto.publishAt) : null;
      }

      if (dto.expireAt !== undefined) {
        updateData.expireAt = dto.expireAt ? new Date(dto.expireAt) : null;
      }

      await tx.tile.update({
        where: { id: tileId },
        data: updateData,
      });

      await this.syncTileCities(tx, tileId, dto.cities);

      const refreshed = await tx.tile.findUnique({
        where: { id: tileId },
        include: tileWithRelations.include,
      });

      if (!refreshed) {
        throw new NotFoundException('Tile not found after update');
      }

      return this.mapTile(refreshed);
    });
  }

  async getTileById(tileId: string): Promise<TileResponseDto> {
    const tile = await this.prisma.tile.findUnique({
      where: { id: tileId },
      include: tileWithRelations.include,
    });

    if (!tile) {
      throw new NotFoundException('Tile not found');
    }

    return this.mapTile(tile);
  }

  async getTileBySlug(slug: string): Promise<TileResponseDto> {
    const tile = await this.prisma.tile.findUnique({
      where: { slug },
      include: tileWithRelations.include,
    });

    if (!tile) {
      throw new NotFoundException('Tile not found');
    }

    return this.mapTile(tile);
  }

  private buildTileWhere(filter: TileFilterDto = {} as TileFilterDto): Prisma.TileWhereInput {
    const where: Prisma.TileWhereInput = {};
    const andConditions: Prisma.TileWhereInput[] = [];

    // Search filter - search in header, subheader, and description
    if (filter.search) {
      const searchTerm = filter.search.trim();
      if (searchTerm) {
        andConditions.push({
          OR: [
            { header: { contains: searchTerm, mode: 'insensitive' } },
            { subheader: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        });
      }
    }

    if (filter.cityIds?.length) {
      where.cities = {
        some: {
          cityId: {
            in: filter.cityIds,
          },
        },
      };
    }

    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter.publishAfter || filter.publishBefore) {
      andConditions.push({
        publishAt: {
          ...(filter.publishAfter ? { gte: new Date(filter.publishAfter) } : {}),
          ...(filter.publishBefore ? { lte: new Date(filter.publishBefore) } : {}),
        },
      });
    }

    if (filter.expireAfter || filter.expireBefore) {
      andConditions.push({
        expireAt: {
          ...(filter.expireAfter ? { gte: new Date(filter.expireAfter) } : {}),
          ...(filter.expireBefore ? { lte: new Date(filter.expireBefore) } : {}),
        },
      });
    }

    if (andConditions.length) {
      where.AND = andConditions;
    }

    return where;
  }

  async listTiles(filter: TileFilterDto = {} as TileFilterDto) {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const pageSizeCandidate = filter.pageSize && filter.pageSize > 0 ? filter.pageSize : 20;
    const pageSize = Math.min(pageSizeCandidate, 100);
    const skip = (page - 1) * pageSize;
    const where = this.buildTileWhere(filter);

    const allowedSortFields = new Set(['createdAt', 'updatedAt', 'publishAt', 'displayOrder']);
    const sortByField =
      filter.sortBy && allowedSortFields.has(filter.sortBy) ? filter.sortBy : 'displayOrder';
    const sortDirection = filter.sortDirection ?? TileSortDirection.ASC;

    const orderBy: Prisma.TileOrderByWithRelationInput = {};
    (orderBy as Record<string, unknown>)[sortByField] = sortDirection;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.tile.findMany({
        where,
        include: tileWithRelations.include,
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prisma.tile.count({ where }),
    ]);

    const items = rows.map((row) => this.mapTile(row));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async deleteTile(tileId: string, userId: string, roles: UserRole[]): Promise<void> {
    if (!this.isAdmin(roles)) {
      throw new ForbiddenException('Only admins can delete tiles');
    }

    const existing = await this.prisma.tile.findUnique({
      where: { id: tileId },
      include: { cities: true },
    });

    if (!existing) {
      throw new NotFoundException('Tile not found');
    }

    // Validate city access for CITY_ADMIN
    if (roles.includes(UserRole.CITY_ADMIN) && !roles.includes(UserRole.SUPER_ADMIN)) {
      const managedCities = await this.userContext.getUserManagedCities(userId);
      if (existing.cities.length > 0) {
        const existingCityIds = existing.cities.map((c) => c.cityId);
        if (managedCities.length > 0) {
          const hasAccess = existingCityIds.every((cityId) => managedCities.includes(cityId));
          if (!hasAccess) {
            throw new ForbiddenException('You do not have access to delete this tile');
          }
        }
      }
    }

    // Delete background image from storage if exists
    if (existing.backgroundImageUrl) {
      try {
        const key = this.extractKeyFromUrl(existing.backgroundImageUrl);
        const bucket = this.configService.storageConfig.defaultBucket;
        if (bucket) {
          await this.storageService.deleteFile({ bucket, key });
        }
      } catch (error) {
        this.logger.warn(`Failed to delete background image for tile ${tileId}`, error);
        // Don't fail the delete operation if file cleanup fails
      }
    }

    // Delete icon image from storage if exists
    if (existing.iconImageUrl) {
      try {
        const key = this.extractKeyFromUrl(existing.iconImageUrl);
        const bucket = this.configService.storageConfig.defaultBucket;
        if (bucket) {
          await this.storageService.deleteFile({ bucket, key });
        }
      } catch (error) {
        this.logger.warn(`Failed to delete icon image for tile ${tileId}`, error);
        // Don't fail the delete operation if file cleanup fails
      }
    }

    await this.prisma.tile.delete({
      where: { id: tileId },
    });
  }
}
