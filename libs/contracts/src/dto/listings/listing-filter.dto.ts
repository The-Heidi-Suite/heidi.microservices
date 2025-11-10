import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  ListingModerationStatus,
  ListingSourceType,
  ListingStatus,
  ListingVisibility,
} from '@prisma/client-core';

const transformArrayParam = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value;
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const transformBooleanParam = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
};

export class ListingFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => transformArrayParam(value))
  @IsString({ each: true })
  cityIds?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => transformArrayParam(value))
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @IsEnum(ListingModerationStatus)
  moderationStatus?: ListingModerationStatus;

  @IsOptional()
  @IsEnum(ListingVisibility)
  visibility?: ListingVisibility;

  @IsOptional()
  @IsEnum(ListingSourceType)
  sourceType?: ListingSourceType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => transformBooleanParam(value))
  isFeatured?: boolean;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => transformArrayParam(value))
  @IsString({ each: true })
  languageCodes?: string[];

  @IsOptional()
  @IsDateString()
  publishAfter?: string;

  @IsOptional()
  @IsDateString()
  publishBefore?: string;

  @IsOptional()
  @IsDateString()
  upcomingAfter?: string;

  @IsOptional()
  @IsDateString()
  upcomingBefore?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pageSize?: number;
}
