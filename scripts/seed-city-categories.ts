#!/usr/bin/env ts-node
/**
 * City Categories Seeding Script
 *
 * Seeds city categories for Kiel with German display names.
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

// German display names for categories in Kiel
const KIEL_DISPLAY_NAMES: Record<string, string> = {
  // Main categories
  news: 'Nachrichten',
  events: 'Veranstaltungen',
  'food-and-drink': 'Essen & Trinken',
  tours: 'Touren',
  restaurants: 'Restaurants',
  'points-of-interest': 'Sehenswürdigkeiten',
  'hotels-and-stays': 'Hotels & Unterkünfte',
  'articles-and-stories': 'Artikel & Geschichten',
  other: 'Sonstiges',

  // News subcategories
  'news-official-announcements': 'Amtliche Bekanntmachungen',
  'news-press-releases': 'Pressemitteilungen',
  'news-service-alerts': 'Service-Hinweise',

  // Events subcategories
  'events-community': 'Gemeinschaftsveranstaltungen',
  'events-workshops-training': 'Workshops & Schulungen',
  'events-cultural-festivals': 'Kulturfestivals',

  // Food & Drink subcategories
  'food-restaurants-bistros': 'Restaurants & Bistros',
  'food-cafes-bakeries': 'Cafés & Bäckereien',
  'food-bars-nightlife': 'Bars & Nachtleben',

  // Tours subcategories
  'tours-guided': 'Geführte Touren',
  'tours-self-guided': 'Selbstgeführte Routen',
  'tours-family-experiences': 'Familien-Erlebnisse',

  // Restaurants subcategories
  'restaurants-fine-dining': 'Feine Küche',
  'restaurants-casual-dining': 'Casual Dining',
  'restaurants-street-food': 'Street Food',

  // Points of Interest subcategories
  'poi-museums-galleries': 'Museen & Galerien',
  'poi-parks-nature': 'Parks & Natur',
  'poi-historic-landmarks': 'Historische Wahrzeichen',

  // Hotels subcategories
  'hotels-boutique': 'Boutique-Hotels',
  'hotels-business': 'Business-Hotels',
  'hotels-budget-stays': 'Günstige Unterkünfte',

  // Articles subcategories
  'articles-city-guides': 'Stadtführer',
  'articles-community-stories': 'Gemeinschaftsgeschichten',
  'articles-insider-tips': 'Insider-Tipps',

  // Other subcategories
  'other-partner-content': 'Partner-Inhalte',
  'other-legacy-content': 'Altbestand',
  'other-miscellaneous': 'Verschiedenes',

  // Shopping (new category)
  shopping: 'nach-herzenslust-shoppen',

  // Culture (new category)
  culture: 'kiel-kultur',
  'culture-museums': 'Museen & Ausstellungen',
  'culture-theater': 'Theater & Aufführungen',
  'culture-art': 'Kunst & Galerien',
};

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
