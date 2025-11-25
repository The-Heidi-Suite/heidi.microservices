#!/usr/bin/env ts-node
/**
 * Tiles Seeding Script
 *
 * Seeds Tile records in the core database using static data (mirrored from tiles.csv).
 *
 * Prerequisites:
 * 1. Run Prisma migrations: npm run prisma:migrate
 * 2. Regenerate Prisma client: npm run prisma:generate
 * 3. Ensure CORE_DATABASE_URL env var is set
 *
 * Run:
 *  - npm run seed:tiles
 *
 * After seeding, upload tile images:
 *  - npm run upload:tile-assets
 */

import 'tsconfig-paths/register';

import { PrismaClient as CorePrismaClient } from '@prisma/client-core';
import { PrismaClient as CityPrismaClient } from '@prisma/client-city';

const prisma = new CorePrismaClient();
const cityPrisma = new CityPrismaClient();

type TileSeedRow = {
  slug: string;
  headerBackgroundColor?: string | null;
  header: string;
  subheader?: string | null;
  description?: string | null;
  contentBackgroundColor?: string | null;
  websiteUrl?: string | null;
  openInExternalBrowser?: boolean;
  displayOrder?: number;
  isActive?: boolean;
  publishAt?: Date | null;
  expireAt?: Date | null;
  languageCode?: string | null;
};

const TILES: TileSeedRow[] = [
  {
    slug: 'zum-verschenken',
    headerBackgroundColor: '#00a1a3',
    header: 'ZUM VERSCHENKEN',
    subheader: 'Kielgutschein',
    description:
      '<div><span style="color: rgb(231, 235, 239);">Ein Gutschein, so viele Möglichkeiten: Der Kielgutschein steht für bunte Vielfalt und kann bei über 120 lokalen Geschäften, Gastronomiebetrieben und Dienstleistern in der Region Kieler Förde eingelöst werden - auch in Teilbeträgen.</span></div>',
    contentBackgroundColor: '#009ee0',
    websiteUrl: 'https://kiel.zmyle.de/checkout',
    openInExternalBrowser: false,
    displayOrder: 0,
    isActive: true,
    publishAt: null,
    expireAt: null,
    languageCode: 'de',
  },
  {
    slug: 'bereit-f-r-den-sommer',
    headerBackgroundColor: '#009ee0',
    header: 'BEREIT FÜR DEN SOMMER',
    subheader: 'Meine Bäderkarte',
    description:
      '<div><span style="color: rgb(231, 235, 239);">Mit deinem mein. Kiel Konto deine Bäderkarte jetzt bestellen!</span></div>',
    contentBackgroundColor: '#009ee0',
    websiteUrl: 'https://www.kiel.de/de/kultur_freizeit/baeder_straende/preise.php',
    openInExternalBrowser: false,
    displayOrder: 0,
    isActive: true,
    publishAt: null,
    expireAt: null,
    languageCode: 'de',
  },
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

async function seedTiles() {
  console.log('🌱 Seeding tiles (static data)...');

  const cityId = await getKielCityId();
  console.log(`ℹ Using Kiel city ID (${cityId}) for TileCity relations.`);

  let created = 0;
  let updated = 0;

  for (const tile of TILES) {
    try {
      // Check if tile already exists (by slug) before upserting
      const existing = await prisma.tile.findUnique({
        where: { slug: tile.slug },
        select: { id: true },
      });

      const result = await prisma.tile.upsert({
        where: { slug: tile.slug },
        create: {
          slug: tile.slug,
          headerBackgroundColor: tile.headerBackgroundColor ?? undefined,
          header: tile.header,
          subheader: tile.subheader ?? undefined,
          description: tile.description ?? undefined,
          contentBackgroundColor: tile.contentBackgroundColor ?? undefined,
          websiteUrl: tile.websiteUrl ?? undefined,
          openInExternalBrowser: tile.openInExternalBrowser ?? false,
          displayOrder: tile.displayOrder ?? 0,
          isActive: tile.isActive ?? true,
          languageCode: tile.languageCode ?? undefined,
          publishAt: tile.publishAt ?? undefined,
          expireAt: tile.expireAt ?? undefined,
        },
        update: {
          slug: tile.slug,
          headerBackgroundColor: tile.headerBackgroundColor ?? undefined,
          header: tile.header,
          subheader: tile.subheader ?? undefined,
          description: tile.description ?? undefined,
          contentBackgroundColor: tile.contentBackgroundColor ?? undefined,
          websiteUrl: tile.websiteUrl ?? undefined,
          openInExternalBrowser: tile.openInExternalBrowser ?? false,
          displayOrder: tile.displayOrder ?? 0,
          isActive: tile.isActive ?? true,
          languageCode: tile.languageCode ?? undefined,
          publishAt: tile.publishAt ?? null,
          expireAt: tile.expireAt ?? null,
        },
      });

      if (cityId) {
        await prisma.tileCity.upsert({
          where: {
            tileId_cityId: {
              tileId: result.id,
              cityId,
            },
          },
          update: {
            isPrimary: true,
            displayOrder: tile.displayOrder ?? 0,
          },
          create: {
            tileId: result.id,
            cityId,
            isPrimary: true,
            displayOrder: tile.displayOrder ?? 0,
          },
        });
      }

      if (existing) {
        updated++;
        console.log(`↻ Updated tile: ${tile.header} (slug: ${tile.slug})`);
      } else {
        created++;
        console.log(`✓ Created tile: ${tile.header} (slug: ${tile.slug})`);
      }
    } catch (error) {
      console.error(`❌ Error processing tile "${tile.header}" (slug: ${tile.slug}):`, error);
    }
  }

  console.log('\n📊 Tiles seeding summary:');
  console.log(`  • Created: ${created}`);
  console.log(`  • Updated (approx): ${updated}`);
}

async function seed() {
  try {
    await seedTiles();
    console.log('\n🎉 Tiles seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during tiles seeding:', error);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([prisma.$disconnect(), cityPrisma.$disconnect()]);
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
