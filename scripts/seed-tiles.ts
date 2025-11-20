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
 *    (optionally set CITY_ID to link all tiles to a specific city)
 */

import 'tsconfig-paths/register';

import { PrismaClient as CorePrismaClient } from '@prisma/client-core';

const prisma = new CorePrismaClient();

type TileSeedRow = {
  id: string;
  slug: string;
  backgroundImageUrl?: string | null;
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
  createdByUserId?: string | null;
  lastEditedByUserId?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  iconImageUrl?: string | null;
  languageCode?: string | null;
};
const TILES: TileSeedRow[] = [
  {
    id: '6afbe807-cd16-4d0e-8540-dc03bad7df35',
    slug: 'zum-verschenken',
    backgroundImageUrl:
      'https://kiel.nbg1.your-objectstorage.com/tiles/6afbe807-cd16-4d0e-8540-dc03bad7df35/background.webp',
    headerBackgroundColor: '#00a1a3',
    header: 'ZUM VERSCHENKEN',
    subheader: 'Kielgutschein',
    description:
      '<div><span style="color: rgb(231, 235, 239);">Ein Gutschein, so viele Möglichkeiten: Der Kielgutschein steht für bunte Vielfalt und kann bei über 120 lokalen Geschäften, Gastronomiebetrieben und Dienstleistern in der Region Kieler Förde eingelöst werden - auch in Teilbeträgen.</span></div>',
    contentBackgroundColor: '#009ee0',
    websiteUrl: 'www.testing.com',
    openInExternalBrowser: false,
    displayOrder: 0,
    isActive: true,
    publishAt: null,
    expireAt: null,
    createdByUserId: 'd566edac-87c5-474f-9f07-2e703eee8347',
    lastEditedByUserId: 'd566edac-87c5-474f-9f07-2e703eee8347',
    createdAt: new Date('2025-11-19 11:25:30.175'),
    updatedAt: new Date('2025-11-20 12:26:37.469'),
    iconImageUrl:
      'https://kiel.nbg1.your-objectstorage.com/tiles/6afbe807-cd16-4d0e-8540-dc03bad7df35/icon.webp',
    languageCode: 'de',
  },
  {
    id: 'c4da74df-28bc-4074-8e3d-06eda714fb4f',
    slug: 'bereit-f-r-den-sommer',
    backgroundImageUrl:
      'https://kiel.nbg1.your-objectstorage.com/tiles/c4da74df-28bc-4074-8e3d-06eda714fb4f/background.webp',
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
    createdByUserId: 'd566edac-87c5-474f-9f07-2e703eee8347',
    lastEditedByUserId: 'd566edac-87c5-474f-9f07-2e703eee8347',
    createdAt: new Date('2025-11-19 11:19:53.287'),
    updatedAt: new Date('2025-11-20 12:27:37.205'),
    iconImageUrl:
      'https://kiel.nbg1.your-objectstorage.com/tiles/c4da74df-28bc-4074-8e3d-06eda714fb4f/icon.webp',
    languageCode: 'de',
  },
];

async function seedTiles() {
  console.log('🌱 Seeding tiles (static data)...');

  const cityId = process.env.CITY_ID?.trim() || undefined;
  if (cityId) {
    console.log(`ℹ Using CITY_ID=${cityId} for TileCity relations.`);
  } else {
    console.log('ℹ No CITY_ID provided; tiles will be seeded without TileCity relations.');
  }

  let created = 0;
  let updated = 0;

  for (const tile of TILES) {
    try {
      const result = await prisma.tile.upsert({
        where: { id: tile.id },
        create: {
          id: tile.id,
          slug: tile.slug,
          backgroundImageUrl: tile.backgroundImageUrl ?? undefined,
          iconImageUrl: tile.iconImageUrl ?? undefined,
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
          createdByUserId: tile.createdByUserId ?? undefined,
          lastEditedByUserId: tile.lastEditedByUserId ?? undefined,
          createdAt: tile.createdAt ?? undefined,
          updatedAt: tile.updatedAt ?? undefined,
        },
        update: {
          slug: tile.slug,
          backgroundImageUrl: tile.backgroundImageUrl ?? undefined,
          iconImageUrl: tile.iconImageUrl ?? undefined,
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
          createdByUserId: tile.createdByUserId ?? undefined,
          lastEditedByUserId: tile.lastEditedByUserId ?? undefined,
          updatedAt: tile.updatedAt ?? undefined,
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

      // Simple existence-based counters: check if it existed before via findUnique
      // (We do it lazily here to avoid a second query per row in the hot path.)
      // For now, just increment "updated" when an existing record is found, otherwise "created".
      const existing = await prisma.tile.findUnique({
        where: { id: tile.id },
        select: { createdAt: true },
      });

      if (existing && existing.createdAt && tile.createdAt) {
        // If createdAt matches within 1 second, assume it's the same record we just created
        const diff = Math.abs(existing.createdAt.getTime() - tile.createdAt.getTime());
        if (diff < 1000) {
          created++;
          console.log(`✓ Created tile: ${tile.header} (slug: ${tile.slug})`);
        } else {
          updated++;
          console.log(`↻ Updated tile: ${tile.header} (slug: ${tile.slug})`);
        }
      } else if (existing) {
        updated++;
        console.log(`↻ Updated tile: ${tile.header} (slug: ${tile.slug})`);
      } else {
        created++;
        console.log(`✓ Created tile: ${tile.header} (slug: ${tile.slug})`);
      }
    } catch (error) {
      console.error(
        `❌ Error processing tile "${tile.header}" (id: ${tile.id}, slug: ${tile.slug}):`,
        error,
      );
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
    await prisma.$disconnect();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
