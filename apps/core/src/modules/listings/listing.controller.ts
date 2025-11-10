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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateListingDto,
  ListingFilterDto,
  ListingModerationActionDto,
  ListingModerationDto,
  ListingResponseDto,
  UpdateListingDto,
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
  @ApiOperation({ summary: 'List listings with filters' })
  @ApiResponse({ status: 200, description: 'Listings retrieved successfully' })
  async list(@Query() filter: ListingFilterDto) {
    return this.listingsService.listListings(filter);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get listing by slug' })
  @ApiResponse({ status: 200, description: 'Listing retrieved successfully' })
  async getBySlug(@Param('slug') slug: string): Promise<ListingResponseDto> {
    return this.listingsService.getListingBySlug(slug);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get listing by id' })
  @ApiResponse({ status: 200, description: 'Listing retrieved successfully' })
  async getById(@Param('id') id: string): Promise<ListingResponseDto> {
    return this.listingsService.getListingById(id);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create listing' })
  @ApiResponse({ status: 201, description: 'Listing created successfully' })
  async create(@GetCurrentUser() user: CurrentUser, @Body() dto: CreateListingDto) {
    const roles = this.getRoles(user?.role);
    return this.listingsService.createListing(user.userId, roles, dto);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update listing' })
  @ApiResponse({ status: 200, description: 'Listing updated successfully' })
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
  @ApiOperation({ summary: 'Submit listing for review' })
  @ApiResponse({ status: 200, description: 'Listing submitted for review' })
  @HttpCode(HttpStatus.OK)
  async submitForReview(@Param('id') id: string, @GetCurrentUser() user: CurrentUser) {
    return this.listingsService.submitListingForReview(id, user.userId);
  }

  @Post(':id/moderate')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Moderate listing with explicit status' })
  @ApiResponse({ status: 200, description: 'Listing moderated successfully' })
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
  @ApiOperation({ summary: 'Approve listing' })
  @ApiResponse({ status: 200, description: 'Listing approved successfully' })
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
  @ApiOperation({ summary: 'Request changes for listing' })
  @ApiResponse({ status: 200, description: 'Changes requested successfully' })
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
  @ApiOperation({ summary: 'Reject listing' })
  @ApiResponse({ status: 200, description: 'Listing rejected successfully' })
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
  @ApiOperation({ summary: 'Archive listing' })
  @ApiResponse({ status: 200, description: 'Listing archived successfully' })
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
