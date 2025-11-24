import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaCoreService } from '@heidi/prisma';
import { LoggerService } from '@heidi/logger';
import { StorageService } from '@heidi/storage';
import { ConfigService } from '@heidi/config';
import { TranslationService } from '@heidi/translations';
import { I18nService } from '@heidi/i18n';
import {
  Prisma,
  ListingMediaType,
  ListingModerationStatus,
  ListingRecurrenceFreq,
  ListingSourceType,
  ListingStatus,
  ListingVisibility,
  UserRole,
} from '@prisma/client-core';
import {
  CreateListingDto,
  ListingCategoryDto,
  ListingCategoryReferenceDto,
  ListingCityDto,
  ListingCityReferenceDto,
  ListingFilterDto,
  ListingMediaDto,
  ListingMediaInputDto,
  ListingModerationActionDto,
  ListingModerationDto,
  ListingResponseDto,
  ListingTimeIntervalDto,
  ListingTimeIntervalExceptionDto,
  ListingTimeIntervalExceptionInputDto,
  ListingTimeIntervalInputDto,
  UpdateListingDto,
  Weekday,
} from '@heidi/contracts';

const listingWithRelations = Prisma.validator<Prisma.ListingDefaultArgs>()({
  include: {
    categories: {
      include: {
        category: true,
      },
    },
    cities: true,
    media: true,
    timeIntervals: true,
    timeIntervalExceptions: true,
    tags: {
      include: {
        tag: true,
      },
    },
  },
});

type ListingWithRelations = Prisma.ListingGetPayload<typeof listingWithRelations>;

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaCoreService,
    private readonly logger: LoggerService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
    private readonly translationService: TranslationService,
    private readonly i18nService: I18nService,
  ) {
    this.logger.setContext(ListingsService.name);
  }

  private isAdmin(roles: UserRole[] = []) {
    return roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.CITY_ADMIN);
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
      const existing = await this.prisma.listing.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing || existing.id === currentId) {
        return candidate;
      }

      candidate = `${baseSlug}-${counter++}`;
    }
  }

  private toNumber(value?: Prisma.Decimal | number | null) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'number') {
      return value;
    }

    return Number(value);
  }

  private toJson(value?: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }

    return value as Prisma.InputJsonValue;
  }

  private deriveEventDatesFromIntervals(intervals?: ListingTimeIntervalInputDto[]): {
    start?: Date | null;
    end?: Date | null;
  } {
    if (!intervals || intervals.length === 0) {
      return { start: null, end: null };
    }

    const starts = intervals.map((interval) => new Date(interval.start).getTime());
    const ends = intervals.map((interval) => new Date(interval.end).getTime());

    return {
      start: new Date(Math.min(...starts)),
      end: new Date(Math.max(...ends)),
    };
  }

  private mapListing(
    listing: ListingWithRelations,
    options: { isFavorite?: boolean } = {},
  ): ListingResponseDto {
    const isFavorite = options.isFavorite ?? false;
    return {
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      summary: listing.summary,
      content: listing.content,
      status: listing.status,
      moderationStatus: listing.moderationStatus,
      visibility: listing.visibility,
      isFeatured: listing.isFeatured,
      featuredUntil: listing.featuredUntil?.toISOString() ?? null,
      publishAt: listing.publishAt?.toISOString() ?? null,
      expireAt: listing.expireAt?.toISOString() ?? null,
      languageCode: listing.languageCode,
      sourceUrl: listing.sourceUrl,
      heroImageUrl: listing.heroImageUrl,
      metadata: listing.metadata as Record<string, unknown> | null,
      viewCount: listing.viewCount,
      likeCount: listing.likeCount,
      shareCount: listing.shareCount,
      isFavorite,
      createdByUserId: listing.createdByUserId,
      lastEditedByUserId: listing.lastEditedByUserId,
      reviewedBy: listing.reviewedBy,
      reviewedAt: listing.reviewedAt?.toISOString() ?? null,
      reviewNotes: listing.reviewNotes,
      sourceType: listing.sourceType,
      externalSource: listing.externalSource,
      externalId: listing.externalId,
      syncHash: listing.syncHash,
      contentChecksum: listing.contentChecksum,
      lastSyncedAt: listing.lastSyncedAt?.toISOString() ?? null,
      ingestedAt: listing.ingestedAt?.toISOString() ?? null,
      ingestedByService: listing.ingestedByService,
      ingestNotes: listing.ingestNotes,
      primaryCityId: listing.primaryCityId,
      venueName: listing.venueName,
      address: listing.address,
      geoLat: this.toNumber(listing.geoLat),
      geoLng: this.toNumber(listing.geoLng),
      timezone: listing.timezone,
      contactPhone: listing.contactPhone,
      contactEmail: listing.contactEmail,
      website: listing.website,
      eventStart: listing.eventStart?.toISOString() ?? null,
      eventEnd: listing.eventEnd?.toISOString() ?? null,
      isAllDay: listing.isAllDay,
      organizerName: listing.organizerName,
      organizerContact: listing.organizerContact,
      registrationUrl: listing.registrationUrl,
      isArchived: listing.isArchived,
      archivedAt: listing.archivedAt?.toISOString() ?? null,
      archivedBy: listing.archivedBy,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
      categories: listing.categories.map<ListingCategoryDto>((category) => ({
        id: category.id,
        categoryId: category.categoryId,
        name: category.category?.name,
        slug: category.category?.slug,
        type: category.category?.type ?? null,
      })),
      cities: listing.cities.map<ListingCityDto>((city) => ({
        id: city.id,
        cityId: city.cityId,
        isPrimary: city.isPrimary,
        displayOrder: city.displayOrder,
      })),
      media: listing.media
        .sort((a, b) => a.order - b.order)
        .map<ListingMediaDto>((media) => ({
          id: media.id,
          type: media.type,
          url: media.url,
          altText: media.altText,
          caption: media.caption,
          order: media.order,
          metadata: media.metadata as Record<string, unknown> | null,
        })),
      timeIntervals: listing.timeIntervals
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .map<ListingTimeIntervalDto>((interval) => ({
          id: interval.id,
          weekdays: (interval.weekdays as unknown as Weekday[]) ?? undefined,
          start: interval.start.toISOString(),
          end: interval.end.toISOString(),
          tz: interval.tz,
          freq: interval.freq,
          interval: interval.interval,
          repeatUntil: interval.repeatUntil?.toISOString() ?? null,
          metadata: interval.metadata as Record<string, unknown> | null,
        })),
      timeIntervalExceptions: listing.timeIntervalExceptions
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map<ListingTimeIntervalExceptionDto>((exception) => ({
          id: exception.id,
          date: exception.date.toISOString(),
          opensAt: exception.opensAt,
          closesAt: exception.closesAt,
          isClosed: exception.isClosed,
          metadata: exception.metadata as Record<string, unknown> | null,
        })),
      tags:
        listing.tags?.map((listingTag) => ({
          id: listingTag.id,
          tagId: listingTag.tagId,
          provider: listingTag.tag?.provider ?? '',
          externalValue: listingTag.tag?.externalValue ?? '',
          label: listingTag.tag?.label ?? null,
          languageCode: listingTag.tag?.languageCode ?? null,
        })) ?? [],
    };
  }

  /**
   * Apply translations to listing fields based on current request language
   */
  private async applyListingTranslations(
    listing: ListingWithRelations,
    dto: ListingResponseDto,
  ): Promise<ListingResponseDto> {
    const locale = this.i18nService.getLanguage();
    const defaultLocale = this.configService.get<string>('i18n.defaultLanguage', 'en');

    // Get source language from listing
    const listingSourceLocale =
      listing.languageCode || this.configService.get<string>('i18n.defaultLanguage', 'en');

    // If no locale requested, or locale matches listing's source language, return original DTO
    // (no translation needed if the requested language is the same as the listing's original language)
    if (!locale || locale === listingSourceLocale) {
      return dto;
    }

    const [title, summary, content] = await Promise.all([
      this.translationService.getTranslation(
        'listing',
        listing.id,
        'title',
        locale,
        dto.title,
        listingSourceLocale,
      ),
      this.translationService.getTranslation(
        'listing',
        listing.id,
        'summary',
        locale,
        dto.summary ?? '',
        listingSourceLocale,
      ),
      this.translationService.getTranslation(
        'listing',
        listing.id,
        'content',
        locale,
        dto.content,
        listingSourceLocale,
      ),
    ]);

    // Translate tag labels using shared Tag translations (one Translation per tag)
    let translatedTags = dto.tags;
    if (listing.tags && listing.tags.length > 0) {
      translatedTags = await Promise.all(
        listing.tags.map(async (listingTag, index) => {
          const tag = listingTag.tag;
          if (!tag) {
            return (
              dto.tags?.[index] ?? {
                id: listingTag.id,
                tagId: listingTag.tagId,
                provider: '',
                externalValue: '',
                label: null,
                languageCode: null,
              }
            );
          }

          const tagSourceLocale = tag.languageCode || defaultLocale;
          const fallbackLabel = tag.label || tag.externalValue;

          // Only translate tag if requested locale differs from tag's source locale
          // If locale matches tag's source language, use original label (no translation needed)
          let label = fallbackLabel;
          if (locale && locale !== tagSourceLocale) {
            label = await this.translationService.getTranslation(
              'tag',
              tag.id,
              'label',
              locale,
              fallbackLabel,
              tagSourceLocale,
            );
          }

          return {
            id: listingTag.id,
            tagId: tag.id,
            provider: tag.provider,
            externalValue: tag.externalValue,
            label,
            languageCode: tagSourceLocale,
          };
        }),
      );
    }

    return {
      ...dto,
      title,
      summary,
      content,
      tags: translatedTags,
    };
  }

  private async getFavoriteListingIds(userId: string, listingIds: string[]): Promise<Set<string>> {
    if (!listingIds.length) {
      return new Set();
    }

    const favorites = await this.prisma.userFavorite.findMany({
      where: {
        userId,
        listingId: {
          in: listingIds,
        },
      },
      select: { listingId: true },
    });

    return new Set(favorites.map((favorite) => favorite.listingId));
  }

  private async syncListingCategories(
    tx: Prisma.TransactionClient,
    listingId: string,
    categories?: ListingCategoryReferenceDto[],
  ) {
    if (categories === undefined) {
      return;
    }

    if (!categories.length) {
      await tx.listingCategory.deleteMany({ where: { listingId } });
      return;
    }

    const categoryIds = categories.map((category) => category.categoryId);

    await tx.listingCategory.deleteMany({
      where: {
        listingId,
        categoryId: {
          notIn: categoryIds,
        },
      },
    });

    await Promise.all(
      categories.map((category) =>
        tx.listingCategory.upsert({
          where: {
            listingId_categoryId: {
              listingId,
              categoryId: category.categoryId,
            },
          },
          update: {},
          create: {
            ...(category.id ? { id: category.id } : {}),
            listingId,
            categoryId: category.categoryId,
          },
        }),
      ),
    );
  }

  private async syncListingCities(
    tx: Prisma.TransactionClient,
    listingId: string,
    cities?: ListingCityReferenceDto[],
  ) {
    if (cities === undefined) {
      return;
    }

    if (!cities.length) {
      await tx.listingCity.deleteMany({ where: { listingId } });
      return;
    }

    const cityIds = cities.map((city) => city.cityId);

    await tx.listingCity.deleteMany({
      where: {
        listingId,
        cityId: {
          notIn: cityIds,
        },
      },
    });

    await Promise.all(
      cities.map((city, index) =>
        tx.listingCity.upsert({
          where: {
            listingId_cityId: {
              listingId,
              cityId: city.cityId,
            },
          },
          update: {
            isPrimary: city.isPrimary ?? index === 0,
            displayOrder: city.displayOrder ?? index,
          },
          create: {
            ...(city.id ? { id: city.id } : {}),
            listingId,
            cityId: city.cityId,
            isPrimary: city.isPrimary ?? index === 0,
            displayOrder: city.displayOrder ?? index,
          },
        }),
      ),
    );
  }

  private async syncListingMedia(
    tx: Prisma.TransactionClient,
    listingId: string,
    mediaItems?: ListingMediaInputDto[],
  ) {
    if (mediaItems === undefined) {
      return;
    }

    if (!mediaItems.length) {
      await tx.listingMedia.deleteMany({ where: { listingId } });
      return;
    }

    const mediaIds = mediaItems.filter((item) => item.id).map((item) => item.id as string);

    if (mediaIds.length) {
      await tx.listingMedia.deleteMany({
        where: {
          listingId,
          id: {
            notIn: mediaIds,
          },
        },
      });
    } else {
      await tx.listingMedia.deleteMany({ where: { listingId } });
    }

    await Promise.all(
      mediaItems.map((media, index) => {
        if (media.id) {
          return tx.listingMedia.update({
            where: { id: media.id },
            data: {
              type: media.type,
              url: media.url,
              altText: media.altText,
              caption: media.caption,
              order: media.order ?? index,
              metadata: this.toJson(media.metadata),
            },
          });
        }

        return tx.listingMedia.create({
          data: {
            listingId,
            type: media.type,
            url: media.url,
            altText: media.altText,
            caption: media.caption,
            order: media.order ?? index,
            metadata: this.toJson(media.metadata),
          },
        });
      }),
    );
  }

  /**
   * Create a single listing media record
   */
  async createListingMedia(
    listingId: string,
    media: {
      type: ListingMediaType;
      url: string;
      altText?: string;
      caption?: string;
      order?: number;
      metadata?: any;
    },
  ): Promise<ListingMediaDto> {
    const created = await this.prisma.listingMedia.create({
      data: {
        listingId,
        type: media.type,
        url: media.url,
        altText: media.altText,
        caption: media.caption,
        order: media.order ?? 0,
        metadata: this.toJson(media.metadata),
      },
    });

    return this.mapListingMedia(created);
  }

  async deleteListingMedia(
    listingId: string,
    mediaId: string,
    _userId: string,
    _roles: UserRole[],
  ): Promise<void> {
    // Verify listing exists
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Get media record
    const media = await this.prisma.listingMedia.findFirst({
      where: { id: mediaId, listingId },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Delete file from storage
    try {
      const key = this.extractKeyFromUrl(media.url);
      const bucket = this.configService.storageConfig.defaultBucket;
      if (bucket) {
        await this.storageService.deleteFile({ bucket, key });
      }
    } catch (error) {
      this.logger.warn(`Failed to delete media file ${mediaId}`, error);
    }

    // Delete DB record
    await this.prisma.listingMedia.delete({
      where: { id: mediaId },
    });
  }

  private extractKeyFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Extract pathname and remove leading slash and bucket name
      // Format: /bucket-name/listings/listingId/media/file.ext
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

  private mapListingMedia(media: any): ListingMediaDto {
    return {
      id: media.id,
      type: media.type,
      url: media.url,
      altText: media.altText,
      caption: media.caption,
      order: media.order,
      metadata: media.metadata as Record<string, unknown> | null,
    };
  }

  private async syncListingTimeIntervals(
    tx: Prisma.TransactionClient,
    listingId: string,
    intervals?: ListingTimeIntervalInputDto[],
  ) {
    if (intervals === undefined) {
      return;
    }

    if (!intervals.length) {
      await tx.listingTimeInterval.deleteMany({ where: { listingId } });
      return;
    }

    const intervalIds = intervals
      .filter((interval) => interval.id)
      .map((interval) => interval.id as string);

    if (intervalIds.length) {
      await tx.listingTimeInterval.deleteMany({
        where: {
          listingId,
          id: {
            notIn: intervalIds,
          },
        },
      });
    } else {
      await tx.listingTimeInterval.deleteMany({ where: { listingId } });
    }

    await Promise.all(
      intervals.map((interval) => {
        const payload = {
          weekdays: interval.weekdays ?? [],
          start: new Date(interval.start),
          end: new Date(interval.end),
          tz: interval.tz,
          freq: interval.freq ?? ListingRecurrenceFreq.NONE,
          interval: interval.interval ?? 1,
          repeatUntil: interval.repeatUntil ? new Date(interval.repeatUntil) : null,
          metadata: this.toJson(interval.metadata),
        };

        if (interval.id) {
          return tx.listingTimeInterval.update({
            where: { id: interval.id },
            data: payload,
          });
        }

        return tx.listingTimeInterval.create({
          data: {
            listingId,
            ...payload,
          },
        });
      }),
    );
  }

  private async syncListingTimeIntervalExceptions(
    tx: Prisma.TransactionClient,
    listingId: string,
    exceptions?: ListingTimeIntervalExceptionInputDto[],
  ) {
    if (exceptions === undefined) {
      return;
    }

    if (!exceptions.length) {
      await tx.listingTimeIntervalException.deleteMany({ where: { listingId } });
      return;
    }

    const exceptionIds = exceptions
      .filter((exception) => exception.id)
      .map((exception) => exception.id as string);

    if (exceptionIds.length) {
      await tx.listingTimeIntervalException.deleteMany({
        where: {
          listingId,
          id: {
            notIn: exceptionIds,
          },
        },
      });
    } else {
      await tx.listingTimeIntervalException.deleteMany({ where: { listingId } });
    }

    await Promise.all(
      exceptions.map((exception) => {
        const payload = {
          date: new Date(exception.date),
          opensAt: exception.opensAt,
          closesAt: exception.closesAt,
          isClosed: exception.isClosed ?? false,
          metadata: this.toJson(exception.metadata),
        };

        if (exception.id) {
          return tx.listingTimeIntervalException.update({
            where: { id: exception.id },
            data: payload,
          });
        }

        return tx.listingTimeIntervalException.create({
          data: {
            listingId,
            ...payload,
          },
        });
      }),
    );
  }

  async createListing(
    userId: string,
    roles: UserRole[],
    dto: CreateListingDto,
  ): Promise<ListingResponseDto> {
    const isAdmin = this.isAdmin(roles);
    // Generate slug from title (slug is auto-generated, not provided during creation)
    const baseSlug = this.slugify(dto.title) || this.slugify(`listing-${Date.now()}`);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const visibility = isAdmin
      ? (dto.visibility ?? ListingVisibility.PUBLIC)
      : ListingVisibility.PUBLIC;
    const sourceType = dto.sourceType ?? ListingSourceType.MANUAL;
    const isFeatured = isAdmin ? (dto.isFeatured ?? false) : false;
    const publishAt = isAdmin && dto.publishAt ? new Date(dto.publishAt) : undefined;
    const expireAt = isAdmin && dto.expireAt ? new Date(dto.expireAt) : undefined;
    const featuredUntil = isAdmin && dto.featuredUntil ? new Date(dto.featuredUntil) : undefined;
    const primaryCity =
      dto.cities?.find((city) => city.isPrimary) ??
      (dto.cities && dto.cities.length > 0 ? { cityId: dto.cities[0].cityId } : undefined);

    // Determine source language: use provided languageCode, or fall back to current request language, or default
    const sourceLanguage =
      dto.languageCode ||
      this.i18nService.getLanguage() ||
      this.configService.get<string>('i18n.defaultLanguage', 'en');

    const data: Prisma.ListingCreateInput = {
      slug,
      title: dto.title,
      summary: dto.summary,
      content: dto.content,
      status: ListingStatus.PENDING,
      moderationStatus: ListingModerationStatus.PENDING,
      visibility,
      isFeatured,
      featuredUntil,
      publishAt,
      expireAt,
      languageCode: sourceLanguage,
      sourceUrl: dto.sourceUrl,
      metadata: this.toJson(dto.metadata),
      createdByUserId: userId,
      lastEditedByUserId: userId,
      reviewedBy: undefined,
      reviewedAt: undefined,
      reviewNotes: undefined,
      sourceType,
      externalSource: isAdmin ? dto.externalSource : undefined,
      externalId: isAdmin ? dto.externalId : undefined,
      syncHash: isAdmin ? dto.syncHash : undefined,
      contentChecksum: isAdmin ? dto.contentChecksum : undefined,
      lastSyncedAt: isAdmin && dto.lastSyncedAt ? new Date(dto.lastSyncedAt) : undefined,
      ingestedAt: isAdmin && dto.ingestedAt ? new Date(dto.ingestedAt) : undefined,
      ingestedByService: isAdmin ? dto.ingestedByService : undefined,
      ingestNotes: isAdmin ? dto.ingestNotes : undefined,
      primaryCityId: primaryCity?.cityId,
      venueName: dto.venueName,
      address: dto.address,
      geoLat: dto.geoLat !== undefined ? new Prisma.Decimal(dto.geoLat) : undefined,
      geoLng: dto.geoLng !== undefined ? new Prisma.Decimal(dto.geoLng) : undefined,
      timezone: dto.timezone,
      contactPhone: dto.contactPhone,
      contactEmail: dto.contactEmail,
      website: dto.website,
      eventStart: dto.eventStart ? new Date(dto.eventStart) : undefined,
      eventEnd: dto.eventEnd ? new Date(dto.eventEnd) : undefined,
      isAllDay: dto.isAllDay ?? false,
      organizerName: dto.organizerName,
      organizerContact: dto.organizerContact,
      registrationUrl: dto.registrationUrl,
      isArchived: false,
      archivedAt: undefined,
      archivedBy: undefined,
      categories: dto.categories?.length
        ? {
            create: dto.categories.map((category) => ({
              // id is not provided during creation (ListingCategory IDs are auto-generated)
              category: {
                connect: {
                  id: category.categoryId,
                },
              },
            })),
          }
        : undefined,
      cities: dto.cities?.length
        ? {
            create: dto.cities.map((city, index) => ({
              // id is not provided during creation (ListingCity IDs are auto-generated)
              cityId: city.cityId,
              isPrimary: city.isPrimary ?? index === 0,
              displayOrder: city.displayOrder ?? index,
            })),
          }
        : undefined,
      timeIntervals: dto.timeIntervals?.length
        ? {
            create: dto.timeIntervals.map((interval) => ({
              // id is not provided during creation (ListingTimeInterval IDs are auto-generated)
              weekdays: interval.weekdays ?? [],
              start: new Date(interval.start),
              end: new Date(interval.end),
              tz: interval.tz,
              freq: interval.freq ?? ListingRecurrenceFreq.NONE,
              interval: interval.interval ?? 1,
              repeatUntil: interval.repeatUntil ? new Date(interval.repeatUntil) : undefined,
              metadata: this.toJson(interval.metadata),
            })),
          }
        : undefined,
      timeIntervalExceptions: dto.timeIntervalExceptions?.length
        ? {
            create: dto.timeIntervalExceptions.map((exception) => ({
              // id is not provided during creation (ListingTimeIntervalException IDs are auto-generated)
              date: new Date(exception.date),
              opensAt: exception.opensAt,
              closesAt: exception.closesAt,
              isClosed: exception.isClosed ?? false,
              metadata: this.toJson(exception.metadata),
            })),
          }
        : undefined,
    };

    // Auto-generate eventStart/eventEnd from timeIntervals if not explicitly provided
    if (
      dto.eventStart === undefined &&
      dto.eventEnd === undefined &&
      dto.timeIntervals &&
      dto.timeIntervals.length > 0
    ) {
      const derivedDates = this.deriveEventDatesFromIntervals(dto.timeIntervals);
      data.eventStart = derivedDates.start ?? undefined;
      data.eventEnd = derivedDates.end ?? undefined;
    }

    const listing = await this.prisma.listing.create({
      data,
      include: listingWithRelations.include,
    });

    const listingDto = this.mapListing(listing);
    return this.applyListingTranslations(listing, listingDto);
  }

  async updateListing(listingId: string, userId: string, roles: UserRole[], dto: UpdateListingDto) {
    const isAdmin = this.isAdmin(roles);
    const slug = dto.slug
      ? await this.ensureUniqueSlug(this.slugify(dto.slug), listingId)
      : undefined;
    const primaryCity =
      dto.cities?.find((city) => city.isPrimary) ??
      (dto.cities && dto.cities.length > 0 ? { cityId: dto.cities[0].cityId } : undefined);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.listing.findUnique({
        where: { id: listingId },
      });

      if (!existing) {
        throw new NotFoundException('Listing not found');
      }

      if (!isAdmin && existing.createdByUserId !== userId) {
        throw new ForbiddenException('You can only update listings you created');
      }

      const updateData: Prisma.ListingUpdateInput = {
        lastEditedByUserId: userId,
      };

      if (slug) {
        updateData.slug = slug;
      }

      if (dto.title !== undefined) {
        updateData.title = dto.title;
      }

      if (dto.summary !== undefined) {
        updateData.summary = dto.summary;
      }

      if (dto.content !== undefined) {
        updateData.content = dto.content;
      }

      if (dto.languageCode !== undefined) {
        updateData.languageCode = dto.languageCode;
      } else if (!existing.languageCode) {
        // If no languageCode exists and none provided, set from current request language
        const sourceLanguage =
          this.i18nService.getLanguage() ||
          this.configService.get<string>('i18n.defaultLanguage', 'en');
        updateData.languageCode = sourceLanguage;
      }

      if (dto.sourceUrl !== undefined) {
        updateData.sourceUrl = dto.sourceUrl;
      }

      if (dto.metadata !== undefined) {
        updateData.metadata = this.toJson(dto.metadata);
      }

      if (dto.venueName !== undefined) {
        updateData.venueName = dto.venueName;
      }

      if (dto.address !== undefined) {
        updateData.address = dto.address;
      }

      if (dto.geoLat !== undefined) {
        updateData.geoLat = new Prisma.Decimal(dto.geoLat);
      }

      if (dto.geoLng !== undefined) {
        updateData.geoLng = new Prisma.Decimal(dto.geoLng);
      }

      if (dto.timezone !== undefined) {
        updateData.timezone = dto.timezone;
      }

      if (dto.contactPhone !== undefined) {
        updateData.contactPhone = dto.contactPhone;
      }

      if (dto.contactEmail !== undefined) {
        updateData.contactEmail = dto.contactEmail;
      }

      if (dto.website !== undefined) {
        updateData.website = dto.website;
      }

      if (dto.eventStart !== undefined) {
        updateData.eventStart = dto.eventStart ? new Date(dto.eventStart) : null;
      }

      if (dto.eventEnd !== undefined) {
        updateData.eventEnd = dto.eventEnd ? new Date(dto.eventEnd) : null;
      }

      // Auto-generate eventStart/eventEnd from timeIntervals if neither is explicitly set
      if (
        dto.eventStart === undefined &&
        dto.eventEnd === undefined &&
        dto.timeIntervals !== undefined
      ) {
        const derivedDates = this.deriveEventDatesFromIntervals(dto.timeIntervals);
        updateData.eventStart = derivedDates.start ?? null;
        updateData.eventEnd = derivedDates.end ?? null;
      }

      if (dto.isAllDay !== undefined) {
        updateData.isAllDay = dto.isAllDay;
      }

      if (dto.organizerName !== undefined) {
        updateData.organizerName = dto.organizerName;
      }

      if (dto.organizerContact !== undefined) {
        updateData.organizerContact = dto.organizerContact;
      }

      if (dto.registrationUrl !== undefined) {
        updateData.registrationUrl = dto.registrationUrl;
      }

      if (dto.isFeatured !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can update featured listings');
        }
        updateData.isFeatured = dto.isFeatured;
      }

      if (dto.featuredUntil !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can set featured until date');
        }
        updateData.featuredUntil = dto.featuredUntil ? new Date(dto.featuredUntil) : null;
      }

      if (dto.publishAt !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can set publishAt');
        }
        updateData.publishAt = dto.publishAt ? new Date(dto.publishAt) : null;
      }

      if (dto.expireAt !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can set expireAt');
        }
        updateData.expireAt = dto.expireAt ? new Date(dto.expireAt) : null;
      }

      if (dto.visibility !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can change visibility');
        }
        updateData.visibility = dto.visibility;
      }

      if (dto.status !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can change status');
        }
        updateData.status = dto.status;
      }

      if (dto.moderationStatus !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can change moderation status');
        }
        updateData.moderationStatus = dto.moderationStatus;
      } else if (!isAdmin) {
        updateData.moderationStatus = ListingModerationStatus.PENDING;
      }

      if (!isAdmin) {
        updateData.status = ListingStatus.PENDING;
        updateData.reviewNotes = null;
        updateData.reviewedBy = null;
        updateData.reviewedAt = null;
      } else if (dto.reviewNotes !== undefined) {
        updateData.reviewNotes = dto.reviewNotes;
      }

      if (dto.externalSource !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can update external metadata');
        }
        updateData.externalSource = dto.externalSource;
      }

      if (dto.externalId !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can update external metadata');
        }
        updateData.externalId = dto.externalId;
      }

      if (dto.syncHash !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can update sync hash');
        }
        updateData.syncHash = dto.syncHash;
      }

      if (dto.contentChecksum !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can update content checksum');
        }
        updateData.contentChecksum = dto.contentChecksum;
      }

      if (dto.lastSyncedAt !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can update sync timestamps');
        }
        updateData.lastSyncedAt = dto.lastSyncedAt ? new Date(dto.lastSyncedAt) : null;
      }

      if (dto.ingestedAt !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can update ingestion metadata');
        }
        updateData.ingestedAt = dto.ingestedAt ? new Date(dto.ingestedAt) : null;
      }

      if (dto.ingestedByService !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can update ingestion metadata');
        }
        updateData.ingestedByService = dto.ingestedByService;
      }

      if (dto.ingestNotes !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can update ingestion metadata');
        }
        updateData.ingestNotes = dto.ingestNotes;
      }

      if (dto.sourceType !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can update source type');
        }
        updateData.sourceType = dto.sourceType;
      }

      if (dto.isArchived !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can archive listings');
        }
        updateData.isArchived = dto.isArchived;
        if (dto.isArchived) {
          updateData.archivedAt = dto.archivedAt ? new Date(dto.archivedAt) : new Date();
          updateData.archivedBy = dto.archivedBy ?? userId;
        } else {
          updateData.archivedAt = null;
          updateData.archivedBy = null;
        }
      } else if (dto.archivedAt !== undefined || dto.archivedBy !== undefined) {
        if (!isAdmin) {
          throw new ForbiddenException('Only admins can update archive metadata');
        }
        if (dto.archivedAt !== undefined) {
          updateData.archivedAt = dto.archivedAt ? new Date(dto.archivedAt) : null;
        }
        if (dto.archivedBy !== undefined) {
          updateData.archivedBy = dto.archivedBy;
        }
      }

      if (primaryCity) {
        updateData.primaryCityId = primaryCity.cityId;
      } else if (dto.cities && dto.cities.length === 0) {
        updateData.primaryCityId = null;
      }

      await tx.listing.update({
        where: { id: listingId },
        data: updateData,
      });

      await this.syncListingCategories(tx, listingId, dto.categories);
      await this.syncListingCities(tx, listingId, dto.cities);
      // Media should not be updated via this endpoint - use upload/delete endpoints instead
      await this.syncListingTimeIntervals(tx, listingId, dto.timeIntervals);
      await this.syncListingTimeIntervalExceptions(tx, listingId, dto.timeIntervalExceptions);

      const refreshed = await tx.listing.findUnique({
        where: { id: listingId },
        include: listingWithRelations.include,
      });

      if (!refreshed) {
        throw new NotFoundException('Listing not found after update');
      }

      const listingDto = this.mapListing(refreshed);
      return this.applyListingTranslations(refreshed, listingDto);
    });
  }

  async getListingById(listingId: string, userId?: string): Promise<ListingResponseDto> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: listingWithRelations.include,
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    let isFavorite = false;
    if (userId) {
      const favoriteIds = await this.getFavoriteListingIds(userId, [listing.id]);
      isFavorite = favoriteIds.has(listing.id);
    }

    const dto = this.mapListing(listing, { isFavorite });
    return this.applyListingTranslations(listing, dto);
  }

  async getListingBySlug(slug: string, userId?: string): Promise<ListingResponseDto> {
    const listing = await this.prisma.listing.findUnique({
      where: { slug },
      include: listingWithRelations.include,
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    let isFavorite = false;
    if (userId) {
      const favoriteIds = await this.getFavoriteListingIds(userId, [listing.id]);
      isFavorite = favoriteIds.has(listing.id);
    }

    const dto = this.mapListing(listing, { isFavorite });
    return this.applyListingTranslations(listing, dto);
  }

  private buildListingWhere(
    filter: ListingFilterDto = {} as ListingFilterDto,
  ): Prisma.ListingWhereInput {
    const where: Prisma.ListingWhereInput = {};
    const andConditions: Prisma.ListingWhereInput[] = [];

    if (filter.search) {
      const searchTerm = filter.search.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { summary: { contains: searchTerm, mode: 'insensitive' } },
        { content: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.moderationStatus) {
      where.moderationStatus = filter.moderationStatus;
    }

    if (filter.visibility) {
      where.visibility = filter.visibility;
    }

    if (filter.sourceType) {
      where.sourceType = filter.sourceType;
    }

    if (filter.isFeatured !== undefined) {
      where.isFeatured = filter.isFeatured;
    }

    if (filter.languageCodes?.length) {
      where.languageCode = { in: filter.languageCodes };
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

    if (filter.categoryIds?.length) {
      where.categories = {
        some: {
          categoryId: {
            in: filter.categoryIds,
          },
        },
      };
    }

    if (filter.publishAfter || filter.publishBefore) {
      andConditions.push({
        publishAt: {
          ...(filter.publishAfter ? { gte: new Date(filter.publishAfter) } : {}),
          ...(filter.publishBefore ? { lte: new Date(filter.publishBefore) } : {}),
        },
      });
    }

    if (filter.upcomingAfter || filter.upcomingBefore) {
      const upcomingConditions: Prisma.ListingWhereInput[] = [];

      upcomingConditions.push({
        eventStart: {
          ...(filter.upcomingAfter ? { gte: new Date(filter.upcomingAfter) } : {}),
          ...(filter.upcomingBefore ? { lte: new Date(filter.upcomingBefore) } : {}),
        },
      });

      const intervalFilter: Prisma.ListingTimeIntervalWhereInput = {};

      if (filter.upcomingAfter) {
        intervalFilter.end = { gte: new Date(filter.upcomingAfter) };
      }

      if (filter.upcomingBefore) {
        intervalFilter.start = { lte: new Date(filter.upcomingBefore) };
      }

      if (Object.keys(intervalFilter).length) {
        upcomingConditions.push({
          timeIntervals: {
            some: intervalFilter,
          },
        });
      }

      andConditions.push({
        OR: upcomingConditions,
      });
    }

    if (andConditions.length) {
      where.AND = andConditions;
    }

    return where;
  }

  async listListings(filter: ListingFilterDto = {} as ListingFilterDto, userId?: string) {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const pageSizeCandidate = filter.pageSize && filter.pageSize > 0 ? filter.pageSize : 20;
    const pageSize = Math.min(pageSizeCandidate, 100);
    const skip = (page - 1) * pageSize;
    const where = this.buildListingWhere(filter);

    const allowedSortFields = new Set([
      'createdAt',
      'publishAt',
      'eventStart',
      'updatedAt',
      'featuredUntil',
    ]);
    const sortByField =
      filter.sortBy && allowedSortFields.has(filter.sortBy) ? filter.sortBy : 'createdAt';
    const sortDirection = filter.sortDirection ?? 'desc';

    const orderBy: Prisma.ListingOrderByWithRelationInput = {};
    (orderBy as Record<string, unknown>)[sortByField] = sortDirection;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        include: listingWithRelations.include,
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prisma.listing.count({ where }),
    ]);

    let favoriteIds: Set<string> | undefined;
    if (userId) {
      favoriteIds = await this.getFavoriteListingIds(
        userId,
        rows.map((row) => row.id),
      );
    }

    const items = await Promise.all(
      rows.map(async (row) => {
        const dto = this.mapListing(row, {
          isFavorite: favoriteIds?.has(row.id) ?? false,
        });
        return this.applyListingTranslations(row, dto);
      }),
    );
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

  async moderateListing(
    listingId: string,
    moderatorId: string,
    moderationDto: ListingModerationDto,
  ): Promise<ListingResponseDto> {
    const now = new Date();
    const existing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        publishAt: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Listing not found');
    }

    const updateData: Prisma.ListingUpdateInput = {
      moderationStatus: moderationDto.moderationStatus,
      reviewNotes: moderationDto.reviewNotes ?? null,
      reviewedBy: moderatorId,
      reviewedAt: now,
      lastEditedByUserId: moderatorId,
    };

    switch (moderationDto.moderationStatus) {
      case ListingModerationStatus.APPROVED:
        updateData.status = moderationDto.publishStatus ?? ListingStatus.APPROVED;
        updateData.isArchived = false;
        if (
          !existing.publishAt &&
          (moderationDto.publishStatus === ListingStatus.APPROVED || !moderationDto.publishStatus)
        ) {
          updateData.publishAt = now;
        }
        break;
      case ListingModerationStatus.REJECTED:
        updateData.status = ListingStatus.REJECTED;
        break;
      case ListingModerationStatus.CHANGES_REQUESTED:
        updateData.status = ListingStatus.PENDING;
        break;
      case ListingModerationStatus.ARCHIVED:
        updateData.status = ListingStatus.DELETED;
        updateData.isArchived = true;
        updateData.archivedAt = now;
        updateData.archivedBy = moderatorId;
        break;
      default:
        updateData.status = moderationDto.publishStatus ?? ListingStatus.PENDING;
    }

    const listing = await this.prisma.listing.update({
      where: { id: listingId },
      data: updateData,
      include: listingWithRelations.include,
    });

    const listingDto = this.mapListing(listing);
    return this.applyListingTranslations(listing, listingDto);
  }

  async submitListingForReview(listingId: string, userId: string): Promise<ListingResponseDto> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.createdByUserId !== userId) {
      throw new ForbiddenException('You can only submit your own listings');
    }

    const updated = await this.prisma.listing.update({
      where: { id: listingId },
      data: {
        status: ListingStatus.PENDING,
        moderationStatus: ListingModerationStatus.PENDING,
        reviewNotes: null,
        reviewedBy: null,
        reviewedAt: null,
        lastEditedByUserId: userId,
      },
      include: listingWithRelations.include,
    });

    const listingDto = this.mapListing(updated as ListingWithRelations);
    return this.applyListingTranslations(updated as ListingWithRelations, listingDto);
  }

  async approveListing(listingId: string, moderatorId: string, body: ListingModerationActionDto) {
    return this.moderateListing(listingId, moderatorId, {
      moderationStatus: ListingModerationStatus.APPROVED,
      publishStatus: body.publishStatus ?? ListingStatus.APPROVED,
      reviewNotes: body.reviewNotes,
    });
  }

  async requestListingChanges(
    listingId: string,
    moderatorId: string,
    body: ListingModerationActionDto,
  ) {
    return this.moderateListing(listingId, moderatorId, {
      moderationStatus: ListingModerationStatus.CHANGES_REQUESTED,
      publishStatus: body.publishStatus ?? ListingStatus.PENDING,
      reviewNotes: body.reviewNotes,
    });
  }

  async rejectListing(listingId: string, moderatorId: string, reviewNotes?: string) {
    return this.moderateListing(listingId, moderatorId, {
      moderationStatus: ListingModerationStatus.REJECTED,
      publishStatus: ListingStatus.REJECTED,
      reviewNotes,
    });
  }

  async archiveListing(listingId: string, moderatorId: string, reviewNotes?: string) {
    return this.moderateListing(listingId, moderatorId, {
      moderationStatus: ListingModerationStatus.ARCHIVED,
      publishStatus: ListingStatus.DELETED,
      reviewNotes,
    });
  }

  async toggleFavorite(userId: string, listingId: string, isFavorite: boolean) {
    this.logger.log(
      `${isFavorite ? 'Adding' : 'Removing'} favorite: userId=${userId}, listingId=${listingId}`,
    );

    try {
      const listing = await this.prisma.listing.findUnique({
        where: { id: listingId },
        include: listingWithRelations.include,
      });

      if (!listing) {
        throw new NotFoundException('Listing not found');
      }

      if (isFavorite) {
        // Add favorite
        const favorite = await this.prisma.userFavorite.upsert({
          where: {
            userId_listingId: {
              userId,
              listingId,
            },
          },
          update: {},
          create: {
            userId,
            listingId,
          },
          include: {
            listing: {
              include: listingWithRelations.include,
            },
          },
        });

        this.logger.log(`Favorite added successfully: ${favorite.id}`);
        const listingDto = await this.applyListingTranslations(
          favorite.listing as ListingWithRelations,
          this.mapListing(favorite.listing as ListingWithRelations, { isFavorite: true }),
        );
        return {
          id: favorite.id,
          userId: favorite.userId,
          listingId: favorite.listingId,
          listing: listingDto,
          createdAt: favorite.createdAt,
        };
      } else {
        // Remove favorite
        const favorite = await this.prisma.userFavorite.findUnique({
          where: {
            userId_listingId: {
              userId,
              listingId,
            },
          },
        });

        if (!favorite) {
          throw new NotFoundException('Favorite not found');
        }

        await this.prisma.userFavorite.delete({
          where: {
            userId_listingId: {
              userId,
              listingId,
            },
          },
        });

        this.logger.log(`Favorite removed successfully`);
        return { success: true, message: 'Favorite removed successfully' };
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Listing already in favorites');
      }
      this.logger.error(`Failed to ${isFavorite ? 'add' : 'remove'} favorite`, error);
      throw error;
    }
  }

  async addFavorite(userId: string, listingId: string) {
    this.logger.log(`Adding favorite: userId=${userId}, listingId=${listingId}`);

    try {
      const listing = await this.prisma.listing.findUnique({
        where: { id: listingId },
        include: listingWithRelations.include,
      });

      if (!listing) {
        throw new NotFoundException('Listing not found');
      }

      const favorite = await this.prisma.userFavorite.upsert({
        where: {
          userId_listingId: {
            userId,
            listingId,
          },
        },
        update: {},
        create: {
          userId,
          listingId,
        },
        include: {
          listing: {
            include: listingWithRelations.include,
          },
        },
      });

      this.logger.log(`Favorite added successfully: ${favorite.id}`);
      const listingDto = await this.applyListingTranslations(
        favorite.listing as ListingWithRelations,
        this.mapListing(favorite.listing as ListingWithRelations, { isFavorite: true }),
      );
      return {
        id: favorite.id,
        userId: favorite.userId,
        listingId: favorite.listingId,
        listing: listingDto,
        createdAt: favorite.createdAt,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Listing already in favorites');
      }
      this.logger.error('Failed to add favorite', error);
      throw error;
    }
  }

  async removeFavorite(userId: string, listingId: string) {
    this.logger.log(`Removing favorite: userId=${userId}, listingId=${listingId}`);

    try {
      const favorite = await this.prisma.userFavorite.findUnique({
        where: {
          userId_listingId: {
            userId,
            listingId,
          },
        },
      });

      if (!favorite) {
        throw new NotFoundException('Favorite not found');
      }

      await this.prisma.userFavorite.delete({
        where: {
          userId_listingId: {
            userId,
            listingId,
          },
        },
      });

      this.logger.log(`Favorite removed successfully`);
      return { success: true, message: 'Favorite removed successfully' };
    } catch (error: any) {
      this.logger.error('Failed to remove favorite', error);
      throw error;
    }
  }

  async getUserFavorites(userId: string) {
    this.logger.log(`Getting favorites for userId: ${userId}`);

    const favorites = await this.prisma.userFavorite.findMany({
      where: {
        userId,
      },
      include: {
        listing: {
          include: listingWithRelations.include,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const items = await Promise.all(
      favorites.map(async (f) => {
        const listingDto = await this.applyListingTranslations(
          f.listing as ListingWithRelations,
          this.mapListing(f.listing as ListingWithRelations, { isFavorite: true }),
        );
        return listingDto;
      }),
    );

    const total = items.length;
    const pageSize = total;
    const page = 1;
    const totalPages = 1;

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
}
