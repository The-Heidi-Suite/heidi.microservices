#!/usr/bin/env ts-node
/**
 * Seed script: Mobilithek Parking Integration
 *
 * Creates or updates an Integration record with provider MOBILITHEK_PARKING
 * and stores the configuration needed to sync parking data from Mobilithek API.
 *
 * Env vars (required unless default provided):
 * - INTEGRATION_USER_ID: User ID to own the integration (required)
 * - CITY_ID: Target city ID in core service (required)
 * - MOBILITHEK_API_URL: Mobilithek/KielRegion API URL (default: https://apis.kielregion.addix.io/mtparken/)
 * - MOBILITHEK_API_KEY: Mobilithek API key (optional)
 * - INTEGRATION_NAME: Display name (default: "Mobilithek Parking - Kiel")
 * - INTEGRATION_ACTIVE: true|false (default: true)
 * - UPDATE_INTERVAL: Update interval in minutes (default: 1)
 */

import 'tsconfig-paths/register';
import {
  PrismaClient as IntegrationPrismaClient,
  IntegrationProvider,
  Prisma,
} from '@prisma/client-integration';

const prisma = new IntegrationPrismaClient();

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`${name} must be set`);
  }
  return v.trim();
}

async function seed() {
  console.log('🌱 Seeding Mobilithek Parking integration...');

  const userId = requiredEnv('INTEGRATION_USER_ID');
  const cityId = requiredEnv('CITY_ID');
  const apiUrl =
    process.env.MOBILITHEK_API_URL?.trim() || 'https://apis.kielregion.addix.io/mtparken/';
  const apiKey = process.env.MOBILITHEK_API_KEY?.trim();
  const name = process.env.INTEGRATION_NAME?.trim() || 'Mobilithek Parking - Kiel';
  const isActive = (process.env.INTEGRATION_ACTIVE ?? 'true').toLowerCase() !== 'false';
  const updateInterval = parseInt(process.env.UPDATE_INTERVAL?.trim() || '1', 10);

  const config = {
    apiUrl,
    ...(apiKey && { apiKey }),
    cityId,
    updateInterval,
    enabled: isActive,
  };

  // Find by provider + name (no unique index, so do manual upsert logic)
  const existing = await prisma.integration.findFirst({
    where: { provider: IntegrationProvider.MOBILITHEK_PARKING, name },
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
    console.log(`↻ Updated MOBILITHEK_PARKING integration (${updated.id})`);
  } else {
    const created = await prisma.integration.create({
      data: {
        userId,
        provider: IntegrationProvider.MOBILITHEK_PARKING,
        name,
        credentials: Prisma.JsonNull,
        config: config as any,
        isActive,
      },
      select: { id: true, createdAt: true },
    });
    console.log(`✓ Created MOBILITHEK_PARKING integration (${created.id})`);
  }

  console.log('✅ Seeding complete.');
  console.log('');
  console.log('📝 Next steps:');
  console.log('1. Enable parking feature for the city by updating city metadata:');
  console.log('   metadata.features.parking = true');
  console.log('2. Create a scheduled task to sync every minute:');
  console.log('   cron: "*/1 * * * *"');
  console.log(`   payload: { integrationId: "<integration-id>" }`);
}

seed()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
