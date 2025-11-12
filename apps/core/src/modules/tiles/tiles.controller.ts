import {
  Body,
  Controller,
  Delete,
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
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateTileDto,
  TileFilterDto,
  TileResponseDto,
  UpdateTileDto,
  TileListResponseDto,
  ValidationErrorResponseDto,
  UnauthorizedErrorResponseDto,
  ForbiddenErrorResponseDto,
  NotFoundErrorResponseDto,
  UploadBackgroundImageResponseDto,
} from '@heidi/contracts';
import { CurrentUser, GetCurrentUser, JwtAuthGuard, Public } from '@heidi/jwt';
import { UserRole } from '@prisma/client-core';
import { TilesService } from './tiles.service';
import { CityAdminOnly, AdminOnlyGuard, PermissionsGuard, RequiresPermission } from '@heidi/rbac';
import { FileUploadService } from '@heidi/storage';
import { ConfigService } from '@heidi/config';

@ApiTags('tiles')
@Controller('tiles')
@UseGuards(JwtAuthGuard)
export class TilesController {
  constructor(
    private readonly tilesService: TilesService,
    private readonly fileUploadService: FileUploadService,
    private readonly configService: ConfigService,
  ) {}

  private getRoles(role?: string): UserRole[] {
    if (!role) {
      return [];
    }

    const normalized = role.toUpperCase() as keyof typeof UserRole;
    const mapped = UserRole[normalized];

    return mapped ? [mapped] : [];
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List tiles with filters',
    description:
      'Retrieve tiles using flexible filters including city, active status, and date ranges. Supports pagination and sorting.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tiles retrieved successfully',
    type: TileListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more filter parameters',
    type: ValidationErrorResponseDto,
  })
  async list(@Query() filter: TileFilterDto) {
    return this.tilesService.listTiles(filter);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get tile by slug',
    description: 'Fetch a single tile using its unique slug identifier.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Slugified unique identifier for the tile',
    example: 'kiel-gift-card-promo',
  })
  @ApiResponse({
    status: 200,
    description: 'Tile retrieved successfully',
    type: TileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tile not found',
    type: NotFoundErrorResponseDto,
  })
  async getBySlug(@Param('slug') slug: string): Promise<TileResponseDto> {
    return this.tilesService.getTileBySlug(slug);
  }

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get tile by ID',
    description: 'Fetch a single tile using its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier for the tile',
    example: 'tile_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @ApiResponse({
    status: 200,
    description: 'Tile retrieved successfully',
    type: TileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tile not found',
    type: NotFoundErrorResponseDto,
  })
  async getById(@Param('id') id: string): Promise<TileResponseDto> {
    return this.tilesService.getTileById(id);
  }

  @Post()
  @UseGuards(AdminOnlyGuard, PermissionsGuard)
  @CityAdminOnly()
  @RequiresPermission('tiles', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new tile',
    description: 'Create a new ad tile. Only Super Admin and City Admin can create tiles.',
  })
  @ApiBody({ type: CreateTileDto })
  @ApiResponse({
    status: 201,
    description: 'Tile created successfully',
    type: TileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
    type: ForbiddenErrorResponseDto,
  })
  async create(
    @Body() dto: CreateTileDto,
    @GetCurrentUser() user: CurrentUser,
  ): Promise<TileResponseDto> {
    const userId = user.userId;
    const roles = this.getRoles(user.role);
    return this.tilesService.createTile(userId, roles, dto);
  }

  @Patch(':id')
  @UseGuards(AdminOnlyGuard, PermissionsGuard)
  @CityAdminOnly()
  @RequiresPermission('tiles', 'update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a tile',
    description: 'Update an existing tile. Only Super Admin and City Admin can update tiles.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier for the tile',
    example: 'tile_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @ApiBody({ type: UpdateTileDto })
  @ApiResponse({
    status: 200,
    description: 'Tile updated successfully',
    type: TileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
    type: ForbiddenErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tile not found',
    type: NotFoundErrorResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTileDto,
    @GetCurrentUser() user: CurrentUser,
  ): Promise<TileResponseDto> {
    const userId = user.userId;
    const roles = this.getRoles(user.role);
    return this.tilesService.updateTile(id, userId, roles, dto);
  }

  @Delete(':id')
  @UseGuards(AdminOnlyGuard, PermissionsGuard)
  @CityAdminOnly()
  @RequiresPermission('tiles', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete a tile',
    description: 'Delete an existing tile. Only Super Admin and City Admin can delete tiles.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier for the tile',
    example: 'tile_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @ApiResponse({
    status: 204,
    description: 'Tile deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
    type: ForbiddenErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tile not found',
    type: NotFoundErrorResponseDto,
  })
  async delete(@Param('id') id: string, @GetCurrentUser() user: CurrentUser): Promise<void> {
    const userId = user.userId;
    const roles = this.getRoles(user.role);
    return this.tilesService.deleteTile(id, userId, roles);
  }

  @Post(':id/background-image')
  @UseGuards(AdminOnlyGuard, PermissionsGuard)
  @CityAdminOnly()
  @RequiresPermission('tiles', 'update')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Upload background image for a tile',
    description:
      'Upload and process a background image for a tile. Only Super Admin and City Admin can upload images.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier for the tile',
    example: 'tile_01J3MJG0YX6FT5PB9SJ9Y2KQW4',
  })
  @ApiResponse({
    status: 200,
    description: 'Background image uploaded successfully',
    type: UploadBackgroundImageResponseDto,
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
    status: 403,
    description: 'Insufficient permissions',
    type: ForbiddenErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tile not found',
    type: NotFoundErrorResponseDto,
  })
  async uploadBackgroundImage(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @GetCurrentUser() user: CurrentUser,
  ): Promise<UploadBackgroundImageResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const userId = user.userId;
    const roles = this.getRoles(user.role);

    // Validate image
    await this.fileUploadService.validateImage(file);

    // Process image
    const processedFile = await this.fileUploadService.processImage(file);

    // Get default bucket
    const bucket = this.configService.storageConfig.defaultBucket;
    if (!bucket) {
      throw new BadRequestException('Storage bucket is not configured');
    }

    // Generate storage key
    const key = this.fileUploadService.generateTileBackgroundKey(id, processedFile.extension);

    // Upload to storage
    const imageUrl = await this.fileUploadService.uploadFile(processedFile, bucket, key);

    // Update tile in database
    const tile = await this.tilesService.updateTile(id, userId, roles, {
      backgroundImageUrl: imageUrl,
    });

    return {
      tile,
      imageUrl,
    };
  }
}
