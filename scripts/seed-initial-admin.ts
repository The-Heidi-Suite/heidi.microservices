#!/usr/bin/env ts-node
/**
 * Initial Admin Seeding Script
 *
 * Seeds:
 *  - Super Admin user (users database)
 *  - City record for Kiel (city database)
 *  - City Admin user linked to Kiel (users database)
 *  - User city assignment for the City Admin with management permissions (core database)
 *
 * Prerequisites:
 * 1. Run all Prisma migrations: npm run prisma:migrate
 * 2. Generate Prisma clients: npm run prisma:generate
 * 3. Ensure CORE_DATABASE_URL, USERS_DATABASE_URL, and CITY_DATABASE_URL env vars are set
 *
 * Run: npm run seed:initial-admin
 *      (Optionally set env vars to override defaults, e.g. SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD)
 */

import 'tsconfig-paths/register';
import * as bcrypt from 'bcrypt';

import { PrismaClient as UsersPrismaClient, UserRole as UsersUserRole } from '@prisma/client-users';
import { PrismaClient as CityPrismaClient } from '@prisma/client-city';
import { PrismaClient as CorePrismaClient, UserRole as CoreUserRole } from '@prisma/client-core';
import { getCityHeaderImageUrl } from './assets/category-assets-mapping';

const usersPrisma = new UsersPrismaClient();
const cityPrisma = new CityPrismaClient();
const corePrisma = new CorePrismaClient();

type SeedResult = {
  superAdminId: string;
  cityId: string;
  cityAdminId: string;
};

const DEFAULT_SUPER_ADMIN_EMAIL = 'super.admin@heidi.local';
const DEFAULT_SUPER_ADMIN_PASSWORD = 'ChangeMe123!';
const DEFAULT_CITY_ADMIN_EMAIL = 'city.admin@heidi.local';
const DEFAULT_CITY_ADMIN_PASSWORD = 'ChangeMe123!';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? DEFAULT_SUPER_ADMIN_EMAIL;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? DEFAULT_SUPER_ADMIN_PASSWORD;
const CITY_ADMIN_EMAIL = process.env.CITY_ADMIN_EMAIL ?? DEFAULT_CITY_ADMIN_EMAIL;
const CITY_ADMIN_PASSWORD = process.env.CITY_ADMIN_PASSWORD ?? DEFAULT_CITY_ADMIN_PASSWORD;

if (!SUPER_ADMIN_PASSWORD) {
  throw new Error('SUPER_ADMIN_PASSWORD env variable must be set');
}

if (!CITY_ADMIN_PASSWORD) {
  throw new Error('CITY_ADMIN_PASSWORD env variable must be set');
}

function logDefaultPasswordUsage(label: string, wasOverride: boolean, defaultPassword: string) {
  if (!wasOverride) {
    console.warn(
      `⚠️  ${label} using default password (${defaultPassword}). ` +
        'Override via env variable and change after login.',
    );
  }
}

async function ensureSuperAdmin(): Promise<string> {
  const email = SUPER_ADMIN_EMAIL.trim().toLowerCase();
  const username = process.env.SUPER_ADMIN_USERNAME ?? 'superadmin';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? DEFAULT_SUPER_ADMIN_PASSWORD;
  const passwordOverride = Boolean(process.env.SUPER_ADMIN_PASSWORD);

  logDefaultPasswordUsage('Super Admin', passwordOverride, DEFAULT_SUPER_ADMIN_PASSWORD);

  const hashedPassword = await bcrypt.hash(password, 12);

  const existing = await usersPrisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    await usersPrisma.user.update({
      where: { id: existing.id },
      data: {
        username,
        role: UsersUserRole.SUPER_ADMIN,
        firstName: 'Super',
        lastName: 'Admin',
        emailVerified: true,
        isActive: true,
        password: hashedPassword,
      },
    });
    console.log(`↻ Updated Super Admin user (${email})`);
    return existing.id;
  }

  const created = await usersPrisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      role: UsersUserRole.SUPER_ADMIN,
      firstName: 'Super',
      lastName: 'Admin',
      emailVerified: true,
      isActive: true,
    },
    select: { id: true },
  });

  console.log(`✓ Created Super Admin user (${email})`);
  return created.id;
}

async function ensureKielCity(): Promise<string> {
  const name = 'Kiel';
  const key = 'kiel';
  const country = 'Germany';
  const state = 'Schleswig-Holstein';
  const headerImageUrl = getCityHeaderImageUrl('kiel');

  const emailTheme = {
    appName: 'mein.Kiel',
    appNameDisplay: 'mein.Kiel',
    primaryColor: '#009EE0',
    secondaryColor: '#1a1a2e',
    accentColor: '#009EE0',
    greetingTemplate: 'Moin, moin in der {appName}{firstNamePart}!',
    emailTheme: {
      headerBackgroundColor: '#1a1a2e',
      footerBackgroundColor: '#009EE0',
      buttonColor: '#ffffff',
      buttonTextColor: '#009EE0',
    },
  };

  const existing = await cityPrisma.city.findFirst({
    where: {
      name,
      country,
      state,
    },
    select: { id: true, headerImageUrl: true },
  });

  if (existing) {
    // Preserve existing storage URL if it's already set (starts with http/https)
    const shouldUpdateHeaderImage =
      !existing.headerImageUrl ||
      (!existing.headerImageUrl.startsWith('http://') &&
        !existing.headerImageUrl.startsWith('https://'));

    await cityPrisma.city.update({
      where: { id: existing.id },
      data: {
        key,
        latitude: 54.3233,
        longitude: 10.1228,
        timezone: 'Europe/Berlin',
        population: 246601,
        isActive: true,
        metadata: {
          emailTheme,
        },
        ...(shouldUpdateHeaderImage && headerImageUrl ? { headerImageUrl } : {}),
      },
    });
    console.log('↻ Updated city record for Kiel with email theme and key');
    if (shouldUpdateHeaderImage && headerImageUrl) {
      console.log(`  • Header image set: ${headerImageUrl}`);
    }
    return existing.id;
  }

  const created = await cityPrisma.city.create({
    data: {
      name,
      key,
      country,
      state,
      latitude: 54.3233,
      longitude: 10.1228,
      timezone: 'Europe/Berlin',
      population: 246601,
      isActive: true,
      headerImageUrl,
      metadata: {
        emailTheme,
      },
    },
    select: { id: true },
  });

  console.log('✓ Created city record for Kiel with email theme, key, and header image');
  if (headerImageUrl) {
    console.log(`  • Header image: ${headerImageUrl}`);
  }
  return created.id;
}

async function ensureCityAdmin(cityId: string): Promise<string> {
  const email = CITY_ADMIN_EMAIL.trim().toLowerCase();
  const username = process.env.CITY_ADMIN_USERNAME ?? 'kieladmin';
  const password = process.env.CITY_ADMIN_PASSWORD ?? DEFAULT_CITY_ADMIN_PASSWORD;
  const passwordOverride = Boolean(process.env.CITY_ADMIN_PASSWORD);

  logDefaultPasswordUsage('City Admin', passwordOverride, DEFAULT_CITY_ADMIN_PASSWORD);

  const hashedPassword = await bcrypt.hash(password, 12);

  const existing = await usersPrisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    await usersPrisma.user.update({
      where: { id: existing.id },
      data: {
        username,
        role: UsersUserRole.CITY_ADMIN,
        cityId,
        firstName: 'Kiel',
        lastName: 'Admin',
        emailVerified: true,
        isActive: true,
        password: hashedPassword,
      },
    });
    console.log(`↻ Updated City Admin user (${email})`);
    return existing.id;
  }

  const created = await usersPrisma.user.create({
    data: {
      email,
      username,
      password: hashedPassword,
      role: UsersUserRole.CITY_ADMIN,
      cityId,
      firstName: 'Kiel',
      lastName: 'Admin',
      emailVerified: true,
      isActive: true,
    },
    select: { id: true },
  });

  console.log(`✓ Created City Admin user (${email})`);
  return created.id;
}

async function ensureCityAssignment(cityAdminId: string, cityId: string, assignedBy?: string) {
  await corePrisma.userCityAssignment.upsert({
    where: {
      userId_cityId: {
        userId: cityAdminId,
        cityId,
      },
    },
    update: {
      role: CoreUserRole.CITY_ADMIN,
      canManageAdmins: true,
      isActive: true,
      assignedBy,
    },
    create: {
      userId: cityAdminId,
      cityId,
      role: CoreUserRole.CITY_ADMIN,
      canManageAdmins: true,
      isActive: true,
      assignedBy,
    },
  });
  console.log('✓ Ensured city admin assignment in core database');
}

async function seed(): Promise<SeedResult> {
  console.log('🌱 Starting initial admin seeding...');

  const superAdminId = await ensureSuperAdmin();
  const cityId = await ensureKielCity();
  const cityAdminId = await ensureCityAdmin(cityId);

  await ensureCityAssignment(cityAdminId, cityId, superAdminId);

  return { superAdminId, cityId, cityAdminId };
}

seed()
  .then(async (result) => {
    console.log('\n📊 Seeding summary:');
    console.log(`  • Super Admin ID: ${result.superAdminId}`);
    console.log(`  • City ID: ${result.cityId}`);
    console.log(`  • City Admin ID: ${result.cityAdminId}`);
    console.log('\n🎉 Initial admin seeding completed successfully!');
  })
  .catch((error) => {
    console.error('❌ Error during initial admin seeding:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([
      usersPrisma.$disconnect(),
      cityPrisma.$disconnect(),
      corePrisma.$disconnect(),
    ]);
  });
