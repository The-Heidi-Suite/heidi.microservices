#!/usr/bin/env ts-node
/**
 * City Categories Seeding Script
 *
 * Seeds city categories for Kiel with English display names.
 * This script creates CityCategory records linking the Kiel city to all available categories
 * with localized display names.
 *
 * Prerequisites:
 * 1. Run Prisma migrations: npm run prisma:migrate
 * 2. Regenerate Prisma client: npm run prisma:generate
 * 3. Ensure categories are seeded: npm run seed:categories
 * 4. Ensure Kiel city exists: npm run seed:initial-admin
 * 5. Ensure CORE_DATABASE_URL and CITY_DATABASE_URL env vars are set
 *
 * Run: npm run seed:city-categories
 * Or: npx ts-node -r tsconfig-paths/register scripts/seed-city-categories.ts
 */

import 'tsconfig-paths/register';

import { PrismaClient as CityPrismaClient } from '@prisma/client-city';
import { PrismaClient as CorePrismaClient, UserRole } from '@prisma/client-core';
import { CATEGORY_ASSETS, getCityHeaderImageUrl } from './assets/category-assets-mapping';

const cityPrisma = new CityPrismaClient();
const corePrisma = new CorePrismaClient();

// English display names for categories in Kiel
const KIEL_DISPLAY_NAMES: Record<string, string> = {
  // Main categories
  news: 'News',
  events: 'Events',
  'food-and-drink': 'Food & Drink',
  tours: 'Tours',
  shopping: 'Shopping',
  culture: 'Culture',

  // News subcategories
  'news-official-announcements': 'Official Announcements',
  'news-press-releases': 'Press Releases',
  'news-service-alerts': 'Service Alerts',

  // Events subcategories
  'events-community': 'Community Events',
  'events-workshops-training': 'Workshops & Training',
  'events-cultural-festivals': 'Cultural Festivals',

  // Food & Drink subcategories
  'food-restaurants-bistros': 'Restaurants & Bistros',
  'food-cafes-bakeries': 'Cafes & Bakeries',
  'food-bars-nightlife': 'Bars & Nightlife',

  // Tours subcategories
  'tours-guided': 'Guided Tours',
  'tours-self-guided': 'Self-Guided Routes',
  'tours-family-experiences': 'Family Experiences',

  // Culture subcategories
  'culture-museums': 'Museums & Exhibitions',
  'culture-theater': 'Theater & Performances',
  'culture-art': 'Art & Galleries',
};

// Slugs of categories (and their subcategories) that should be seeded for Kiel
const KIEL_ALLOWED_CATEGORY_SLUGS: string[] = [
  // Main categories
  'news',
  'events',
  'food-and-drink',
  'shopping',
  'culture',
  'tours',

  // News subcategories
  'news-official-announcements',
  'news-press-releases',
  'news-service-alerts',

  // Events subcategories
  'events-community',
  'events-workshops-training',
  'events-cultural-festivals',

  // Food & Drink subcategories
  'food-restaurants-bistros',
  'food-cafes-bakeries',
  'food-bars-nightlife',

  // Tours subcategories
  'tours-guided',
  'tours-self-guided',
  'tours-family-experiences',

  // Culture subcategories
  'culture-museums',
  'culture-theater',
  'culture-art',
];

async function getKielCityId(): Promise<string> {
  const city = await cityPrisma.city.findFirst({
    where: {
      name: 'Kiel',
      country: 'Germany',
      state: 'Schleswig-Holstein',
    },
    select: { id: true },
  });

  if (!city) {
    throw new Error('Kiel city not found. Please run npm run seed:initial-admin first.');
  }

  return city.id;
}

async function getAllCategories() {
  return await corePrisma.category.findMany({
    where: {
      isActive: true,
      slug: {
        in: KIEL_ALLOWED_CATEGORY_SLUGS,
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });
}

async function seedCityCategories(cityId: string, addedBy?: string) {
  console.log('🌱 Starting city categories seeding for Kiel...');

  const categories = await getAllCategories();
  console.log(`📋 Found ${categories.length} active categories`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const category of categories) {
    const assetMapping = CATEGORY_ASSETS[category.slug];
    const displayName =
      assetMapping?.displayName || KIEL_DISPLAY_NAMES[category.slug] || category.name;
    const displayOrder = assetMapping?.displayOrder || 99; // Default to end if not specified
    const headerBackgroundColor = assetMapping?.headerBackgroundColor || null;
    const contentBackgroundColor = assetMapping?.contentBackgroundColor || null;

    try {
      const existing = await corePrisma.cityCategory.findUnique({
        where: {
          cityId_categoryId: {
            cityId,
            categoryId: category.id,
          },
        },
      });

      if (existing) {
        await corePrisma.cityCategory.update({
          where: { id: existing.id },
          data: {
            displayName,
            displayOrder,
            headerBackgroundColor,
            contentBackgroundColor,
            isActive: true,
            addedBy,
          },
        });
        updated++;
        console.log(
          `↻ Updated city category: ${category.name} → "${displayName}" (order: ${displayOrder})`,
        );
      } else {
        await corePrisma.cityCategory.create({
          data: {
            cityId,
            categoryId: category.id,
            displayName,
            displayOrder,
            headerBackgroundColor,
            contentBackgroundColor,
            isActive: true,
            addedBy,
          },
        });
        created++;
        console.log(
          `✓ Created city category: ${category.name} → "${displayName}" (order: ${displayOrder})`,
        );
      }
    } catch (error) {
      console.error(
        `❌ Error processing category ${category.name}:`,
        error instanceof Error ? error.message : error,
      );
      skipped++;
    }
  }

  return { created, updated, skipped };
}

async function seed() {
  try {
    const cityId = await getKielCityId();
    console.log(`✓ Found Kiel city (ID: ${cityId})`);

    // Update city header image if not set
    const city = await cityPrisma.city.findUnique({
      where: { id: cityId },
      select: { headerImageUrl: true },
    });

    // Preserve existing storage URL if it's already set (starts with http/https)
    if (
      !city?.headerImageUrl ||
      (!city.headerImageUrl.startsWith('http://') && !city.headerImageUrl.startsWith('https://'))
    ) {
      const headerImageUrl = getCityHeaderImageUrl('kiel');
      if (headerImageUrl) {
        await cityPrisma.city.update({
          where: { id: cityId },
          data: { headerImageUrl },
        });
        console.log(`✓ Set city header image: ${headerImageUrl}`);
      }
    } else {
      console.log(`ℹ City header image already set (storage URL): ${city.headerImageUrl}`);
    }

    // Optionally get a city admin ID to set as addedBy
    const cityAdmin = await corePrisma.userCityAssignment.findFirst({
      where: {
        cityId,
        role: UserRole.CITY_ADMIN,
        isActive: true,
      },
      select: { userId: true },
    });

    const addedBy = cityAdmin?.userId;

    const summary = await seedCityCategories(cityId, addedBy);

    console.log('\n📊 Seeding summary:');
    console.log(`  • Created: ${summary.created}`);
    console.log(`  • Updated: ${summary.updated}`);
    console.log(`  • Skipped: ${summary.skipped}`);
    console.log('\n🎉 City categories seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding city categories:', error);
    throw error;
  } finally {
    await Promise.allSettled([cityPrisma.$disconnect(), corePrisma.$disconnect()]);
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
