#!/usr/bin/env ts-node
/**
 * Category Seeding Script
 *
 * Seeds the core database with a default category tree that covers the primary
 * CategoryType enum values defined in `libs/prisma/src/schemas/core/schema.prisma`.
 *
 * Prerequisites:
 * 1. Run Prisma migrations: npm run prisma:migrate
 * 2. Regenerate Prisma client: npm run prisma:generate
 *
 * Run: npm run seed:categories
 * Or: npx ts-node -r tsconfig-paths/register scripts/seed-categories.ts
 */

// Register tsconfig-paths to resolve TypeScript path mappings
import 'tsconfig-paths/register';

import { PrismaClient, CategoryType } from '@prisma/client-core';
import {
  CATEGORY_ASSETS,
  getCategoryImageUrl,
  getCategoryIconUrl,
} from './assets/category-assets-mapping';

const prisma = new PrismaClient();
const DEFAULT_CATEGORY_LANGUAGE = 'en';

type CategorySeed = {
  name: string;
  slug: string;
  type?: CategoryType;
  isActive?: boolean;
  subtitle?: string;
  description?: string;
  languageCode?: string;
  imageUrl?: string;
  iconUrl?: string;
  headerBackgroundColor?: string;
  contentBackgroundColor?: string;
  children?: CategorySeed[];
};

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    name: 'News',
    slug: 'news',
    type: CategoryType.NEWS,
    children: [
      {
        name: 'Official Announcements',
        slug: 'news-official-announcements',
        type: CategoryType.NEWS,
      },
      { name: 'Press Releases', slug: 'news-press-releases', type: CategoryType.NEWS },
      { name: 'Service Alerts', slug: 'news-service-alerts', type: CategoryType.NEWS },
    ],
  },
  {
    name: 'Events',
    slug: 'events',
    type: CategoryType.EVENT,
    children: [],
  },
  {
    name: 'Food & Drink',
    slug: 'food-and-drink',
    type: CategoryType.GASTRO,
    children: [
      {
        name: 'Restaurants & Bistros',
        slug: 'food-restaurants-bistros',
        type: CategoryType.GASTRO,
      },
      { name: 'Cafes & Bakeries', slug: 'food-cafes-bakeries', type: CategoryType.GASTRO },
      { name: 'Bars & Nightlife', slug: 'food-bars-nightlife', type: CategoryType.GASTRO },
      { name: 'Fish Restaurants', slug: 'food-fish-restaurants', type: CategoryType.GASTRO },
      {
        name: 'Vegetarian & Vegan',
        slug: 'food-vegetarian-vegan',
        type: CategoryType.GASTRO,
      },
    ],
  },
  {
    name: 'Tours',
    slug: 'tours',
    type: CategoryType.TOUR,
    children: [
      { name: 'Guided Tours', slug: 'tours-guided', type: CategoryType.TOUR },
      { name: 'Self-Guided Routes', slug: 'tours-self-guided', type: CategoryType.TOUR },
      { name: 'Family Experiences', slug: 'tours-family-experiences', type: CategoryType.TOUR },
    ],
  },
  {
    name: 'Shopping',
    slug: 'shopping',
    type: CategoryType.POI, // Shopping is fed from POI data
    children: [
      { name: 'City Center', slug: 'shopping-city-center', type: CategoryType.POI },
      {
        name: 'Clothing',
        slug: 'shopping-clothing',
        type: CategoryType.POI,
      },
      {
        name: 'Conscious Shopping',
        slug: 'shopping-conscious-shopping',
        type: CategoryType.POI,
      },
      {
        name: 'For Children',
        slug: 'shopping-for-children',
        type: CategoryType.POI,
      },
    ],
  },
  {
    name: 'Culture',
    slug: 'culture',
    type: CategoryType.OTHER, // Using OTHER for now, could add CULTURE to enum later
    children: [
      { name: 'Museums & Exhibitions', slug: 'culture-museums', type: CategoryType.OTHER },
      { name: 'Theater & Performances', slug: 'culture-theater', type: CategoryType.OTHER },
      { name: 'Art & Galleries', slug: 'culture-art', type: CategoryType.OTHER },
      { name: 'Excursions', slug: 'culture-excursions', type: CategoryType.OTHER },
      { name: 'On Foot', slug: 'culture-on-foot', type: CategoryType.OTHER },
      { name: 'Bike Tours', slug: 'culture-bike-tours', type: CategoryType.OTHER },
    ],
  },
  {
    name: 'Show Me More',
    slug: 'show-me-more',
    type: CategoryType.OTHER, // Special category for discovering more content
    // No children - this is a discovery/filter category
  },
];

type SeedSummary = {
  created: number;
  updated: number;
};

const summary: SeedSummary = {
  created: 0,
  updated: 0,
};

async function seedCategoryTree(seed: CategorySeed, parentId?: string) {
  const parentIdValue = parentId ?? null;
  const isActive = seed.isActive ?? true;

  // Get asset mapping for this category
  const assetMapping = CATEGORY_ASSETS[seed.slug];

  const existing = await prisma.category.findUnique({
    where: { slug: seed.slug },
  });

  // Preserve existing storage URL if it's already set (starts with http/https)
  let imageUrl: string | null = null;
  if (
    existing?.imageUrl &&
    (existing.imageUrl.startsWith('http://') || existing.imageUrl.startsWith('https://'))
  ) {
    imageUrl = existing.imageUrl;
  } else {
    // Use local path from mapping (will be updated to storage URL by upload script)
    imageUrl = assetMapping
      ? getCategoryImageUrl(assetMapping.imageFileName)
      : seed.imageUrl || null;
  }

  // Preserve existing icon storage URL if it's already set (starts with http/https)
  let iconUrl: string | null = null;
  if (
    existing?.iconUrl &&
    (existing.iconUrl.startsWith('http://') || existing.iconUrl.startsWith('https://'))
  ) {
    iconUrl = existing.iconUrl;
  } else {
    // Use local path from mapping (will be updated to storage URL by upload script)
    iconUrl = assetMapping?.iconFileName
      ? getCategoryIconUrl(assetMapping.iconFileName)
      : seed.iconUrl || null;
  }

  let categoryId: string;

  const categoryData = {
    name: seed.name,
    type: seed.type ?? null,
    languageCode: seed.languageCode ?? existing?.languageCode ?? DEFAULT_CATEGORY_LANGUAGE,
    isActive,
    parentId: parentIdValue,
    subtitle: seed.subtitle || assetMapping?.subtitle || null,
    description: seed.description || assetMapping?.description || null,
    imageUrl: imageUrl || null,
    iconUrl: iconUrl || null,
    headerBackgroundColor:
      seed.headerBackgroundColor || assetMapping?.headerBackgroundColor || null,
    contentBackgroundColor:
      seed.contentBackgroundColor || assetMapping?.contentBackgroundColor || null,
  };

  if (existing) {
    await prisma.category.update({
      where: { id: existing.id },
      data: categoryData,
    });
    categoryId = existing.id;
    summary.updated += 1;
    console.log(`↻ Updated category: ${seed.name} (${seed.slug})`);
  } else {
    const created = await prisma.category.create({
      data: {
        ...categoryData,
        slug: seed.slug,
      },
    });
    categoryId = created.id;
    summary.created += 1;
    console.log(`✓ Created category: ${seed.name} (${seed.slug})`);
  }

  if (seed.children?.length) {
    for (const child of seed.children) {
      await seedCategoryTree(child, categoryId);
    }
  }
}

async function seedCategories() {
  console.log('🌱 Starting category seeding...');

  try {
    for (const seed of CATEGORY_SEEDS) {
      await seedCategoryTree(seed);
    }

    const totalCategories = await prisma.category.count();

    console.log('\n📊 Seeding summary:');
    console.log(`  • Created: ${summary.created}`);
    console.log(`  • Updated: ${summary.updated}`);
    console.log(`  • Total categories in database: ${totalCategories}`);
    console.log('\n🎉 Category seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedCategories().catch((error) => {
  console.error(error);
  process.exit(1);
});
