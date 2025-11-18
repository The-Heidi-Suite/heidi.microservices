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
import { DestinationOneConfig } from '@heidi/contracts';

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

  const config: DestinationOneConfig = {
    experience,
    licensekey,
    template,
    baseUrl,
    cityId,
    typeFilter: types,
    enabled: isActive,
    // Expanded default mapping; skip City/Area/Package
    categoryMappings: {
      // Type → our top-level buckets
      Hotel: 'hotels-and-stays',
      Event: 'events',
      Gastro: 'food-and-drink',
      Tour: 'tours',
      POI: 'points-of-interest',
      Article: 'articles-and-stories',

      // Gastro subcategories
      Restaurant: 'restaurants',
      Bar: 'food-bars-nightlife',
      Pub: 'food-bars-nightlife',
      Brewery: 'food-bars-nightlife',
      Café: 'food-cafes-bakeries',
      'Eisdiele/Eiscafé': 'food-cafes-bakeries',
      Bistro: 'food-restaurants-bistros',

      // Hotels subcategories
      'Hotel Garni': 'hotels-and-stays',
      'Boutique Hotel': 'hotels-boutique',
      'Business Hotel': 'hotels-business',
      'Budget Hotel': 'hotels-budget-stays',

      // POI subcategories
      Museum: 'poi-museums-galleries',
      Gallery: 'poi-museums-galleries',
      Park: 'poi-parks-nature',
      Nature: 'poi-parks-nature',
      Landmark: 'poi-historic-landmarks',
      'Historic Site': 'poi-historic-landmarks',

      // Tours subcategories
      'Guided Tour': 'tours-guided',
      'Self-Guided Route': 'tours-self-guided',
      Family: 'tours-family-experiences',

      // Articles subcategories
      Guide: 'articles-city-guides',
      Story: 'articles-community-stories',
      'Insider Tip': 'articles-insider-tips',
    },
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
