import { PartialType } from '@nestjs/swagger';
import { CreateListingDto } from './listing-create.dto';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ListingModerationStatus, ListingStatus, ListingSourceType } from '@prisma/client-core';

export class UpdateListingDto extends PartialType(CreateListingDto) {
  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @IsEnum(ListingModerationStatus)
  moderationStatus?: ListingModerationStatus;

  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsDateString()
  archivedAt?: string;

  @IsOptional()
  @IsString()
  archivedBy?: string;

  @IsOptional()
  @IsEnum(ListingSourceType)
  sourceType?: ListingSourceType;
}
