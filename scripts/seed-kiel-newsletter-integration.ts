#!/usr/bin/env ts-node
/**
 * Seed script: Kiel Newsletter Integration
 *
 * Creates or updates an Integration record with provider KIEL_NEWSLETTER
 * and stores the E-Marketing Suite (EMS) configuration needed to subscribe users to the newsletter.
 *
 * Env vars (required unless default provided):
 * - KIEL_NEWSLETTER_CLIENT_ID: Client ID (default: KIEL)
 * - KIEL_NEWSLETTER_HOST_URL: EMS API host URL (default: https://wlk-ems.com/crm/api/v1/KIEL/)
 * - KIEL_NEWSLETTER_API_KEY: EMS API key (required)
 * - KIEL_NEWSLETTER_ATTRIBUTE_ID: Attribute ID for newsletter signup (default: 3022526340)
 * - KIEL_NEWSLETTER_EVENT_ID: Event ID for signup event (default: 3022526329)
 * - KIEL_NEWSLETTER_CONSENT_PURPOSE_ID: Consent purpose ID (default: 1005)
 * - INTEGRATION_NAME_KIEL_NEWSLETTER: Display name (default: "Kiel Newsletter")
 * - INTEGRATION_ACTIVE: true|false (default: true)
 */

import 'tsconfig-paths/register';
import {
  PrismaClient as IntegrationPrismaClient,
  IntegrationProvider,
  Prisma,
} from '@prisma/client-integration';
import { PrismaClient as UsersPrismaClient, UserRole as UsersUserRole } from '@prisma/client-users';

const prisma = new IntegrationPrismaClient();
const usersPrisma = new UsersPrismaClient();

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

async function seed() {
  console.log('🌱 Seeding Kiel Newsletter integration...');

  const userId = await getSuperAdminUserId();
  const clientId = process.env.KIEL_NEWSLETTER_CLIENT_ID?.trim() || 'KIEL';
  const hostUrl =
    process.env.KIEL_NEWSLETTER_HOST_URL?.trim() || 'https://wlk-ems.com/crm/api/v1/KIEL/';
  const apiKey = process.env.KIEL_NEWSLETTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('KIEL_NEWSLETTER_API_KEY must be set');
  }
  const attributeId = parseInt(
    process.env.KIEL_NEWSLETTER_ATTRIBUTE_ID?.trim() || '3022526340',
    10,
  );
  const eventId = parseInt(process.env.KIEL_NEWSLETTER_EVENT_ID?.trim() || '3022526329', 10);
  const consentPurposeId = parseInt(
    process.env.KIEL_NEWSLETTER_CONSENT_PURPOSE_ID?.trim() || '1005',
    10,
  );
  const name = process.env.INTEGRATION_NAME_KIEL_NEWSLETTER?.trim() || 'Kiel Newsletter';
  const isActive = (process.env.INTEGRATION_ACTIVE ?? 'true').toLowerCase() !== 'false';

  const config = {
    clientId,
    hostUrl,
    apiKey,
    attributeId,
    eventId,
    consentPurposeId,
  };

  // Find by provider + name (no unique index, so do manual upsert logic)
  const existing = await prisma.integration.findFirst({
    where: { provider: IntegrationProvider.KIEL_NEWSLETTER, name },
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
    console.log(`↻ Updated KIEL_NEWSLETTER integration (${updated.id})`);
  } else {
    const created = await prisma.integration.create({
      data: {
        userId,
        provider: IntegrationProvider.KIEL_NEWSLETTER,
        name,
        credentials: Prisma.JsonNull,
        config: config as any,
        isActive,
      },
      select: { id: true, createdAt: true },
    });
    console.log(`✓ Created KIEL_NEWSLETTER integration (${created.id})`);
  }

  console.log('✅ Seeding complete.');
  console.log('');
  console.log('📝 Next steps:');
  console.log('1. The integration is ready to use');
  console.log('2. Call POST /newsletter/subscribe endpoint with userId and email');
  console.log('3. The service will automatically create contacts in EMS and trigger events');
}

seed()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([prisma.$disconnect(), usersPrisma.$disconnect()]);
  });
