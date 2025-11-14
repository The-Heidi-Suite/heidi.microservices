import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaCoreService } from '@heidi/prisma';
import { CreateCategoryDto, UpdateCategoryDto } from '@heidi/contracts';
import { CategoryRequestStatus, Prisma } from '@prisma/client-core';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaCoreService) {}

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async ensureUniqueCategorySlug(baseSlug: string, currentId?: string) {
    let candidate = baseSlug;
    let counter = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing || existing.id === currentId) {
        return candidate;
      }

      candidate = `${baseSlug}-${counter++}`;
    }
  }

  /**
   * Build hierarchical category structure with children nested inside parents
   */
  private buildCategoryHierarchy(categories: any[]): any[] {
    const categoryMap = new Map<string, any>();
    const rootCategories: any[] = [];

    // First pass: Create a map of all categories and add children array
    categories.forEach((category) => {
      categoryMap.set(category.id, {
        ...category,
        children: [],
      });
    });

    // Second pass: Build the hierarchy
    categories.forEach((category) => {
      const categoryWithChildren = categoryMap.get(category.id);

      if (category.parentId) {
        // This is a subcategory, add it to its parent's children array
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(categoryWithChildren);
        } else {
          // Parent not found in list, treat as root
          rootCategories.push(categoryWithChildren);
        }
      } else {
        // This is a root category
        rootCategories.push(categoryWithChildren);
      }
    });

    // Remove empty children arrays for cleaner output
    const removeEmptyChildren = (cat: any) => {
      if (cat.children && cat.children.length === 0) {
        delete cat.children;
      } else if (cat.children && cat.children.length > 0) {
        cat.children.forEach(removeEmptyChildren);
      }
    };

    rootCategories.forEach(removeEmptyChildren);

    return rootCategories;
  }

  async listCategories() {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return this.buildCategoryHierarchy(categories);
  }

  async createCategory(dto: CreateCategoryDto) {
    const baseSlugCandidate = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);
    const baseSlug = baseSlugCandidate || this.slugify(`${dto.name}-${Date.now()}`);
    const slug = await this.ensureUniqueCategorySlug(baseSlug);

    const data: Prisma.CategoryCreateInput = {
      name: dto.name,
      slug,
      type: dto.type ?? null,
      isActive: dto.isActive ?? true,
    };

    if (dto.parentId) {
      data.parent = {
        connect: { id: dto.parentId },
      };
    }

    return this.prisma.category.create({ data });
  }

  async updateCategory(categoryId: string, dto: UpdateCategoryDto) {
    const updateData: Prisma.CategoryUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.slug !== undefined) {
      const baseSlug = this.slugify(dto.slug);
      updateData.slug = await this.ensureUniqueCategorySlug(baseSlug, categoryId);
    }

    if (dto.type !== undefined) {
      updateData.type = dto.type;
    }

    if (dto.parentId !== undefined) {
      updateData.parent = dto.parentId
        ? {
            connect: { id: dto.parentId },
          }
        : { disconnect: true };
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    return this.prisma.category.update({
      where: { id: categoryId },
      data: updateData,
    });
  }

  async deleteCategory(categoryId: string) {
    const usageCount = await this.prisma.listingCategory.count({
      where: { categoryId },
    });

    if (usageCount > 0) {
      throw new BadRequestException({ errorCode: 'CATEGORY_IN_USE' });
    }

    return this.prisma.category.delete({
      where: { id: categoryId },
    });
  }

  async listCityCategories(cityId: string) {
    const cityCategories = await this.prisma.cityCategory.findMany({
      where: { cityId, isActive: true },
      include: {
        category: true,
      },
      orderBy: { addedAt: 'desc' },
    });

    // Extract just the category objects
    const categories = cityCategories.map((cc) => cc.category);

    return this.buildCategoryHierarchy(categories);
  }

  async getCategoryById(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException({ errorCode: 'CATEGORY_NOT_FOUND' });
    }

    // Get all subcategories (children)
    const children = await this.prisma.category.findMany({
      where: { parentId: categoryId },
      orderBy: { name: 'asc' },
    });

    return {
      ...category,
      ...(children.length > 0 ? { children } : {}),
    };
  }

  async assignCategoryToCity(cityId: string, categoryId: string, addedBy: string) {
    return this.prisma.cityCategory.upsert({
      where: {
        cityId_categoryId: {
          cityId,
          categoryId,
        },
      },
      update: {
        isActive: true,
        addedBy,
        addedAt: new Date(),
      },
      create: {
        cityId,
        categoryId,
        addedBy,
      },
      include: {
        category: true,
      },
    });
  }

  async removeCategoryFromCity(cityId: string, categoryId: string) {
    const existing = await this.prisma.cityCategory.findUnique({
      where: {
        cityId_categoryId: {
          cityId,
          categoryId,
        },
      },
      include: {
        category: true,
      },
    });

    if (!existing) {
      throw new NotFoundException({ errorCode: 'CITY_CATEGORY_MAPPING_NOT_FOUND' });
    }

    if (!existing.isActive) {
      return existing;
    }

    return this.prisma.cityCategory.update({
      where: {
        cityId_categoryId: {
          cityId,
          categoryId,
        },
      },
      data: {
        isActive: false,
      },
      include: {
        category: true,
      },
    });
  }

  async requestCityCategory(
    cityId: string,
    categoryId: string,
    requestedBy: string,
    notes?: string,
  ) {
    return this.prisma.categoryRequest.upsert({
      where: {
        cityId_categoryId_requestedBy_status: {
          cityId,
          categoryId,
          requestedBy,
          status: CategoryRequestStatus.PENDING,
        },
      },
      update: {
        notes,
      },
      create: {
        cityId,
        categoryId,
        requestedBy,
        notes,
      },
      include: {
        category: true,
      },
    });
  }

  async listCategoryRequests(options: { cityId?: string; status?: CategoryRequestStatus } = {}) {
    const { cityId, status } = options;

    return this.prisma.categoryRequest.findMany({
      where: {
        ...(cityId && { cityId }),
        ...(status && { status }),
      },
      include: {
        category: true,
      },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async handleCategoryRequest(
    requestId: string,
    status: CategoryRequestStatus,
    handledBy: string,
    notes?: string,
  ) {
    const request = await this.prisma.categoryRequest.update({
      where: { id: requestId },
      data: {
        status,
        handledBy,
        handledAt: new Date(),
        notes,
      },
      include: {
        category: true,
      },
    });

    if (status === CategoryRequestStatus.APPROVED) {
      await this.assignCategoryToCity(request.cityId, request.categoryId, handledBy);
    }

    return request;
  }

  async cityAdminHasAccess(userId: string, cityId: string) {
    const assignment = await this.prisma.userCityAssignment.findFirst({
      where: {
        userId,
        cityId,
        isActive: true,
      },
      select: { id: true },
    });

    return Boolean(assignment);
  }
}
