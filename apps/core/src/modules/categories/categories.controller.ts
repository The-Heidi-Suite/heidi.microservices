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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateCategoryDto, UpdateCategoryDto } from '@heidi/contracts';
import { CurrentUser, GetCurrentUser, JwtAuthGuard } from '@heidi/jwt';
import { CategoryRequestStatus, UserRole } from '@prisma/client-core';
import { CategoriesService } from './categories.service';
import { AdminOnlyGuard, SuperAdminOnly, CityAdminOnly } from '@heidi/rbac';

@ApiTags('categories')
@Controller('categories')
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

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
  @SuperAdminOnly()
  async list(@GetCurrentUser() user: CurrentUser) {
    return this.categoriesService.listCategories();
  }

  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Create category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @SuperAdminOnly()
  async create(@GetCurrentUser() user: CurrentUser, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @SuperAdminOnly()
  async update(
    @Param('id') id: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @HttpCode(HttpStatus.OK)
  @SuperAdminOnly()
  async delete(@Param('id') id: string, @GetCurrentUser() user: CurrentUser) {
    return this.categoriesService.deleteCategory(id);
  }

  @ApiBearerAuth('JWT-auth')
  @Get('cities/:cityId')
  @ApiOperation({ summary: 'List categories assigned to a city' })
  @ApiResponse({ status: 200, description: 'City categories retrieved successfully' })
  @CityAdminOnly()
  async listCityCategories(@Param('cityId') cityId: string, @GetCurrentUser() user: CurrentUser) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      const hasAccess = await this.categoriesService.cityAdminHasAccess(user.userId, cityId);
      if (!hasAccess) {
        throw new BadRequestException('You are not assigned to this city');
      }
    }

    return this.categoriesService.listCityCategories(cityId);
  }

  @ApiBearerAuth('JWT-auth')
  @Post('cities/:cityId/assign')
  @ApiOperation({ summary: 'Assign category to city (super admin only)' })
  @ApiResponse({ status: 201, description: 'Category assigned to city' })
  @SuperAdminOnly()
  async assignCategory(
    @Param('cityId') cityId: string,
    @GetCurrentUser() user: CurrentUser,
    @Body('categoryId') categoryId: string,
  ) {
    return this.categoriesService.assignCategoryToCity(cityId, categoryId, user.userId);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete('cities/:cityId/categories/:categoryId')
  @ApiOperation({ summary: 'Remove category from city (super admin only)' })
  @ApiResponse({ status: 200, description: 'Category removed from city' })
  @SuperAdminOnly()
  async removeCategory(
    @Param('cityId') cityId: string,
    @Param('categoryId') categoryId: string,
    @GetCurrentUser() user: CurrentUser,
  ) {
    return this.categoriesService.removeCategoryFromCity(cityId, categoryId);
  }

  @ApiBearerAuth('JWT-auth')
  @Post('cities/:cityId/requests')
  @ApiOperation({ summary: 'City admin requests a category for their city' })
  @ApiResponse({ status: 201, description: 'Category request created' })
  @CityAdminOnly()
  async requestCategory(
    @Param('cityId') cityId: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() body: { categoryId: string; notes?: string },
  ) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      const hasAccess = await this.categoriesService.cityAdminHasAccess(user.userId, cityId);
      if (!hasAccess) {
        throw new BadRequestException('You are not assigned to this city');
      }
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
  @SuperAdminOnly()
  async listRequests(
    @GetCurrentUser() user: CurrentUser,
    @Query('cityId') cityId?: string,
    @Query('status') status?: string,
  ) {
    const parsedStatus = this.parseRequestStatus(status);
    return this.categoriesService.listCategoryRequests({ cityId, status: parsedStatus });
  }

  @ApiBearerAuth('JWT-auth')
  @Get('cities/:cityId/requests')
  @ApiOperation({ summary: 'List category requests for a city' })
  @ApiResponse({ status: 200, description: 'Category requests for city retrieved' })
  @CityAdminOnly()
  async listCityRequests(
    @Param('cityId') cityId: string,
    @GetCurrentUser() user: CurrentUser,
    @Query('status') status?: string,
  ) {
    if (user.role !== UserRole.SUPER_ADMIN) {
      const hasAccess = await this.categoriesService.cityAdminHasAccess(user.userId, cityId);
      if (!hasAccess) {
        throw new BadRequestException('You are not assigned to this city');
      }
    }

    const parsedStatus = this.parseRequestStatus(status);
    return this.categoriesService.listCategoryRequests({ cityId, status: parsedStatus });
  }

  @ApiBearerAuth('JWT-auth')
  @Post('requests/:requestId/resolve')
  @ApiOperation({ summary: 'Resolve a category request (super admin only)' })
  @ApiResponse({ status: 200, description: 'Category request resolved' })
  @SuperAdminOnly()
  async resolveRequest(
    @Param('requestId') requestId: string,
    @GetCurrentUser() user: CurrentUser,
    @Body() body: { status: CategoryRequestStatus; notes?: string },
  ) {
    return this.categoriesService.handleCategoryRequest(
      requestId,
      body.status,
      user.userId,
      body.notes,
    );
  }
}
