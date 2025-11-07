#!/usr/bin/env ts-node
/**
 * Terms of Use Seeding Script
 *
 * Seeds the users database with default general terms of use.
 * General terms have cityId = null and can be used by all cities.
 *
 * Prerequisites:
 * 1. Run Prisma migration: yarn prisma:migrate (or yarn prisma:migrate:users)
 * 2. Regenerate Prisma client: yarn prisma:generate
 *
 * Run: yarn seed:terms
 * Or: npx ts-node scripts/seed-terms.ts
 */

// Register tsconfig-paths to resolve TypeScript path mappings
import 'tsconfig-paths/register';

import { PrismaClient } from '@prisma/client-users';

const prisma = new PrismaClient();

// Default general terms of use (English)
// Version format: YYYY-MM (e.g., "2024-01", "2024-11")
const getCurrentVersion = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const DEFAULT_TERMS = {
  version: getCurrentVersion(), // e.g., "2024-11" or "2025-01"
  title: 'Terms of Use',
  content: `
    <h1>Terms of Use</h1>
    <p>Welcome to HEIDI Platform. By using our services, you agree to the following terms:</p>

    <h2>1. Acceptance of Terms</h2>
    <p>By accessing and using this platform, you accept and agree to be bound by the terms and provision of this agreement.</p>

    <h2>2. Use License</h2>
    <p>Permission is granted to temporarily use this platform for personal, non-commercial transitory viewing only.</p>

    <h2>3. User Account</h2>
    <p>You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.</p>

    <h2>4. User Content</h2>
    <p>You are responsible for any content you post on the platform. You agree not to post content that is illegal, harmful, or violates any rights of others.</p>

    <h2>5. Privacy</h2>
    <p>Your use of this platform is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices.</p>

    <h2>6. Modifications</h2>
    <p>We reserve the right to modify these terms at any time. We will notify users of any significant changes.</p>

    <h2>7. Contact</h2>
    <p>If you have any questions about these Terms of Use, please contact us.</p>
  `,
  locale: 'en',
  cityId: null, // General terms (not city-specific)
  isActive: true,
  isLatest: true,
  gracePeriodDays: 7,
};

async function seedTerms() {
  console.log('🌱 Starting terms of use seeding...');

  try {
    // Check if general terms already exist
    const existingTerms = await prisma.termsOfUse.findFirst({
      where: {
        version: DEFAULT_TERMS.version,
        locale: DEFAULT_TERMS.locale,
        cityId: { equals: null },
      },
    });

    if (existingTerms) {
      console.log('ℹ️  General terms of use already exist, skipping...');
      console.log(`   Version: ${existingTerms.version}, Locale: ${existingTerms.locale}`);
      return;
    }

    // Create default general terms
    console.log('📝 Creating default general terms of use...');
    const terms = await prisma.termsOfUse.create({
      data: DEFAULT_TERMS,
    });

    console.log(`✅ Created general terms of use:`);
    console.log(`   ID: ${terms.id}`);
    console.log(`   Version: ${terms.version}`);
    console.log(`   Locale: ${terms.locale}`);
    console.log(`   City ID: ${terms.cityId || 'General (all cities)'}`);
    console.log(`   Is Latest: ${terms.isLatest}`);
    console.log(`   Grace Period: ${terms.gracePeriodDays} days`);

    console.log('\n🎉 Terms of use seeding completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   - Update the terms content as needed via admin API');
    console.log('   - Add translations for other locales (de, ar, etc.)');
    console.log('   - Create city-specific terms if needed');
  } catch (error) {
    console.error('❌ Error seeding terms of use:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedTerms().catch((error) => {
  console.error(error);
  process.exit(1);
});
