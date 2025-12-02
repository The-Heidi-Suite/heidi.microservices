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
const DEFAULT_CITY_CATEGORY_LANGUAGE = 'en';

// English display names for categories in Kiel (UPPERCASE for main categories)
const KIEL_DISPLAY_NAMES: Record<string, string> = {
  // Main categories (ordered as per screenshot - UPPERCASE)
  tours: 'YOUR WAY THROUGH KIEL',
  'food-and-drink': 'EATING & DRINKING',
  shopping: "SHOP TO YOUR HEART'S CONTENT",
  culture: 'KIEL CULTURE',
  'show-me-more': 'SHOW ME MORE',
  events: 'EVENTS',

  // Food & Drink subcategories
  'food-cafes-bakeries': 'Cafés',
  'food-bars-nightlife': 'Bars & Pubs',
  'food-fish-restaurants': 'Fish Restaurants',
  'food-vegetarian-vegan': 'Vegetarian & Vegan',

  // Shopping subcategories
  'shopping-city-center': 'City Center',
  'shopping-clothing': 'Clothing',
  'shopping-conscious-shopping': 'Conscious Shopping',
  'shopping-for-children': 'For Children',

  // Culture subcategories
  'culture-excursions': 'Excursion Destinations',
  'culture-on-foot': 'Explore on Foot',
  'culture-bike-tours': 'Bike Tours',
  'culture-museums': 'Museums & Collections',
};

// German translations for Kiel city categories (exact translations we want, not from DeepL)
const KIEL_GERMAN_TRANSLATIONS: Record<
  string,
  { displayName: string; subtitle?: string; description?: string }
> = {
  // Main categories
  tours: {
    displayName: 'DEIN WEG DURCH KIEL',
    subtitle: 'Blaue Linie',
    description: '67 Aktivitäten in deiner Stadt',
  },
  'food-and-drink': {
    displayName: 'ESSEN & TRINKEN',
    subtitle: 'Kieler Restaurantvielfalt',
    description: 'Norddeutsche und internationale Küche',
  },
  shopping: {
    displayName: 'NACH HERZENSLUST SHOPPEN',
    subtitle: 'Über 400 Geschäfte',
    description: 'In deiner Innenstadt',
  },
  culture: {
    displayName: 'KIELER KULTUR',
    subtitle: 'Facettenreich von Meer bis Museen',
    description: 'Kunst, Geschichte, Musik, Wasser',
  },
  'show-me-more': {
    displayName: 'ZEIGE MIR MEHR',
    subtitle: 'Alles auf einen Blick',
    description: 'Entdecke deine Stadt mit deinen Filtern',
  },
  events: {
    displayName: 'VERANSTALTUNGEN',
    subtitle: 'Was ist los',
    description: 'Veranstaltungen, Feste und Aktivitäten in deiner Stadt',
  },

  // Food & Drink subcategories
  'food-cafes-bakeries': { displayName: 'Cafés' },
  'food-bars-nightlife': { displayName: 'Bars & Kneipen' },
  'food-fish-restaurants': { displayName: 'Fischrestaurants' },
  'food-vegetarian-vegan': { displayName: 'Vegetarisch & Vegan' },

  // Shopping subcategories
  'shopping-city-center': { displayName: 'Innenstadt' },
  'shopping-clothing': { displayName: 'Kleidung' },
  'shopping-conscious-shopping': { displayName: 'Bewusst Einkaufen' },
  'shopping-for-children': { displayName: 'Für Kinder' },

  // Culture subcategories
  'culture-excursions': { displayName: 'Ausflugsziele' },
  'culture-on-foot': { displayName: 'Zu Fuß erkunden' },
  'culture-bike-tours': { displayName: 'Fahrradtouren' },
  'culture-museums': { displayName: 'Museen & Sammlungen' },
};

// Slugs of categories (and their subcategories) that should be seeded for Kiel
// Ordered as per screenshot: Tours, Food & Drink, Shopping, Culture, Show Me More
const KIEL_ALLOWED_CATEGORY_SLUGS: string[] = [
  // Main categories (display order from screenshot)
  'tours', // 1 - DEIN WEG DURCH KIEL
  'food-and-drink', // 2 - ESSEN & TRINKEN
  'shopping', // 3 - NACH HERZENSLUST SHOPPEN
  'culture', // 4 - KIELER KULTUR
  'show-me-more', // 5 - ZEIGE MIR MEHR
  'events', // 6 - Events

  // Food & Drink subcategories
  'food-cafes-bakeries',
  'food-bars-nightlife',
  'food-fish-restaurants',
  'food-vegetarian-vegan',

  // Shopping subcategories
  'shopping-city-center',
  'shopping-clothing',
  'shopping-conscious-shopping',
  'shopping-for-children',

  // Culture subcategories
  'culture-excursions',
  'culture-on-foot',
  'culture-bike-tours',
  'culture-museums',
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
      parentId: true, // Include parentId to check if it's a main category
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
    // For Kiel, prefer city-specific display names; fall back to generic asset mapping or category name
    const displayName =
      KIEL_DISPLAY_NAMES[category.slug] || assetMapping?.displayName || category.name;
    const displayOrder = assetMapping?.displayOrder || 99; // Default to end if not specified
    const subtitle = assetMapping?.subtitle || null;
    const description = assetMapping?.description || null;

    // Only set colors for main categories (categories without a parent)
    // Subcategories should have null colors
    const isMainCategory = category.parentId === null;
    const headerBackgroundColor = isMainCategory
      ? assetMapping?.headerBackgroundColor || null
      : null;
    const contentBackgroundColor = isMainCategory
      ? assetMapping?.contentBackgroundColor || null
      : null;

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
            subtitle,
            description,
            languageCode: existing.languageCode ?? DEFAULT_CITY_CATEGORY_LANGUAGE,
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
            languageCode: DEFAULT_CITY_CATEGORY_LANGUAGE,
            displayName,
            subtitle,
            description,
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

async function seedCityCategoryTranslations(cityId: string) {
  console.log('\n🌍 Seeding German translations for city categories...');

  // Get all city categories for this city
  const cityCategories = await corePrisma.cityCategory.findMany({
    where: { cityId, isActive: true },
    include: { category: { select: { id: true, slug: true } } },
  });

  let translationsCreated = 0;
  let translationsUpdated = 0;

  for (const cityCategory of cityCategories) {
    const germanTranslation = KIEL_GERMAN_TRANSLATIONS[cityCategory.category.slug];
    if (!germanTranslation) continue;

    // The service uses 'city-category' as entityType and '{cityId}:{categoryId}' as entityId
    // Field names: 'name' (for displayName), 'subtitle', 'description'
    const entityType = 'city-category';
    const entityId = `${cityId}:${cityCategory.category.id}`;

    const fields: Array<{ field: string; value: string }> = [
      { field: 'name', value: germanTranslation.displayName }, // Service looks for 'name', not 'displayName'
      { field: 'subtitle', value: germanTranslation.subtitle },
      { field: 'description', value: germanTranslation.description },
    ].filter((f): f is { field: string; value: string } => Boolean(f.value));

    for (const { field, value } of fields) {
      try {
        const existing = await corePrisma.translation.findUnique({
          where: {
            entityType_entityId_field_locale: {
              entityType,
              entityId,
              field,
              locale: 'de',
            },
          },
        });

        if (existing) {
          await corePrisma.translation.update({
            where: { id: existing.id },
            data: {
              value,
              source: 'MANUAL',
              updatedAt: new Date(),
            },
          });
          translationsUpdated++;
        } else {
          await corePrisma.translation.create({
            data: {
              entityType,
              entityId,
              field,
              locale: 'de',
              sourceLocale: 'en', // English is the source language
              value,
              source: 'MANUAL',
            },
          });
          translationsCreated++;
        }
        console.log(`  ✓ ${cityCategory.category.slug}.${field} (${entityType}:${entityId})`);
      } catch (error) {
        console.error(
          `❌ Error saving translation for ${cityCategory.category.slug}.${field}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  console.log(
    `✓ German translations created: ${translationsCreated}, updated: ${translationsUpdated}`,
  );
  return { created: translationsCreated, updated: translationsUpdated };
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

    // Seed German translations for city categories
    const translationSummary = await seedCityCategoryTranslations(cityId);

    console.log('\n📊 Seeding summary:');
    console.log(`  • City categories created: ${summary.created}`);
    console.log(`  • City categories updated: ${summary.updated}`);
    console.log(`  • City categories skipped: ${summary.skipped}`);
    console.log(`  • German translations created: ${translationSummary.created}`);
    console.log(`  • German translations updated: ${translationSummary.updated}`);
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
