import {
  CategoryType,
  ListingMediaType,
  ListingModerationStatus,
  ListingRecurrenceFreq,
  ListingSourceType,
  ListingStatus,
  ListingVisibility,
} from '@prisma/client-core';
import { Weekday } from './listing-create.dto';

export class ListingCategoryDto {
  id: string;
  categoryId: string;
  name?: string;
  slug?: string;
  type?: CategoryType | null;
}

export class ListingCityDto {
  id: string;
  cityId: string;
  isPrimary: boolean;
  displayOrder: number;
}

export class ListingMediaDto {
  id: string;
  type: ListingMediaType;
  url: string;
  altText?: string | null;
  caption?: string | null;
  order: number;
  metadata?: Record<string, unknown> | null;
}

export class ListingTimeIntervalDto {
  id: string;
  weekdays?: Weekday[];
  start: string;
  end: string;
  tz: string;
  freq: ListingRecurrenceFreq;
  interval: number;
  repeatUntil?: string | null;
  metadata?: Record<string, unknown> | null;
}

export class ListingTimeIntervalExceptionDto {
  id: string;
  date: string;
  opensAt?: string | null;
  closesAt?: string | null;
  isClosed: boolean;
  metadata?: Record<string, unknown> | null;
}

export class ListingResponseDto {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  content: string;
  status: ListingStatus;
  moderationStatus: ListingModerationStatus;
  visibility: ListingVisibility;
  isFeatured: boolean;
  featuredUntil?: string | null;
  publishAt?: string | null;
  expireAt?: string | null;
  languageCode?: string | null;
  sourceUrl?: string | null;
  heroImageUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  createdByUserId?: string | null;
  lastEditedByUserId?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  sourceType: ListingSourceType;
  externalSource?: string | null;
  externalId?: string | null;
  syncHash?: string | null;
  contentChecksum?: string | null;
  lastSyncedAt?: string | null;
  ingestedAt?: string | null;
  ingestedByService?: string | null;
  ingestNotes?: string | null;
  primaryCityId?: string | null;
  venueName?: string | null;
  address?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  timezone?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  website?: string | null;
  eventStart?: string | null;
  eventEnd?: string | null;
  isAllDay: boolean;
  organizerName?: string | null;
  organizerContact?: string | null;
  registrationUrl?: string | null;
  isArchived: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  categories: ListingCategoryDto[];
  cities: ListingCityDto[];
  media: ListingMediaDto[];
  timeIntervals: ListingTimeIntervalDto[];
  timeIntervalExceptions: ListingTimeIntervalExceptionDto[];
}
