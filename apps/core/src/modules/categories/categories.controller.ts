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
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateCategoryDto, UpdateCategoryDto } from '@heidi/contracts';
import { CurrentUser, GetCurrentUser, JwtAuthGuard, Public } from '@heidi/jwt';
import { UserRole } from '@prisma/client-core';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  private isAdmin(role?: string) {
    if (!role) {
      return false;
    }
    const normalized = role.toUpperCase() as keyof typeof UserRole;
    const mapped = UserRole[normalized];
    return mapped === UserRole.CITY_ADMIN || mapped === UserRole.SUPER_ADMIN;
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async list() {
    return this.categoriesService.listCategories();
  }

  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Create category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async create(@GetCurrentUser() user: CurrentUser, @Body() dto: CreateCategoryDto) {
    if (!this.isAdmin(user?.role)) {
      throw new ForbiddenException('Admin privileges required');
    }
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
    if (!this.isAdmin(user?.role)) {
      throw new ForbiddenException('Admin privileges required');
    }
    return this.categoriesService.updateCategory(id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string, @GetCurrentUser() user: CurrentUser) {
    if (!this.isAdmin(user?.role)) {
      throw new ForbiddenException('Admin privileges required');
    }
    return this.categoriesService.deleteCategory(id);
  }
}
