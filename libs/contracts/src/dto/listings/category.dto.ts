import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { CategoryType } from '@prisma/client-core';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
