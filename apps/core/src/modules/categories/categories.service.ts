import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaCoreService } from '@heidi/prisma';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryResponseDto,
  CategoryQuickFilterDto,
  CategoryFilterDto,
  CategoryListResponseDto,
} from '@heidi/contracts';
import { CategoryRequestStatus, Prisma } from '@prisma/client-core';
import { StorageService } from '@heidi/storage';
import { ConfigService } from '@heidi/config';
import { LoggerService } from '@heidi/logger';
import { TranslationService } from '@heidi/translations';
import { I18nService } from '@heidi/i18n';
import { CategoryQuickFiltersService } from './category-quick-filters.service';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaCoreService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly translationService: TranslationService,
    private readonly i18nService: I18nService,
    private readonly quickFiltersService: CategoryQuickFiltersService,
  ) {
    this.logger.setContext(CategoriesService.name);
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private extractKeyFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 1) {
        return parts.slice(1).join('/');
      }
      return pathname.replace(/^\/[^\/]+\//, '');
    } catch (error) {
      this.logger.warn(`Failed to parse URL: ${url}`, error);
      return url.split('?')[0].replace(/^https?:\/\/[^\/]+\//, '');
    }
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
   * Children inherit parent's imageUrl if their own imageUrl is null
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

    // Third pass: Propagate parent's imageUrl to children that don't have one
    const propagateImageUrl = (cat: any, parentImageUrl: string | null = null) => {
      // If this category doesn't have an imageUrl and parent has one, inherit it
      if (!cat.imageUrl && parentImageUrl) {
        cat.imageUrl = parentImageUrl;
      }

      // Use this category's imageUrl (or inherited one) for its children
      const imageUrlToPropagate = cat.imageUrl || parentImageUrl;

      // Recursively propagate to children
      if (cat.children && cat.children.length > 0) {
        cat.children.forEach((child: any) => {
          propagateImageUrl(child, imageUrlToPropagate);
        });
      }
    };

    // Start propagation from root categories
    rootCategories.forEach((cat) => propagateImageUrl(cat));

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

  /**
   * Fetch and attach children to parent categories
   * Also handles imageUrl inheritance (children inherit parent's imageUrl if their own is null)
   * Only includes active children by default, unless showAll is true
   */
  private async attachChildrenToCategories(
    categories: any[],
    showAll: boolean = false,
  ): Promise<any[]> {
    if (categories.length === 0) return categories;

    const categoryIds = categories.map((c) => c.id);
    const children = await this.prisma.category.findMany({
      where: {
        parentId: { in: categoryIds },
        ...(showAll ? {} : { isActive: true }),
      },
      orderBy: [{ name: 'asc' }],
    });

    // Group children by parentId
    const childrenByParentId = new Map<string, typeof children>();
    children.forEach((child) => {
      if (child.parentId) {
        const existing = childrenByParentId.get(child.parentId) || [];
        existing.push(child);
        childrenByParentId.set(child.parentId, existing);
      }
    });

    // Attach children to their parents with imageUrl inheritance
    return categories.map((cat) => {
      const catChildren = childrenByParentId.get(cat.id) || [];

      // Apply imageUrl inheritance: children without imageUrl inherit from parent
      const childrenWithInheritedImageUrl = catChildren.map((child) => ({
        ...child,
        imageUrl: child.imageUrl || cat.imageUrl,
      }));

      // Only include children property if there are children
      if (childrenWithInheritedImageUrl.length > 0) {
        return {
          ...cat,
          children: childrenWithInheritedImageUrl,
        };
      }
      return cat;
    });
  }

  /**
   * Apply translations to a category node and its children
   */
  private async translateCategoryTree(categories: any[]): Promise<any[]> {
    const locale = this.i18nService.getLanguage();
    const defaultSourceLocale = this.configService.get<string>('i18n.defaultLanguage', 'en');

    this.logger.debug(
      `translateCategoryTree: locale=${locale}, defaultSourceLocale=${defaultSourceLocale}, categoriesCount=${categories.length}`,
    );

    // If no locale requested, return without translation
    if (!locale) {
      this.logger.debug(`Skipping translation: no locale requested`);
      return categories;
    }

    const translateNode = async (category: any): Promise<any> => {
      // Get source language from category (the language the category content is stored in)
      const sourceLocale = category.languageCode || defaultSourceLocale;

      // Skip translation if requested locale matches the category's source language
      if (locale === sourceLocale) {
        // Still process children as they may have different source languages
        if (category.children && category.children.length > 0) {
          category.children = await Promise.all(category.children.map(translateNode));
        }
        return category;
      }

      // Use city-specific entity type if category has city overrides
      // This ensures city-specific displayNames get their own translations
      const entityType = category.hasCityOverride ? 'city-category' : 'category';
      const entityId = category.hasCityOverride ? `${category.cityId}:${category.id}` : category.id;

      this.logger.debug(
        `Translating ${entityType} ${entityId} (${category.name}) from ${sourceLocale} to ${locale}`,
      );

      const [name, description, subtitle] = await Promise.all([
        this.translationService.getTranslation(
          entityType,
          entityId,
          'name',
          locale,
          category.name,
          sourceLocale,
        ),
        this.translationService.getTranslation(
          entityType,
          entityId,
          'description',
          locale,
          category.description ?? '',
          sourceLocale,
        ),
        this.translationService.getTranslation(
          entityType,
          entityId,
          'subtitle',
          locale,
          category.subtitle ?? '',
          sourceLocale,
        ),
      ]);

      let children: any[] | undefined;
      if (category.children && Array.isArray(category.children)) {
        children = await Promise.all(category.children.map((child: any) => translateNode(child)));
      }

      return {
        ...category,
        name,
        description,
        subtitle,
        ...(children ? { children } : {}),
      };
    };

    return Promise.all(categories.map((category) => translateNode(category)));
  }

  async listCategories(
    filter?: CategoryFilterDto,
    showAll: boolean = false,
  ): Promise<CategoryListResponseDto | CategoryResponseDto[]> {
    // Determine if we should only return root categories (default: true)
    // rootOnly=true means: only fetch root categories (parentId=null), then attach their children
    // rootOnly=false means: fetch all categories matching the filter (flat list for hierarchy building)
    const rootOnly = filter?.rootOnly !== false;

    // Build where clause for filtering
    const where: Prisma.CategoryWhereInput = {};

    // Search filter - search in name, description, and subtitle
    if (filter?.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
        { subtitle: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    // Type filter
    if (filter?.type) {
      where.type = filter.type;
    }

    // Parent ID filter - takes precedence over rootOnly
    if (filter?.parentId !== undefined) {
      if (filter.parentId === null || filter.parentId === '') {
        // Explicitly filter for root categories (no parent)
        where.parentId = null;
      } else {
        where.parentId = filter.parentId;
      }
    } else if (rootOnly) {
      // Default behavior: only return root categories (main categories)
      where.parentId = null;
    }

    // Active status filter - only apply if showAll is false and isActive is not explicitly set
    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    } else if (!showAll) {
      // Default: only show active categories unless showAll is true
      where.isActive = true;
    }

    // Category IDs filter
    if (filter?.categoryIds && filter.categoryIds.length > 0) {
      where.id = { in: filter.categoryIds };
    }

    // Exclude children of inactive parents (only when not showing all):
    // - include all root categories (parentId = null)
    // - include non-root categories only if their parent is active
    const andConditions: Prisma.CategoryWhereInput[] = [];
    if (where.AND) {
      andConditions.push(...(Array.isArray(where.AND) ? where.AND : [where.AND]));
    }
    if (!showAll) {
      andConditions.push({
        OR: [{ parentId: null }, { parent: { isActive: true } }],
      });
    }
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // Build orderBy clause
    const orderBy: Prisma.CategoryOrderByWithRelationInput[] = [];
    if (filter?.sortBy) {
      const direction = filter.sortDirection === 'desc' ? 'desc' : 'asc';
      orderBy.push({ [filter.sortBy]: direction });
    } else {
      // Default ordering
      orderBy.push({ type: 'asc' }, { name: 'asc' });
    }

    // Handle pagination
    const page = filter?.page && filter.page > 0 ? filter.page : 1;
    const pageSize = filter?.pageSize && filter.pageSize > 0 ? Math.min(filter.pageSize, 100) : 20;
    const skip = (page - 1) * pageSize;

    // If pagination is requested, return paginated response
    if (filter?.page || filter?.pageSize) {
      const [categories, total] = await Promise.all([
        this.prisma.category.findMany({
          where,
          orderBy,
          skip,
          take: pageSize,
        }),
        this.prisma.category.count({ where }),
      ]);

      // If rootOnly, fetch children for each root category
      let categoriesWithChildren: any[] = categories;
      if (rootOnly && categories.length > 0) {
        categoriesWithChildren = await this.attachChildrenToCategories(categories, showAll);
      }

      const tree = rootOnly
        ? categoriesWithChildren
        : this.buildCategoryHierarchy(categoriesWithChildren);
      const translatedTree = await this.translateCategoryTree(tree);

      const totalPages = Math.ceil(total / pageSize);

      return {
        items: translatedTree,
        meta: {
          page,
          pageSize,
          total,
          totalPages,
        },
      };
    }

    // If no pagination, return all categories as before (for backward compatibility)
    const categories = await this.prisma.category.findMany({
      where,
      orderBy,
    });

    // If rootOnly, fetch children for each root category
    let categoriesWithChildren: any[] = categories;
    if (rootOnly && categories.length > 0) {
      categoriesWithChildren = await this.attachChildrenToCategories(categories, showAll);
    }

    const tree = rootOnly
      ? categoriesWithChildren
      : this.buildCategoryHierarchy(categoriesWithChildren);
    return this.translateCategoryTree(tree);
  }

  /**
   * Get all main/root categories (categories without a parent)
   * Returns a flat list without subcategories nested
   */
  async listMainCategories(): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        parentId: null,
        isActive: true,
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return this.translateCategoryTree(categories);
  }

  async createCategory(dto: CreateCategoryDto, createdBy?: string) {
    const baseSlugCandidate = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);
    const baseSlug = baseSlugCandidate || this.slugify(`${dto.name}-${Date.now()}`);
    const slug = await this.ensureUniqueCategorySlug(baseSlug);

    // Determine source language: use current request language or default
    const sourceLanguage =
      this.i18nService.getLanguage() ||
      this.configService.get<string>('i18n.defaultLanguage', 'en');

    const data: Prisma.CategoryCreateInput = {
      name: dto.name,
      slug,
      description: dto.description ?? null,
      subtitle: dto.subtitle ?? null,
      type: dto.type ?? null,
      languageCode: sourceLanguage,
      isActive: dto.isActive ?? true,
      headerBackgroundColor: dto.headerBackgroundColor ?? null,
      contentBackgroundColor: dto.contentBackgroundColor ?? null,
    };

    if (dto.parentId) {
      data.parent = {
        connect: { id: dto.parentId },
      };
    }

    const category = await this.prisma.category.create({ data });

    // If cities are provided, create city_category mappings
    if (dto.cities && dto.cities.length > 0) {
      const cityCategoryData = dto.cities.map((city) => ({
        cityId: city.cityId,
        categoryId: category.id,
        addedBy: createdBy ?? null,
        isActive: dto.isActive ?? true,
      }));

      await this.prisma.cityCategory.createMany({
        data: cityCategoryData,
        skipDuplicates: true,
      });
    }

    return category;
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

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.subtitle !== undefined) {
      updateData.subtitle = dto.subtitle;
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

    if (dto.headerBackgroundColor !== undefined) {
      updateData.headerBackgroundColor = dto.headerBackgroundColor;
    }

    if (dto.contentBackgroundColor !== undefined) {
      updateData.contentBackgroundColor = dto.contentBackgroundColor;
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

    // Get category to check for images
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException({ errorCode: 'CATEGORY_NOT_FOUND' });
    }

    // Delete image from storage if exists
    if (category.imageUrl) {
      try {
        const key = this.extractKeyFromUrl(category.imageUrl);
        const bucket = this.configService.storageConfig.defaultBucket;
        if (bucket) {
          await this.storageService.deleteFile({ bucket, key });
        }
      } catch (error) {
        this.logger.warn(`Failed to delete image for category ${categoryId}`, error);
      }
    }

    // Delete icon from storage if exists
    if (category.iconUrl) {
      try {
        const key = this.extractKeyFromUrl(category.iconUrl);
        const bucket = this.configService.storageConfig.defaultBucket;
        if (bucket) {
          await this.storageService.deleteFile({ bucket, key });
        }
      } catch (error) {
        this.logger.warn(`Failed to delete icon for category ${categoryId}`, error);
      }
    }

    return this.prisma.category.delete({
      where: { id: categoryId },
    });
  }

  async listCityCategories(
    cityId: string,
    filter?: CategoryFilterDto,
    showAll: boolean = false,
  ): Promise<CategoryListResponseDto | CategoryResponseDto[]> {
    // First, get all CityCategory entries for this city including city-specific overrides
    const cityCategories = await this.prisma.cityCategory.findMany({
      where: {
        cityId,
        ...(showAll ? {} : { isActive: true }),
      },
      select: {
        categoryId: true,
        displayOrder: true,
        displayName: true,
        description: true,
        subtitle: true,
        languageCode: true,
        imageUrl: true,
        iconUrl: true,
        headerBackgroundColor: true,
        contentBackgroundColor: true,
        isActive: true,
      },
    });

    // Create a map for quick lookup of city-specific overrides
    const cityCategoryMap = new Map<string, (typeof cityCategories)[number]>();
    cityCategories.forEach((cc) => {
      cityCategoryMap.set(cc.categoryId, cc);
    });

    // Get all category IDs that are explicitly assigned to this city
    const assignedCategoryIds = cityCategories.map((cc) => cc.categoryId);

    // Only fetch categories that are explicitly assigned via CityCategory
    // and exclude children of inactive parents or parents not assigned to this city (when not showing all):
    // - include all root categories (parentId = null)
    // - include non-root categories only if:
    //   - their parent category is active AND
    //   - their parent is also assigned to this city (has active CityCategory)
    const categoryWhereCondition: Prisma.CategoryWhereInput = {
      id: { in: assignedCategoryIds },
      ...(showAll ? {} : { isActive: true }),
    };

    // Only add the parent active check when not showing all
    if (!showAll) {
      categoryWhereCondition.AND = [
        {
          OR: [
            { parentId: null },
            {
              AND: [{ parent: { isActive: true } }, { parentId: { in: assignedCategoryIds } }],
            },
          ],
        },
      ];
    }

    const categories = await this.prisma.category.findMany({
      where: categoryWhereCondition,
    });

    // Merge CityCategory overrides with base Category data
    // CityCategory fields take precedence over base Category fields when not null
    const categoriesWithOrder = categories.map((category) => {
      const cityOverrides = cityCategoryMap.get(category.id);
      const hasCityOverride = Boolean(cityOverrides?.displayName);
      return {
        ...category,
        // Use city-specific values if they exist, otherwise fall back to base category values
        name: cityOverrides?.displayName || category.name,
        description: cityOverrides?.description ?? category.description,
        subtitle: cityOverrides?.subtitle ?? category.subtitle,
        imageUrl: cityOverrides?.imageUrl || category.imageUrl,
        iconUrl: cityOverrides?.iconUrl || category.iconUrl,
        headerBackgroundColor:
          cityOverrides?.headerBackgroundColor || category.headerBackgroundColor,
        contentBackgroundColor:
          cityOverrides?.contentBackgroundColor || category.contentBackgroundColor,
        // Use CityCategory's languageCode for translation source if available
        languageCode: cityOverrides?.languageCode || category.languageCode,
        cityCategoryDisplayOrder: cityOverrides?.displayOrder,
        // Use CityCategory's isActive status (city-specific active state)
        isActive: cityOverrides?.isActive ?? category.isActive,
        // Flag to indicate this category has city-specific text that needs city-specific translation
        hasCityOverride,
        cityId, // Pass cityId for translation lookup
      };
    });

    // Sort categories by their CityCategory displayOrder before building hierarchy
    const sortedCategories = [...categoriesWithOrder].sort((a, b) => {
      const orderA = a.cityCategoryDisplayOrder ?? 0;
      const orderB = b.cityCategoryDisplayOrder ?? 0;
      return orderA - orderB;
    });

    // Build hierarchy
    const tree = this.buildCategoryHierarchy(sortedCategories);

    // Apply search filter (search in name, description, subtitle on root and children)
    let filteredTree = tree;
    if (filter?.search) {
      const term = filter.search.toLowerCase();
      const nodeMatches = (category: any): boolean => {
        const text =
          (category.name || '') +
          ' ' +
          (category.description || '') +
          ' ' +
          (category.subtitle || '');
        if (text.toLowerCase().includes(term)) {
          return true;
        }
        if (category.children && Array.isArray(category.children)) {
          return category.children.some((child: any) => nodeMatches(child));
        }
        return false;
      };
      filteredTree = tree.filter((category) => nodeMatches(category));
    }

    // Handle pagination similar to listCategories
    if (filter?.page || filter?.pageSize) {
      const page = filter?.page && filter.page > 0 ? filter.page : 1;
      const pageSize =
        filter?.pageSize && filter.pageSize > 0 ? Math.min(filter.pageSize, 100) : 20;
      const total = filteredTree.length;
      const totalPages = Math.ceil(total / pageSize);
      const skip = (page - 1) * pageSize;
      const pagedItems = filteredTree.slice(skip, skip + pageSize);
      const translatedItems = await this.translateCategoryTree(pagedItems);

      return {
        items: translatedItems,
        meta: {
          page,
          pageSize,
          total,
          totalPages,
        },
      };
    }

    // No pagination: translate full filtered tree
    return this.translateCategoryTree(filteredTree);
  }

  /**
   * Attach virtual quick-filter children to root categories in the tree.
   * Virtual children are marked with isQuickFilter=true and contain quickFilter.
   * Quick filters and subcategories are merged and sorted together by order:
   * - Quick filters with order 0 (e.g., "nearby") appear first
   * - Subcategories appear in the middle (using displayOrder from CityCategory, default 100)
   * - Quick filters with order 999 (e.g., "see all") appear last
   */
  private attachQuickFilterChildren(
    categories: any[],
    quickFiltersByCategorySlug: Record<string, CategoryQuickFilterDto[]>,
  ): void {
    for (const category of categories) {
      // Only attach to root categories (no parentId)
      if (!category.parentId) {
        const quickFilters = quickFiltersByCategorySlug[category.slug];

        // Get existing subcategories (real children) and assign order from CityCategory displayOrder
        const existingChildren = (category.children || []).map((child: any) => ({
          ...child,
          order: child.cityCategoryDisplayOrder ?? 100, // Use CityCategory displayOrder, default to 100
        }));

        if (quickFilters && quickFilters.length > 0) {
          // Sort quick filters by order
          const sortedFilters = [...quickFilters].sort((a, b) => a.order - b.order);

          // Create virtual child nodes for each quick filter
          const virtualChildren = sortedFilters.map((filter) => ({
            id: `quick-${category.slug}-${filter.key}`,
            name: filter.label,
            slug: `${category.slug}__${filter.key}`,
            description: null,
            subtitle: null,
            imageUrl: null,
            iconUrl: null,
            headerBackgroundColor: null,
            contentBackgroundColor: null,
            type: null,
            parentId: category.id,
            languageCode: null,
            isActive: true,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
            isQuickFilter: true,
            quickFilter: filter.key,
            radiusMeters: filter.radiusMeters ?? null,
            order: filter.order,
          }));

          // Merge quick filters and subcategories
          const allChildren = [...virtualChildren, ...existingChildren];

          // Sort all children by order
          allChildren.sort((a, b) => {
            const orderA = a.order ?? 100;
            const orderB = b.order ?? 100;
            // If order is the same, sort by name for consistency
            if (orderA === orderB) {
              return (a.name || '').localeCompare(b.name || '');
            }
            return orderA - orderB;
          });

          // Replace children array with sorted merged array
          category.children = allChildren;
        } else {
          // No quick filters, but sort subcategories by displayOrder
          existingChildren.sort((a: any, b: any) => {
            const orderA = a.order ?? 100;
            const orderB = b.order ?? 100;
            if (orderA === orderB) {
              return (a.name || '').localeCompare(b.name || '');
            }
            return orderA - orderB;
          });
          category.children = existingChildren;
        }
      }

      // Recursively process children (in case we want to support nested quick filters later)
      if (category.children && Array.isArray(category.children)) {
        this.attachQuickFilterChildren(category.children, quickFiltersByCategorySlug);
      }
    }
  }

  /**
   * List city categories with quick filters attached as virtual children.
   * Quick filters (Nearby, See all) are embedded in the children array of root categories,
   * marked with isQuickFilter=true for easy identification by the app.
   */
  async listCityCategoriesWithFilters(cityId: string): Promise<CategoryResponseDto[]> {
    const result = await this.listCityCategories(cityId);
    const categories = Array.isArray(result) ? result : result.items;
    const quickFiltersByCategorySlug =
      await this.quickFiltersService.getQuickFiltersForCity(cityId);

    // Attach virtual quick-filter children to the category tree
    this.attachQuickFilterChildren(categories, quickFiltersByCategorySlug);

    return categories;
  }

  async getCategoryById(categoryId: string, showAll: boolean = false) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException({ errorCode: 'CATEGORY_NOT_FOUND' });
    }

    // Get subcategories (children) - all or only active based on showAll parameter
    const children = await this.prisma.category.findMany({
      where: {
        parentId: categoryId,
        ...(showAll ? {} : { isActive: true }),
      },
      orderBy: { name: 'asc' },
    });

    // Propagate parent's imageUrl to children that don't have one
    const childrenWithInheritedImageUrl = children.map((child) => ({
      ...child,
      imageUrl: child.imageUrl || category.imageUrl,
    }));

    const tree = await this.translateCategoryTree([
      {
        ...category,
        ...(childrenWithInheritedImageUrl.length > 0
          ? { children: childrenWithInheritedImageUrl }
          : {}),
      },
    ]);

    return tree[0];
  }

  /**
   * Transform CityCategory response:
   * - Rename displayName to name
   * - Use categoryId as id, remove categoryId field
   */
  private transformCityCategoryResponse(cityCategory: any): any {
    if (!cityCategory) return cityCategory;
    const { displayName, categoryId, id: _originalId, ...rest } = cityCategory;
    return {
      id: categoryId,
      ...rest,
      name: displayName,
    };
  }

  async assignCategoryToCity(cityId: string, categoryId: string, addedBy: string, name?: string) {
    const result = await this.prisma.cityCategory.upsert({
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
        displayName: name !== undefined ? name : undefined, // Only update if provided
      },
      create: {
        cityId,
        categoryId,
        addedBy,
        displayName: name ?? null, // Default to null if not provided
      },
      include: {
        category: true,
      },
    });
    return this.transformCityCategoryResponse(result);
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
      return this.transformCityCategoryResponse(existing);
    }

    const result = await this.prisma.cityCategory.update({
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
    return this.transformCityCategoryResponse(result);
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

  async updateCityCategoryDisplayName(
    cityId: string,
    categoryId: string,
    name: string | null,
    description?: string | null,
    subtitle?: string | null,
    displayOrder?: number,
    headerBackgroundColor?: string | null,
    contentBackgroundColor?: string | null,
    isActive?: boolean,
  ) {
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

    const updateData: Prisma.CityCategoryUpdateInput = {
      displayName: name,
    };

    if (description !== undefined) {
      updateData.description = description;
    }

    if (subtitle !== undefined) {
      updateData.subtitle = subtitle;
    }

    if (displayOrder !== undefined) {
      updateData.displayOrder = displayOrder;
    }

    if (headerBackgroundColor !== undefined) {
      updateData.headerBackgroundColor = headerBackgroundColor;
    }

    if (contentBackgroundColor !== undefined) {
      updateData.contentBackgroundColor = contentBackgroundColor;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const result = await this.prisma.cityCategory.update({
      where: {
        cityId_categoryId: {
          cityId,
          categoryId,
        },
      },
      data: updateData,
      include: {
        category: true,
      },
    });
    return this.transformCityCategoryResponse(result);
  }

  /**
   * Get a single city category by cityId and categoryId
   * Falls back to base category values for any null city-specific fields
   * Uses categoryId as id field in response
   * Includes children categories if they are also assigned to the same city
   */
  async getCityCategoryById(cityId: string, categoryId: string, showAll: boolean = false) {
    const cityCategory = await this.prisma.cityCategory.findUnique({
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

    if (!cityCategory) {
      throw new NotFoundException({ errorCode: 'CITY_CATEGORY_MAPPING_NOT_FOUND' });
    }

    const category = cityCategory.category;

    // Build base response with fallback to category defaults for null fields
    // Use categoryId as id, exclude original id and categoryId fields
    const { displayName, categoryId: catId, id: _originalId, ...rest } = cityCategory;
    const baseResponse = {
      id: catId,
      ...rest,
      name: displayName ?? category?.name ?? null,
      description: cityCategory.description ?? category?.description ?? null,
      subtitle: cityCategory.subtitle ?? category?.subtitle ?? null,
      imageUrl: cityCategory.imageUrl ?? category?.imageUrl ?? null,
      iconUrl: cityCategory.iconUrl ?? category?.iconUrl ?? null,
      headerBackgroundColor:
        cityCategory.headerBackgroundColor ?? category?.headerBackgroundColor ?? null,
      contentBackgroundColor:
        cityCategory.contentBackgroundColor ?? category?.contentBackgroundColor ?? null,
    };

    // Fetch children categories that are assigned to this city
    // Show all or only active based on showAll parameter
    const childrenCategories = await this.prisma.category.findMany({
      where: {
        parentId: categoryId,
        ...(showAll ? {} : { isActive: true }),
      },
      orderBy: { name: 'asc' },
    });

    if (childrenCategories.length === 0) {
      return baseResponse;
    }

    // Get CityCategory entries for all children to apply city-specific overrides
    const childrenCategoryIds = childrenCategories.map((c) => c.id);
    const childrenCityCategories = await this.prisma.cityCategory.findMany({
      where: {
        cityId,
        categoryId: { in: childrenCategoryIds },
        ...(showAll ? {} : { isActive: true }),
      },
      select: {
        categoryId: true,
        displayOrder: true,
        displayName: true,
        description: true,
        subtitle: true,
        imageUrl: true,
        iconUrl: true,
        headerBackgroundColor: true,
        contentBackgroundColor: true,
        isActive: true,
      },
    });

    // Create a map for quick lookup of city-specific overrides for children
    const childrenCityCategoryMap = new Map<string, (typeof childrenCityCategories)[number]>();
    childrenCityCategories.forEach((cc) => {
      childrenCityCategoryMap.set(cc.categoryId, cc);
    });

    // Only include children that are assigned to this city
    const assignedChildrenIds = new Set(childrenCityCategories.map((cc) => cc.categoryId));
    const assignedChildren = childrenCategories.filter((child) =>
      assignedChildrenIds.has(child.id),
    );

    // Merge CityCategory overrides with base Category data for children
    const childrenWithOverrides = assignedChildren.map((child) => {
      const cityOverrides = childrenCityCategoryMap.get(child.id);
      return {
        ...child,
        id: child.id,
        name: cityOverrides?.displayName || child.name,
        description: cityOverrides?.description ?? child.description,
        subtitle: cityOverrides?.subtitle ?? child.subtitle,
        imageUrl: cityOverrides?.imageUrl || child.imageUrl || baseResponse.imageUrl, // Inherit from parent if null
        iconUrl: cityOverrides?.iconUrl || child.iconUrl,
        headerBackgroundColor: cityOverrides?.headerBackgroundColor || child.headerBackgroundColor,
        contentBackgroundColor:
          cityOverrides?.contentBackgroundColor || child.contentBackgroundColor,
        cityCategoryDisplayOrder: cityOverrides?.displayOrder,
        // Use CityCategory's isActive status (city-specific active state)
        isActive: cityOverrides?.isActive ?? child.isActive,
        hasCityOverride: Boolean(cityOverrides?.displayName),
        cityId,
      };
    });

    // Sort children by displayOrder
    childrenWithOverrides.sort((a, b) => {
      const orderA = a.cityCategoryDisplayOrder ?? 0;
      const orderB = b.cityCategoryDisplayOrder ?? 0;
      return orderA - orderB;
    });

    // Translate the category tree (parent + children)
    const tree = await this.translateCategoryTree([
      {
        ...baseResponse,
        children: childrenWithOverrides,
      },
    ]);

    return tree[0];
  }
}
