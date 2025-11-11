import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CategoryType,
  ListingMediaType,
  ListingRecurrenceFreq,
  ListingSourceType,
  ListingVisibility,
} from '@prisma/client-core';

export enum Weekday {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday',
  SATURDAY = 'Saturday',
  SUNDAY = 'Sunday',
}

export class ListingCategoryReferenceDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsEnum(CategoryType)
  categoryType?: CategoryType;
}

export class ListingCityReferenceDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  cityId: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}

export class ListingMediaInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsEnum(ListingMediaType)
  type: ListingMediaType;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ListingTimeIntervalInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(Weekday, { each: true })
  weekdays?: Weekday[];

  @IsDateString()
  start: string;

  @IsDateString()
  end: string;

  @IsString()
  tz: string;

  @IsEnum(ListingRecurrenceFreq)
  freq: ListingRecurrenceFreq;

  @IsOptional()
  @IsNumber()
  interval?: number;

  @IsOptional()
  @IsDateString()
  repeatUntil?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ListingTimeIntervalExceptionInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  opensAt?: string;

  @IsOptional()
  @IsString()
  closesAt?: string;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateListingDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  summary?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  languageCode?: string;

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @IsOptional()
  @IsUrl()
  heroImageUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsDateString()
  featuredUntil?: string;

  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @IsOptional()
  @IsDateString()
  expireAt?: string;

  @IsOptional()
  @IsEnum(ListingVisibility)
  visibility?: ListingVisibility;

  @IsOptional()
  @IsEnum(ListingSourceType)
  sourceType?: ListingSourceType;

  @IsOptional()
  @IsString()
  externalSource?: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsString()
  syncHash?: string;

  @IsOptional()
  @IsString()
  contentChecksum?: string;

  @IsOptional()
  @IsDateString()
  lastSyncedAt?: string;

  @IsOptional()
  @IsDateString()
  ingestedAt?: string;

  @IsOptional()
  @IsString()
  ingestedByService?: string;

  @IsOptional()
  @IsString()
  ingestNotes?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ListingCategoryReferenceDto)
  categories?: ListingCategoryReferenceDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ListingCityReferenceDto)
  cities?: ListingCityReferenceDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ListingMediaInputDto)
  media?: ListingMediaInputDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ListingTimeIntervalInputDto)
  timeIntervals?: ListingTimeIntervalInputDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ListingTimeIntervalExceptionInputDto)
  timeIntervalExceptions?: ListingTimeIntervalExceptionInputDto[];

  @IsOptional()
  @IsString()
  venueName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  geoLat?: number;

  @IsOptional()
  @IsNumber()
  geoLng?: number;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsDateString()
  eventStart?: string;

  @IsOptional()
  @IsDateString()
  eventEnd?: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsString()
  organizerName?: string;

  @IsOptional()
  @IsString()
  organizerContact?: string;

  @IsOptional()
  @IsUrl()
  registrationUrl?: string;
}
