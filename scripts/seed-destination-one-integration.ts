#!/usr/bin/env ts-node
/**
 * Seed script: Destination One Integration
 *
 * Creates or updates an Integration record with provider DESTINATION_ONE
 * and stores the configuration needed to sync data from destination_one API.
 *
 * Env vars (required unless default provided):
 * - INTEGRATION_USER_ID: User ID to own the integration (required)
 * - CITY_ID: Target city ID in core service (required)
 * - DO_EXPERIENCE: destination_one experience (default: heidi-app-kiel)
 * - DO_LICENSEKEY: destination_one license key (required)
 * - DO_TEMPLATE: API template (default: ET2014A_LIGHT_MULTI.json)
 * - DO_TYPES: Comma-separated types filter (e.g., Gastro,Event) (optional)
 * - DO_BASE_URL: Base URL (default: https://meta.et4.de/rest.ashx/search/)
 * - INTEGRATION_NAME: Display name (default: "Destination One - Kiel")
 * - INTEGRATION_ACTIVE: true|false (default: true)
 */

import 'tsconfig-paths/register';
import {
  PrismaClient as IntegrationPrismaClient,
  IntegrationProvider,
  Prisma,
} from '@prisma/client-integration';
import { DestinationOneConfig, DestinationOneCategoryMapping } from '@heidi/contracts';

const prisma = new IntegrationPrismaClient();

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`${name} must be set`);
  }
  return v.trim();
}

async function seed() {
  console.log('🌱 Seeding Destination One integration...');

  const userId = requiredEnv('INTEGRATION_USER_ID');
  const cityId = requiredEnv('CITY_ID');
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
  const categoryMappings: DestinationOneCategoryMapping[] = [
    // Shopping category mappings (POI type)
    {
      heidiCategorySlug: 'shopping',
      doTypes: ['POI'],
      doCategoryValues: ['Einkaufen'],
      query: 'category:Einkaufen',
    },
    {
      heidiCategorySlug: 'shopping',
      heidiSubcategorySlug: 'shopping-clothing',
      doTypes: ['POI'],
      doCategoryValues: ['Bekleidung', 'Schuhe & Lederwaren'],
      query: 'category:Bekleidung OR category:Schuhe & Lederwaren',
    },
    {
      heidiCategorySlug: 'shopping',
      heidiSubcategorySlug: 'shopping-conscious-shopping',
      doTypes: ['POI'],
      doCategoryValues: ['Bewusst einkaufen'],
      query: 'category:Bewusst einkaufen',
    },
    {
      heidiCategorySlug: 'shopping',
      heidiSubcategorySlug: 'shopping-for-children',
      doTypes: ['POI'],
      doCategoryValues: ['Spielzeug', 'Baby & Kind'],
      query: 'category:Spielzeug OR category:Baby & Kind',
    },

    // Food & Drink category mappings (Gastro type)
    {
      heidiCategorySlug: 'food-and-drink',
      heidiSubcategorySlug: 'food-cafes-bakeries',
      doTypes: ['Gastro'],
      doCategoryValues: ['Café', 'Eisdiele', 'Eiscafé'],
      query: 'category:Café OR category:Eisdiele OR category:Eiscafé',
    },
    {
      heidiCategorySlug: 'food-and-drink',
      heidiSubcategorySlug: 'food-fish-restaurants',
      doTypes: ['Gastro'],
      doCategoryValues: ['Fischlokal', 'Schiffsgastronomie'],
      query: 'category:Fischlokal OR category:Schiffsgastronomie',
    },
    {
      heidiCategorySlug: 'food-and-drink',
      heidiSubcategorySlug: 'food-bars-nightlife',
      doTypes: ['Gastro'],
      doCategoryValues: ['Pub', 'Bar', 'Kneipe', 'Sportsbar'],
      query: 'category:Pub OR category:Bar OR category:Kneipe OR category:Sportsbar',
    },
    {
      heidiCategorySlug: 'food-and-drink',
      heidiSubcategorySlug: 'food-vegetarian-vegan',
      doTypes: ['Gastro'],
      doCategoryValues: ['vegan', 'vegetarisch'],
      query: 'category:vegan OR category:vegetarisch',
    },

    // Tours & POI category mappings (Tour and POI types)
    {
      heidiCategorySlug: 'tours',
      heidiSubcategorySlug: 'tours-excursions',
      doTypes: ['Tour', 'POI'],
      doCategoryValues: ['Ausflugsziele'],
      query: 'category:Ausflugsziele',
    },
    {
      heidiCategorySlug: 'tours',
      heidiSubcategorySlug: 'tours-on-foot',
      doTypes: ['Tour'],
      doCategoryValues: ['Wandern', 'Themenstraße'],
      query: 'category:Wandern OR category:Themenstraße',
    },
    {
      heidiCategorySlug: 'tours',
      heidiSubcategorySlug: 'tours-bike-tours',
      doTypes: ['Tour'],
      doCategoryValues: ['Radfahren', 'Themen-Radtouren'],
      query: 'category:Radfahren OR category:Themen-Radtouren',
    },
    {
      heidiCategorySlug: 'tours',
      heidiSubcategorySlug: 'tours-museum-tours',
      doTypes: ['Tour', 'POI'],
      doCategoryValues: ['Museumstour', 'Museen', 'Sammlungen'],
      query: 'category:Museumstour OR category:Museen OR category:Sammlungen',
    },
    {
      heidiCategorySlug: 'culture',
      heidiSubcategorySlug: 'culture-museums',
      doTypes: ['POI'],
      doCategoryValues: ['Museen', 'Sammlungen'],
      query: 'category:Museen OR category:Sammlungen',
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
  };

  // Find by provider + name (no unique index, so do manual upsert logic)
  const existing = await prisma.integration.findFirst({
    where: { provider: IntegrationProvider.DESTINATION_ONE, name },
    select: { id: true },
  });

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
    console.log(`↻ Updated DESTINATION_ONE integration (${updated.id})`);
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
    console.log(`✓ Created DESTINATION_ONE integration (${created.id})`);
  }

  console.log('✅ Seeding complete.');
}

seed()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
