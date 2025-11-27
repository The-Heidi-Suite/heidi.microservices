#!/usr/bin/env ts-node
/**
 * Seed script: Destination One Integration
 *
 * Creates or updates an Integration record with provider DESTINATION_ONE
 * and stores the configuration needed to sync data from destination_one API.
 * Also creates a daily scheduled task to sync data at 2:00 AM.
 *
 * Env vars (required unless default provided):
 * - DO_EXPERIENCE: destination_one experience (default: heidi-app-kiel)
 * - DO_LICENSEKEY: destination_one license key (required)
 * - DO_TEMPLATE: API template (default: ET2014A_LIGHT_MULTI.json)
 * - DO_TYPES: Comma-separated types filter (e.g., Gastro,Event) (optional)
 * - DO_BASE_URL: Base URL (default: https://meta.et4.de/rest.ashx/search/)
 * - INTEGRATION_NAME: Display name (default: "Destination One - Kiel")
 * - INTEGRATION_ACTIVE: true|false (default: true)
 * - SCHEDULE_NAME: Schedule name (default: "Destination One - Kiel Daily Sync")
 * - SCHEDULE_CRON: Cron expression (default: "0 2 * * *" - 2:00 AM daily)
 */

import 'tsconfig-paths/register';
import {
  PrismaClient as IntegrationPrismaClient,
  IntegrationProvider,
  Prisma,
} from '@prisma/client-integration';
import { PrismaClient as UsersPrismaClient, UserRole as UsersUserRole } from '@prisma/client-users';
import { PrismaClient as CityPrismaClient } from '@prisma/client-city';
import { PrismaClient as SchedulerPrismaClient } from '@prisma/client-scheduler';
import { DestinationOneConfig, DestinationOneCategoryMapping } from '@heidi/contracts';

const prisma = new IntegrationPrismaClient();
const usersPrisma = new UsersPrismaClient();
const cityPrisma = new CityPrismaClient();
const schedulerPrisma = new SchedulerPrismaClient();

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`${name} must be set`);
  }
  return v.trim();
}

async function getSuperAdminUserId(): Promise<string> {
  const user = await usersPrisma.user.findFirst({
    where: {
      role: UsersUserRole.SUPER_ADMIN,
    },
    select: { id: true },
  });

  if (!user) {
    throw new Error('Super Admin user not found. Please run npm run seed:initial-admin first.');
  }

  return user.id;
}

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

async function seed() {
  console.log('🌱 Seeding Destination One integration...');

  const userId = await getSuperAdminUserId();
  const cityId = await getKielCityId();
  const licensekey = requiredEnv('DO_LICENSEKEY');

  const experience = process.env.DO_EXPERIENCE?.trim() || 'heidi-app-kiel';
  const template = process.env.DO_TEMPLATE?.trim() || 'ET2014A_MULTI.json';
  const baseUrl = process.env.DO_BASE_URL?.trim() || 'https://meta.et4.de/rest.ashx/search/';
  const types = process.env.DO_TYPES
    ? process.env.DO_TYPES.split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : // Default to all major Destination One types we support (skip City, Area, Package)
      ['Hotel', 'Event', 'Gastro', 'Tour', 'POI', 'Article'];
  const name = process.env.INTEGRATION_NAME?.trim() || 'Destination One - Kiel';
  const isActive = (process.env.INTEGRATION_ACTIVE ?? 'true').toLowerCase() !== 'false';

  // Category mappings for Kiel based on screenshot requirements
  // Maps Destination One categories to Heidi categories/subcategories
  //
  // MAPPING OVERVIEW:
  // - "Kiel & Kultur" (culture category): Contains filter tiles for Ausflugsziele, zu Fuß erleben,
  //   Radtouren, Museen, and "Alles anzeigen" - all sourced from Destination.one TOUREN & POI facets
  // - "Dein Weg durch Kiel" (tours category): Currently no Destination.one mappings.
  //   Should display tours like "Blaue Linie" - mappings to be added based on specific DO categories
  // - Other categories (events, shopping, food-and-drink): Mapped as before
  const categoryMappings: DestinationOneCategoryMapping[] = [
    // Event category mapping (Event type) - empty doCategoryValues means fetch all Events
    {
      heidiCategorySlug: 'events',
      doTypes: ['Event'],
      doCategoryValues: [], // Empty array = fetch all Events
    },

    // Shopping category mappings (POI type)
    {
      heidiCategorySlug: 'shopping',
      doTypes: ['POI'],
      doCategoryValues: ['Einkaufen'],
    },
    {
      heidiCategorySlug: 'shopping',
      heidiSubcategorySlug: 'shopping-clothing',
      doTypes: ['POI'],
      doCategoryValues: ['Bekleidung', 'Damen' , 'Herren', 'Schuhe', 'Baby & Kind', 'Schuhe & Lederwaren'],
    },
    {
      heidiCategorySlug: 'shopping',
      heidiSubcategorySlug: 'shopping-conscious-shopping',
      doTypes: ['POI'],
      doCategoryValues: ['Bewusst einkaufen'],
    },
    {
      heidiCategorySlug: 'shopping',
      heidiSubcategorySlug: 'shopping-for-children',
      doTypes: ['POI'],
      doCategoryValues: ['Baby & Kind', 'Spielzeug'],
    },
    {
      heidiCategorySlug: 'shopping',
      heidiSubcategorySlug: 'shopping-city-center',
      doTypes: ['POI'],
      doCategoryValues: ['Melting Pot', 'Fleet Quartier',  'Obere Holstenstraße', 'Kehden-Küter-Kiez', 'Schlossquartier', 'Holstenplatz', 'Altstadt'],
    },

    // Food & Drink category mappings (Gastro type)
    {
      heidiCategorySlug: 'food-and-drink',
      doTypes: ['Gastro'],
      doCategoryValues: [],
    },
    {
      heidiCategorySlug: 'food-and-drink',
      heidiSubcategorySlug: 'food-cafes-bakeries',
      doTypes: ['Gastro'],
      doCategoryValues: ['Café', 'Eisdiele/Eiscafé'],
    },
    {
      heidiCategorySlug: 'food-and-drink',
      heidiSubcategorySlug: 'food-fish-restaurants',
      doTypes: ['Gastro'],
      doCategoryValues: ['Fischlokal', 'Schiffsgastronomie'],
    },
    {
      heidiCategorySlug: 'food-and-drink',
      heidiSubcategorySlug: 'food-bars-nightlife',
      doTypes: ['Gastro'],
      doCategoryValues: ['Pub', 'Bar', 'Kneipe', 'Sportsbar'],
    },
    {
      heidiCategorySlug: 'food-and-drink',
      heidiSubcategorySlug: 'food-vegetarian-vegan',
      doTypes: ['Gastro'],
      doCategoryValues: ['vegan', 'vegetarisch'],
    },

    // Culture category mappings (Tour and POI types) - for "Kiel & Kultur" filter tiles
    {
      heidiCategorySlug: 'culture',
      heidiSubcategorySlug: 'culture-excursions',
      doTypes: ['Tour', 'POI'],
      doCategoryValues: ['Ausflugsziele'],
    },
    {
      heidiCategorySlug: 'culture',
      heidiSubcategorySlug: 'culture-on-foot',
      doTypes: ['Tour', 'POI'],
      doCategoryValues: ['Wandern', 'Themenstraße'],
    },
    {
      heidiCategorySlug: 'culture',
      heidiSubcategorySlug: 'culture-bike-tours',
      doTypes: ['Tour', 'POI'],
      doCategoryValues: ['Radfahren', 'Themen-Radtouren'],
    },
    {
      heidiCategorySlug: 'culture',
      heidiSubcategorySlug: 'culture-museums',
      doTypes: ['Tour', 'POI'],
      doCategoryValues: ['Museumstour', 'Museen/Sammlungen'],
    },
    // "Show all" filter tile - maps to main culture category
    {
      heidiCategorySlug: 'culture',
      doTypes: ['Tour', 'POI'],
      doCategoryValues: ['Ausflugsziele', 'Unterhaltung', 'Sport und Freizeit', 'bühne'],
    },

    // Tours category mappings (for "Dein Weg durch Kiel")
    // Maps POI items with "Blaue Linie" category to tours
    {
      heidiCategorySlug: 'tours',
      doTypes: ['POI'],
      doCategoryValues: ['Blaue Linie'],
    },
  ];

  const config: DestinationOneConfig = {
    experience,
    licensekey,
    template,
    baseUrl,
    cityId,
    typeFilter: types,
    enabled: isActive,
    categoryMappings,
    storeItemCategoriesAsTags: true, // Default to storing categories as tags
    // Enable fetching Event category facets during sync (for logging and dynamic category usage)
    eventFacetsEnabled: true,
    // Enable fetching Tour/POI category facets during sync (for logging and dynamic category usage)
    tourFacetsEnabled: true,
  };

  // Find by provider + name (no unique index, so do manual upsert logic)
  const existing = await prisma.integration.findFirst({
    where: { provider: IntegrationProvider.DESTINATION_ONE, name },
    select: { id: true },
  });

  let integrationId: string;
  if (existing) {
    const updated = await prisma.integration.update({
      where: { id: existing.id },
      data: {
        userId,
        credentials: Prisma.JsonNull,
        config: config as any,
        isActive,
        lastSyncAt: null,
      },
      select: { id: true, updatedAt: true },
    });
    integrationId = updated.id;
    console.log(`↻ Updated DESTINATION_ONE integration (${integrationId})`);
  } else {
    const created = await prisma.integration.create({
      data: {
        userId,
        provider: IntegrationProvider.DESTINATION_ONE,
        name,
        credentials: Prisma.JsonNull,
        config: config as any,
        isActive,
      },
      select: { id: true, createdAt: true },
    });
    integrationId = created.id;
    console.log(`✓ Created DESTINATION_ONE integration (${integrationId})`);
  }

  // Create or update scheduled task for daily sync
  const scheduleName = process.env.SCHEDULE_NAME?.trim() || 'Destination One - Kiel Daily Sync';
  const scheduleCron = process.env.SCHEDULE_CRON?.trim() || '0 2 * * *';
  const scheduleDescription = 'Daily sync of Destination One data at 2:00 AM';

  const existingSchedule = await schedulerPrisma.schedule.findFirst({
    where: { name: scheduleName },
    select: { id: true },
  });

  if (existingSchedule) {
    const updatedSchedule = await schedulerPrisma.schedule.update({
      where: { id: existingSchedule.id },
      data: {
        description: scheduleDescription,
        cronExpression: scheduleCron,
        payload: { integrationId },
        isEnabled: true,
      },
      select: { id: true, updatedAt: true },
    });
    console.log(`↻ Updated schedule (${updatedSchedule.id})`);
  } else {
    const createdSchedule = await schedulerPrisma.schedule.create({
      data: {
        name: scheduleName,
        description: scheduleDescription,
        cronExpression: scheduleCron,
        payload: { integrationId },
        isEnabled: true,
      },
      select: { id: true, createdAt: true },
    });
    console.log(`✓ Created schedule (${createdSchedule.id})`);
  }

  console.log('✅ Seeding complete.');
}

seed()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([
      prisma.$disconnect(),
      usersPrisma.$disconnect(),
      cityPrisma.$disconnect(),
      schedulerPrisma.$disconnect(),
    ]);
  });
