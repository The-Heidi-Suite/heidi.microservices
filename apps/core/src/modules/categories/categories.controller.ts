import {
  BadRequestException,
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
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateCategoryDto, UpdateCategoryDto } from '@heidi/contracts';
import { CurrentUser, GetCurrentUser, JwtAuthGuard } from '@heidi/jwt';
import { CategoryRequestStatus, UserRole } from '@prisma/client-core';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  private isSuperAdmin(role?: string) {
    if (!role) {
      return false;
    }
    const normalized = role.toUpperCase() as keyof typeof UserRole;
    return UserRole[normalized] === UserRole.SUPER_ADMIN;
  }

  private isCityAdmin(role?: string) {
    if (!role) {
      return false;
    }
    const normalized = role.toUpperCase() as keyof typeof UserRole;
    return UserRole[normalized] === UserRole.CITY_ADMIN;
  }

  private assertSuperAdmin(role?: string) {
    if (!this.isSuperAdmin(role)) {
      throw new ForbiddenException('Super admin privileges required');
    }
  }

  private assertCityAdmin(role?: string) {
    if (!this.isCityAdmin(role)) {
      throw new ForbiddenException('City admin privileges required');
    }
  }

  private assertSuperAdminOrCityAdmin(role?: string) {
    if (!(this.isSuperAdmin(role) || this.isCityAdmin(role))) {
      throw new ForbiddenException('City admin or super admin privileges required');
    }
  }

  private parseRequestStatus(value?: string): CategoryRequestStatus | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.toUpperCase() as keyof typeof CategoryRequestStatus;
    if (!(normalized in CategoryRequestStatus)) {
      throw new BadRequestException('Invalid category request status');
    }
    return CategoryRequestStatus[normalized];
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async list(@GetCurrentUser() user: CurrentUser) {
    this.assertSuperAdmin(user?.role);
    return this.categoriesService.listCategories();
  }

  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Create category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async create(@GetCurrentUser() user: CurrentUser, @Body() dto: CreateCategoryDto) {
    this.assertSuperAdmin(user?.role);
    return this.categoriesService.createCategory(dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  async update(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: UpdateCategoryDto,
  ) {
    this.assertSuperAdmin(user?.role);
    return this.categoriesService.updateCategory(id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @GetCurrentUser() user: CurrentUser) {
    this.assertSuperAdmin(user?.role);
    return this.categoriesService.deleteCategory(id);
  }

  @ApiBearerAuth('JWT-auth')
  @Get('cities/:cityId')
  @ApiOperation({ summary: 'List categories assigned to a city' })
  @ApiResponse({ status: 200, description: 'City categories retrieved successfully' })
  async listCityCategories(@Param('cityId') cityId: string, @GetCurrentUser() user: CurrentUser) {
    this.assertSuperAdminOrCityAdmin(user?.role);

    if (this.isCityAdmin(user?.role)) {
      const hasAccess = await this.categoriesService.cityAdminHasAccess(user.userId, cityId);
      if (!hasAccess) {
        throw new ForbiddenException('You are not assigned to this city');
      }
    }

    return this.categoriesService.listCityCategories(cityId);
  }

  @ApiBearerAuth('JWT-auth')
  @Post('cities/:cityId/assign')
  @ApiOperation({ summary: 'Assign category to city (super admin only)' })
  @ApiResponse({ status: 201, description: 'Category assigned to city' })
  async assignCategory(
    @Param('cityId') cityId: string,
    @GetCurrentUser() user: CurrentUser,
    @Body('categoryId') categoryId: string,
  ) {
    this.assertSuperAdmin(user?.role);
    return this.categoriesService.assignCategoryToCity(cityId, categoryId, user.userId);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete('cities/:cityId/categories/:categoryId')
  @ApiOperation({ summary: 'Remove category from city (super admin only)' })
  @ApiResponse({ status: 200, description: 'Category removed from city' })
  async removeCategory(
    @Param('cityId') cityId: string,
    @Param('categoryId') categoryId: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    this.assertSuperAdmin(user?.role);
    return this.categoriesService.removeCategoryFromCity(cityId, categoryId);
  }

  @ApiBearerAuth('JWT-auth')
  @Post('cities/:cityId/requests')
  @ApiOperation({ summary: 'City admin requests a category for their city' })
  @ApiResponse({ status: 201, description: 'Category request created' })
  async requestCategory(
    @Param('cityId') cityId: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() body: { categoryId: string; notes?: string },
  ) {
    this.assertCityAdmin(user?.role);

    const hasAccess = await this.categoriesService.cityAdminHasAccess(user.userId, cityId);
    if (!hasAccess) {
      throw new ForbiddenException('You are not assigned to this city');
    }

    return this.categoriesService.requestCityCategory(
      cityId,
      body.categoryId,
      user.userId,
      body.notes,
    );
  }

  @ApiBearerAuth('JWT-auth')
  @Get('requests')
  @ApiOperation({ summary: 'List category requests' })
  @ApiResponse({ status: 200, description: 'Category requests retrieved successfully' })
  async listRequests(
    @GetCurrentUser() user: CurrentUser,
    @Query('cityId') cityId?: string,
    @Query('status') status?: string,
  ) {
    this.assertSuperAdmin(user?.role);
    const parsedStatus = this.parseRequestStatus(status);
    return this.categoriesService.listCategoryRequests({ cityId, status: parsedStatus });
  }

  @ApiBearerAuth('JWT-auth')
  @Get('cities/:cityId/requests')
  @ApiOperation({ summary: 'List category requests for a city' })
  @ApiResponse({ status: 200, description: 'Category requests for city retrieved' })
  async listCityRequests(
    @Param('cityId') cityId: string,
    @GetCurrentUser() user: CurrentUser,
    @Query('status') status?: string,
  ) {
    this.assertSuperAdminOrCityAdmin(user?.role);

    if (this.isCityAdmin(user?.role)) {
      const hasAccess = await this.categoriesService.cityAdminHasAccess(user.userId, cityId);
      if (!hasAccess) {
        throw new ForbiddenException('You are not assigned to this city');
      }
    }

    const parsedStatus = this.parseRequestStatus(status);
    return this.categoriesService.listCategoryRequests({ cityId, status: parsedStatus });
  }

  @ApiBearerAuth('JWT-auth')
  @Post('requests/:requestId/resolve')
  @ApiOperation({ summary: 'Resolve a category request (super admin only)' })
  @ApiResponse({ status: 200, description: 'Category request resolved' })
  async resolveRequest(
    @Param('requestId') requestId: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() body: { status: CategoryRequestStatus; notes?: string },
  ) {
    this.assertSuperAdmin(user?.role);
    return this.categoriesService.handleCategoryRequest(
      requestId,
      body.status,
      user.userId,
      body.notes,
    );
  }
}
