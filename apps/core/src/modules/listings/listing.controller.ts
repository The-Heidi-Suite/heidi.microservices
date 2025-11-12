import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
} from '@heidi/contracts';
import { CurrentUser, GetCurrentUser, JwtAuthGuard, Public } from '@heidi/jwt';
import { UserRole } from '@prisma/client-core';
import { ListingsService } from './listings.service';

@ApiTags('listings')
@Controller('listings')
@UseGuards(JwtAuthGuard)
export class ListingController {
  constructor(private readonly listingsService: ListingsService) {}

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
}
