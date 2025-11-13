import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryRequestStatus, CategoryType } from '@prisma/client-core';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CategoryResponseDto {
  @ApiProperty({ example: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Community Events' })
  name: string;

  @ApiProperty({ example: 'community-events' })
  slug: string;

  @ApiPropertyOptional({
    enum: CategoryType,
    example: CategoryType.EVENT,
  })
  type?: CategoryType | null;

  @ApiPropertyOptional({ example: 'parent-category-id' })
  parentId?: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2025-01-01T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-01-10T08:30:00.000Z' })
  updatedAt: string;
}

export class CityCategoryResponseDto {
  @ApiProperty({ example: 'cc1a2b3c4-d5e6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'city_01HZXTY0YK3H2V4C5B6N7P8Q' })
  cityId: string;

  @ApiProperty({ example: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890' })
  categoryId: string;

  @ApiPropertyOptional({
    example: 'Local Events',
    description: 'Custom display name for this city. Falls back to category name if not set.',
  })
  displayName?: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: 'user_01HZXTY0YK3H2V4C5B6N7P8Q' })
  addedBy?: string | null;

  @ApiProperty({ example: '2025-01-05T09:15:00.000Z' })
  addedAt: string;

  @ApiProperty({ type: CategoryResponseDto })
  @Type(() => CategoryResponseDto)
  category: CategoryResponseDto;
}

export class AssignCategoryToCityDto {
  @ApiProperty({
    example: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
    description: 'Identifier of the category to assign to the city',
  })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    example: 'Local Events',
    description: 'Custom display name for this city. If not provided, uses the category name.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;
}

export class RequestCategoryDto {
  @ApiProperty({
    example: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
    description: 'Identifier of the category the city admin is requesting',
  })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    example: 'We need this category to organize local volunteer opportunities.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CategoryRequestResponseDto {
  @ApiProperty({ example: 'cr1a2b3c4-d5e6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'city_01HZXTY0YK3H2V4C5B6N7P8Q' })
  cityId: string;

  @ApiProperty({ example: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890' })
  categoryId: string;

  @ApiProperty({ enum: CategoryRequestStatus, example: CategoryRequestStatus.PENDING })
  status: CategoryRequestStatus;

  @ApiProperty({ example: 'user_01HZXTY0YK3H2V4C5B6N7P8Q' })
  requestedBy: string;

  @ApiProperty({ example: '2025-01-05T09:15:00.000Z' })
  requestedAt: string;

  @ApiPropertyOptional({ example: 'user_01HZXTY0YK3H2V4C5B6N7P8Q' })
  handledBy?: string | null;

  @ApiPropertyOptional({ example: '2025-01-06T11:45:00.000Z' })
  handledAt?: string | null;

  @ApiPropertyOptional({
    example: 'Approved because the category aligns with community goals.',
  })
  notes?: string | null;

  @ApiProperty({ type: CategoryResponseDto })
  @Type(() => CategoryResponseDto)
  category: CategoryResponseDto;
}

export class ResolveCategoryRequestDto {
  @ApiProperty({
    enum: CategoryRequestStatus,
    example: CategoryRequestStatus.APPROVED,
    description: 'Resolution status for the category request',
  })
  @IsEnum(CategoryRequestStatus)
  status: CategoryRequestStatus;

  @ApiPropertyOptional({
    example: 'Approved - category already exists in our taxonomy.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateCityCategoryDisplayNameDto {
  @ApiPropertyOptional({
    example: 'Local Events',
    description: 'Custom display name for this city. Set to null to use default category name.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string | null;
}

export class CategoryRequestFilterDto {
  @ApiPropertyOptional({
    example: 'city_01HZXTY0YK3H2V4C5B6N7P8Q',
    description: 'Filter requests for a specific city',
  })
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional({
    enum: CategoryRequestStatus,
    example: CategoryRequestStatus.PENDING,
    description: 'Filter requests by their current status',
  })
  @IsOptional()
  @IsEnum(CategoryRequestStatus)
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  status?: CategoryRequestStatus;
}

export class CategoryNotFoundErrorResponseDto {
  @ApiProperty({ example: 'NOT_FOUND', description: 'Error code' })
  errorCode: string;

  @ApiProperty({ example: 'Category not found', description: 'Error message' })
  message: string;

  @ApiProperty({ example: '2025-11-12T09:48:33.872Z', description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({
    example: '/categories/c1a2b3c4-d5e6-7890-abcd-ef1234567890',
    description: 'Request path',
  })
  path: string;

  @ApiProperty({ example: 'GET', description: 'HTTP method' })
  method: string;

  @ApiProperty({ example: 'req_1762940913872_stt9cnmii', description: 'Request ID for tracing' })
  requestId: string;

  @ApiProperty({ example: 404, description: 'HTTP status code' })
  statusCode: number;

  @ApiPropertyOptional({
    description: 'Additional error details from the original exception',
    example: {
      error: 'Not Found',
      statusCode: 404,
    },
    type: 'object',
    additionalProperties: true,
  })
  details?: {
    error?: string;
    statusCode?: number;
    [key: string]: any;
  };
}

export class CategoryAssignmentNotFoundErrorResponseDto {
  @ApiProperty({ example: 'NOT_FOUND', description: 'Error code' })
  errorCode: string;

  @ApiProperty({ example: 'City/category assignment not found', description: 'Error message' })
  message: string;

  @ApiProperty({ example: '2025-11-12T09:48:33.872Z', description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({
    example:
      '/categories/cities/city_01HZXTY0YK3H2V4C5B6N7P8Q/categories/c1a2b3c4-d5e6-7890-abcd-ef1234567890',
    description: 'Request path',
  })
  path: string;

  @ApiProperty({ example: 'DELETE', description: 'HTTP method' })
  method: string;

  @ApiProperty({ example: 'req_1762940913872_stt9cnmii', description: 'Request ID for tracing' })
  requestId: string;

  @ApiProperty({ example: 404, description: 'HTTP status code' })
  statusCode: number;

  @ApiPropertyOptional({
    description: 'Additional error details from the original exception',
    example: {
      error: 'Not Found',
      statusCode: 404,
    },
    type: 'object',
    additionalProperties: true,
  })
  details?: {
    error?: string;
    statusCode?: number;
    [key: string]: any;
  };
}

export class CategoryRequestNotFoundErrorResponseDto {
  @ApiProperty({ example: 'NOT_FOUND', description: 'Error code' })
  errorCode: string;

  @ApiProperty({ example: 'Category request not found', description: 'Error message' })
  message: string;

  @ApiProperty({ example: '2025-11-12T09:48:33.872Z', description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({
    example: '/categories/requests/cr1a2b3c4-d5e6-7890-abcd-ef1234567890/resolve',
    description: 'Request path',
  })
  path: string;

  @ApiProperty({ example: 'POST', description: 'HTTP method' })
  method: string;

  @ApiProperty({ example: 'req_1762940913872_stt9cnmii', description: 'Request ID for tracing' })
  requestId: string;

  @ApiProperty({ example: 404, description: 'HTTP status code' })
  statusCode: number;

  @ApiPropertyOptional({
    description: 'Additional error details from the original exception',
    example: {
      error: 'Not Found',
      statusCode: 404,
    },
    type: 'object',
    additionalProperties: true,
  })
  details?: {
    error?: string;
    statusCode?: number;
    [key: string]: any;
  };
}
