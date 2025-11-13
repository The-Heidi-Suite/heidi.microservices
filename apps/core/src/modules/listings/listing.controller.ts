import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateListingDto,
  ListingFilterDto,
  ListingModerationActionDto,
  ListingModerationDto,
  ListingResponseDto,
  UpdateListingDto,
  ListListingsResponseDto,
  ValidationErrorResponseDto,
  UnauthorizedErrorResponseDto,
  ForbiddenErrorResponseDto,
  ListingNotFoundErrorResponseDto,
  UploadHeroImageResponseDto,
  UploadMediaResponseDto,
  ListingMediaDto,
  DeleteMediaResponseDto,
} from '@heidi/contracts';
import { CurrentUser, GetCurrentUser, JwtAuthGuard, Public } from '@heidi/jwt';
import { AdminOnlyGuard, PermissionsGuard } from '@heidi/rbac';
import { UserRole, ListingMediaType } from '@prisma/client-core';
import { ListingsService } from './listings.service';
import { FileUploadService, StorageService } from '@heidi/storage';
import { ConfigService } from '@heidi/config';
import { LoggerService } from '@heidi/logger';
import { PrismaCoreService } from '@heidi/prisma';

@ApiTags('listings')
@Controller('listings')
@UseGuards(JwtAuthGuard)
export class ListingController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly fileUploadService: FileUploadService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly logger: LoggerService,
    private readonly prisma: PrismaCoreService,
  ) {
    this.logger.setContext(ListingController.name);
  }

  private getRoles(role?: string): UserRole[] {
    if (!role) {
      return [];
    }

    const normalized = role.toUpperCase() as keyof typeof UserRole;
    const mapped = UserRole[normalized];

    return mapped ? [mapped] : [];
  }

  private ensureAdminRole(role?: string): UserRole[] {
    const roles = this.getRoles(role);

    if (!roles.some((r) => r === UserRole.SUPER_ADMIN || r === UserRole.CITY_ADMIN)) {
      throw new ForbiddenException('Admin privileges required');
    }

    return roles;
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List listings with filters',
    description:
      'Retrieve listings using flexible filters including city, category, status, language, and scheduling controls. Supports pagination and sorting.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listings retrieved successfully',
    type: ListListingsResponseDto,
    content: {
      'application/json': {
        example: {
          items: [
            {
              id: 'lst_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
              slug: 'community-cleanup-day',
              title: 'Community Cleanup Day',
              summary: 'Join neighbors to clean up the central park.',
              content: '<p>Bring gloves and reusable bags.</p>',
              status: 'PENDING',
              moderationStatus: 'PENDING',
              visibility: 'PUBLIC',
              isFeatured: false,
              featuredUntil: null,
              publishAt: '2025-01-20T09:00:00.000Z',
              expireAt: null,
              languageCode: 'en',
              sourceUrl: null,
              heroImageUrl: 'https://cdn.example.com/listings/hero.jpg',
              metadata: { tags: ['cleanup', 'volunteer'] },
              viewCount: 150,
              likeCount: 25,
              shareCount: 10,
              createdByUserId: 'user_01HZXTY0YK3H2V4C5B6N7P8Q',
              lastEditedByUserId: null,
              reviewedBy: null,
              reviewedAt: null,
              reviewNotes: null,
              sourceType: 'MANUAL',
              externalSource: null,
              externalId: null,
              syncHash: null,
              contentChecksum: null,
              lastSyncedAt: null,
              ingestedAt: null,
              ingestedByService: null,
              ingestNotes: null,
              primaryCityId: 'city_01HZXTY0YK3H2V4C5B6N7P8Q',
              venueName: 'Central Park',
              address: '123 Main St, City, State 12345',
              geoLat: 40.7128,
              geoLng: -74.006,
              timezone: 'America/New_York',
              contactPhone: '+1-555-123-4567',
              contactEmail: 'contact@example.com',
              website: 'https://example.com',
              eventStart: '2025-01-20T09:00:00.000Z',
              eventEnd: '2025-01-20T17:00:00.000Z',
              isAllDay: false,
              organizerName: 'Community Organization',
              organizerContact: 'organizer@example.com',
              registrationUrl: 'https://example.com/register',
              isArchived: false,
              archivedAt: null,
              archivedBy: null,
              createdAt: '2025-01-20T09:00:00.000Z',
              updatedAt: '2025-01-20T09:15:00.000Z',
              categories: [
                {
                  id: 'lc1a2b3c4-d5e6-7890-abcd-ef1234567890',
                  categoryId: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890',
                  name: 'Community Events',
                  slug: 'community-events',
                  type: 'EVENT',
                },
              ],
              cities: [
                {
                  id: 'lct1a2b3c4-d5e6-7890-abcd-ef1234567890',
                  cityId: 'city_01HZXTY0YK3H2V4C5B6N7P8Q',
                  isPrimary: true,
                  displayOrder: 1,
                },
              ],
              media: [
                {
                  id: 'lm1a2b3c4-d5e6-7890-abcd-ef1234567890',
                  type: 'IMAGE',
                  url: 'https://cdn.example.com/listings/hero.jpg',
                  altText: 'Community cleanup event photo',
                  caption: 'Volunteers cleaning up the park',
                  order: 1,
                  metadata: { width: 1920, height: 1080 },
                },
              ],
              timeIntervals: [],
              timeIntervalExceptions: [],
            },
          ],
          meta: {
            page: 1,
            pageSize: 20,
            total: 120,
            totalPages: 6,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more filter parameters',
    type: ValidationErrorResponseDto,
    content: {
      'application/json': {
        example: {
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/listings',
          method: 'GET',
          requestId: 'req_1234567890_abc123',
          statusCode: 400,
          details: {
            message: [
              'page must be a number',
              'pageSize must be a positive number',
              'Invalid date format for publishAfter',
            ],
          },
        },
      },
    },
  })
  async list(@Query() filter: ListingFilterDto) {
    return this.listingsService.listListings(filter);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get listing by slug',
    description: 'Fetch a single listing using its unique slug identifier.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Slugified unique identifier for the listing',
    example: 'community-cleanup-day',
  })
  @ApiResponse({
    status: 200,
    description: 'Listing retrieved successfully',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Listing not found',
    type: ListingNotFoundErrorResponseDto,
  })
  async getBySlug(@Param('slug') slug: string): Promise<ListingResponseDto> {
    return this.listingsService.getListingBySlug(slug);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get listing by ID',
    description: 'Fetch a single listing using its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'Listing identifier',
    example: 'lst_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @ApiResponse({
    status: 200,
    description: 'Listing retrieved successfully',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Listing not found',
    type: ListingNotFoundErrorResponseDto,
  })
  async getById(@Param('id') id: string): Promise<ListingResponseDto> {
    return this.listingsService.getListingById(id);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create listing',
    description:
      'Create a new listing. Non-admin users have limited control over visibility, featured status, and scheduling fields which will be sanitized server-side.',
  })
  @ApiBody({
    type: CreateListingDto,
    examples: {
      basic: {
        summary: 'Create public listing',
        value: {
          title: 'Community Cleanup Day',
          summary: 'Join neighbors to clean up the central park.',
          content: '<p>Please bring gloves and reusable bags.</p>',
          categories: [{ categoryId: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890' }],
          cities: [{ cityId: 'city_01HZXTY0YK3H2V4C5B6N7P8Q', isPrimary: true }],
          heroImageUrl: 'https://cdn.example.com/listings/cleanup.jpg',
          publishAt: '2025-01-20T09:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Listing created successfully',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload - validation failed',
    type: ValidationErrorResponseDto,
    content: {
      'application/json': {
        example: {
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/listings',
          method: 'POST',
          requestId: 'req_1234567890_abc123',
          statusCode: 400,
          details: {
            message: [
              'title should not be empty',
              'content should not be empty',
              'categories must be an array',
              'cities must be an array',
            ],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'User lacks permissions to create listing with provided attributes',
    type: ForbiddenErrorResponseDto,
  })
  async create(@GetCurrentUser() user: CurrentUser, @Body() dto: CreateListingDto) {
    const roles = this.getRoles(user?.role);
    return this.listingsService.createListing(user.userId, roles, dto);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update listing',
    description:
      'Update listing fields. Non-admin users can only update listings they created and cannot modify moderation-controlled fields.',
  })
  @ApiParam({
    name: 'id',
    description: 'Listing identifier',
    example: 'lst_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @ApiBody({
    type: UpdateListingDto,
    examples: {
      update: {
        summary: 'Partial update',
        value: {
          title: 'Community Cleanup Day (Updated)',
          summary: 'Updated summary for the cleanup event.',
          metadata: {
            tags: ['cleanup', 'volunteer'],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Listing updated successfully',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid update payload',
    type: ValidationErrorResponseDto,
    content: {
      'application/json': {
        example: {
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/listings/lst_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
          method: 'PATCH',
          requestId: 'req_1234567890_abc123',
          statusCode: 400,
          details: {
            message: [
              'title must be a string',
              'Invalid date format for publishAt',
              'status must be a valid ListingStatus enum value',
            ],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'User lacks permission to update this listing',
    type: ForbiddenErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Listing not found',
    type: ListingNotFoundErrorResponseDto,
  })
  async update(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: UpdateListingDto,
  ) {
    const roles = this.getRoles(user?.role);
    return this.listingsService.updateListing(id, user.userId, roles, dto);
  }

  @Post(':id/submit')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Submit listing for review',
    description:
      'Request moderation review for a draft listing. Only the creator of the listing can submit it.',
  })
  @ApiParam({
    name: 'id',
    description: 'Listing identifier',
    example: 'lst_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @ApiResponse({
    status: 200,
    description: 'Listing submitted for review',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'User is not allowed to submit this listing for review',
    type: ForbiddenErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Listing not found',
    type: ListingNotFoundErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async submitForReview(@Param('id') id: string, @GetCurrentUser() user: CurrentUser) {
    return this.listingsService.submitListingForReview(id, user.userId);
  }

  @Post(':id/moderate')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Moderate listing with explicit status',
    description:
      'Update moderation and publication status of a listing. Requires Super Admin or City Admin role.',
  })
  @ApiParam({
    name: 'id',
    description: 'Listing identifier',
    example: 'lst_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @ApiBody({
    type: ListingModerationDto,
    examples: {
      approve: {
        summary: 'Approve listing with publish date',
        value: {
          moderationStatus: 'APPROVED',
          publishStatus: 'APPROVED',
          reviewNotes: 'Looks great!',
          publishAt: '2025-01-22T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Listing moderated successfully',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid moderation payload',
    type: ValidationErrorResponseDto,
    content: {
      'application/json': {
        example: {
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/listings/lst_01J3MJG0YX6FT5PB9SJ9Y2KQW4/moderate',
          method: 'POST',
          requestId: 'req_1234567890_abc123',
          statusCode: 400,
          details: {
            message: [
              'moderationStatus must be a valid ListingModerationStatus enum value',
              'Invalid date format for publishAt',
            ],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Admin privileges required for this action',
    type: ForbiddenErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Listing not found',
    type: ListingNotFoundErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async moderate(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: ListingModerationDto,
  ) {
    this.ensureAdminRole(user?.role);
    return this.listingsService.moderateListing(id, user.userId, dto);
  }

  @Post(':id/approve')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Approve listing',
    description:
      'Approve a listing and optionally set publish status and reviewer notes. Requires admin privileges.',
  })
  @ApiParam({
    name: 'id',
    description: 'Listing identifier',
    example: 'lst_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @ApiBody({
    type: ListingModerationActionDto,
    examples: {
      approve: {
        summary: 'Approve listing immediately',
        value: {
          publishStatus: 'APPROVED',
          reviewNotes: 'Approved for publication.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Listing approved successfully',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Admin privileges required',
    type: ForbiddenErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Listing not found',
    type: ListingNotFoundErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() body: ListingModerationActionDto,
  ) {
    this.ensureAdminRole(user?.role);
    return this.listingsService.approveListing(id, user.userId, body);
  }

  @Post(':id/request-changes')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Request changes for listing',
    description:
      'Ask the listing creator to make changes. Requires admin privileges and provides reviewer notes.',
  })
  @ApiParam({
    name: 'id',
    description: 'Listing identifier',
    example: 'lst_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @ApiBody({
    type: ListingModerationActionDto,
    examples: {
      changes: {
        summary: 'Request specific changes',
        value: {
          publishStatus: 'PENDING',
          reviewNotes: 'Please add more detail about accessibility options.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Changes requested successfully',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Admin privileges required',
    type: ForbiddenErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Listing not found',
    type: ListingNotFoundErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async requestChanges(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() body: ListingModerationActionDto,
  ) {
    this.ensureAdminRole(user?.role);
    return this.listingsService.requestListingChanges(id, user.userId, body);
  }

  @Post(':id/reject')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reject listing',
    description:
      'Reject a listing during moderation. Requires admin privileges and optionally includes reviewer notes.',
  })
  @ApiParam({
    name: 'id',
    description: 'Listing identifier',
    example: 'lst_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @ApiBody({
    type: ListingModerationActionDto,
    examples: {
      reject: {
        summary: 'Reject with reviewer notes',
        value: {
          reviewNotes: 'Duplicate of an existing listing.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Listing rejected successfully',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Admin privileges required',
    type: ForbiddenErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Listing not found',
    type: ListingNotFoundErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() body: ListingModerationActionDto,
  ) {
    this.ensureAdminRole(user?.role);
    return this.listingsService.rejectListing(id, user.userId, body.reviewNotes);
  }

  @Post(':id/archive')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Archive listing',
    description:
      'Archive a listing which removes it from public view. Requires admin privileges and optional reviewer notes.',
  })
  @ApiParam({
    name: 'id',
    description: 'Listing identifier',
    example: 'lst_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @ApiBody({
    type: ListingModerationActionDto,
    examples: {
      archive: {
        summary: 'Archive with rationale',
        value: {
          reviewNotes: 'Event cancelled by organizer.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Listing archived successfully',
    type: ListingResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Admin privileges required',
    type: ForbiddenErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Listing not found',
    type: ListingNotFoundErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() body: ListingModerationActionDto,
  ) {
    this.ensureAdminRole(user?.role);
    return this.listingsService.archiveListing(id, user.userId, body.reviewNotes);
  }

  @Post(':id/hero-image')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upload hero image for a listing',
    description: 'Upload and process a hero image for a listing.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier for the listing',
    example: 'lst_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @ApiResponse({
    status: 200,
    description: 'Hero image uploaded successfully',
    type: UploadHeroImageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Listing not found',
    type: ListingNotFoundErrorResponseDto,
  })
  async uploadHeroImage(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @GetCurrentUser() _user: CurrentUser,
  ): Promise<UploadHeroImageResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Get existing listing to check for old hero image
    const existing = await this.listingsService.getListingById(id);

    // Validate image
    await this.fileUploadService.validateImage(file);

    // Process image
    const processedFile = await this.fileUploadService.processImage(file);

    // Get default bucket
    const bucket = this.configService.storageConfig.defaultBucket;
    if (!bucket) {
      throw new BadRequestException('Storage bucket is not configured');
    }

    // Delete old hero image if exists
    if (existing.heroImageUrl) {
      try {
        const oldKey = this.extractKeyFromUrl(existing.heroImageUrl);
        await this.storageService.deleteFile({ bucket, key: oldKey });
      } catch (error) {
        this.logger.warn(`Failed to delete old hero image for listing ${id}`, error);
        // Continue with upload even if old file deletion fails
      }
    }

    // Generate storage key
    const key = this.fileUploadService.generateListingHeroKey(id, processedFile.extension);

    // Upload to storage
    const imageUrl = await this.fileUploadService.uploadFile(processedFile, bucket, key);

    // Update listing heroImageUrl directly in database (bypassing DTO since heroImageUrl is not in UpdateListingDto)
    await this.prisma.listing.update({
      where: { id },
      data: { heroImageUrl: imageUrl },
    });

    // Refresh listing with relations
    const listing = await this.listingsService.getListingById(id);

    return {
      listing,
      imageUrl,
    };
  }

  @Post(':id/media')
  @UseInterceptors(FilesInterceptor('files', 10))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upload media files for a listing',
    description:
      'Upload multiple media files (images, videos, documents, audio) for a listing. Supports up to 10 files.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier for the listing',
    example: 'lst_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @ApiResponse({
    status: 201,
    description: 'Media files uploaded successfully',
    type: UploadMediaResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid files or validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Listing not found',
    type: ListingNotFoundErrorResponseDto,
  })
  async uploadMedia(
    @Param('id') id: string,
    @UploadedFiles() files: any[],
    @GetCurrentUser() _user: CurrentUser,
  ): Promise<UploadMediaResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (files.length > 10) {
      throw new BadRequestException('Maximum 10 files allowed per upload');
    }

    // Get default bucket
    const bucket = this.configService.storageConfig.defaultBucket;
    if (!bucket) {
      throw new BadRequestException('Storage bucket is not configured');
    }

    // Verify listing exists
    await this.listingsService.getListingById(id);

    const uploadedMedia: ListingMediaDto[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Detect media type
      const { type: mediaType, mimeType } = await this.fileUploadService.detectMediaType(file);

      // Validate based on type
      switch (mediaType) {
        case 'IMAGE':
          await this.fileUploadService.validateImage(file);
          break;
        case 'VIDEO':
          await this.fileUploadService.validateVideo(file);
          break;
        case 'DOCUMENT':
          await this.fileUploadService.validateDocument(file);
          break;
        case 'AUDIO':
          await this.fileUploadService.validateAudio(file);
          break;
        default:
          throw new BadRequestException(`Unsupported file type: ${mimeType}`);
      }

      // Process image files only
      let processedFile;
      let finalExtension: string;
      let finalMimeType: string;

      if (mediaType === 'IMAGE') {
        processedFile = await this.fileUploadService.processImage(file);
        finalExtension = processedFile.extension;
        finalMimeType = processedFile.mimeType;
      } else {
        // For non-image files, use as-is
        const { fileTypeFromBuffer } = await import('file-type');
        const detected = await fileTypeFromBuffer(file.buffer);
        finalExtension = detected?.ext || this.getFileExtension(file.originalname);
        finalMimeType = file.mimetype || detected?.mime || 'application/octet-stream';
        processedFile = {
          buffer: file.buffer,
          mimeType: finalMimeType,
          extension: finalExtension,
          originalName: file.originalname,
          size: file.size,
        };
      }

      // Generate storage key
      const key = this.fileUploadService.generateListingMediaKey(id, i, finalExtension);

      // Upload to storage
      const url = await this.fileUploadService.uploadFile(processedFile, bucket, key);

      // Create media record
      const mediaRecord = await this.listingsService.createListingMedia(id, {
        type: mediaType as ListingMediaType,
        url,
        altText: file.originalname,
        order: i,
      });

      uploadedMedia.push(mediaRecord);
    }

    return {
      media: uploadedMedia,
    };
  }

  @Delete(':id/media/:mediaId')
  @UseGuards(AdminOnlyGuard, PermissionsGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a media file from a listing',
    description:
      'Delete a specific media file from a listing. Removes both the file from storage and the database record.',
  })
  @ApiParam({ name: 'id', description: 'Listing ID' })
  @ApiParam({ name: 'mediaId', description: 'Media ID to delete' })
  @ApiResponse({
    status: 200,
    description: 'Media deleted successfully',
    type: DeleteMediaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Listing or media not found',
    type: ListingNotFoundErrorResponseDto,
  })
  async deleteMedia(
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    const userId = user.userId;
    const roles = this.getRoles(user.role);
    await this.listingsService.deleteListingMedia(id, mediaId, userId, roles);
    return { message: 'Media deleted successfully' };
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
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
}
