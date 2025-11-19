#!/usr/bin/env ts-node
/**
 * Upload Category Assets to Object Storage
 *
 * This script uploads processed category and city header images to object storage
 * and updates the database with the public URLs.
 *
 * Prerequisites:
 *   1. Run resize-category-assets.ts to process images
 *   2. Run rename-and-organize-assets.ts to organize files
 *   3. Ensure categories and cities are seeded in the database
 *   4. Set storage environment variables (HETZNER_STORAGE_*)
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/upload-category-assets.ts [--skip-existing]
 *
 * Options:
 *   --skip-existing: Skip uploading if imageUrl is already set in database
 */

import 'tsconfig-paths/register';

import * as fs from 'fs/promises';
import * as path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient as CorePrismaClient } from '@prisma/client-core';
import { PrismaClient as CityPrismaClient } from '@prisma/client-city';
import { CATEGORY_ASSETS, CITY_HEADER_IMAGE } from './assets/category-assets-mapping';
import sharp from 'sharp';

const SKIP_EXISTING = process.argv.includes('--skip-existing');

// Initialize S3 client for Hetzner Object Storage
function createS3Client() {
  const endpoint = process.env.HETZNER_STORAGE_ENDPOINT;
  const accessKeyId = process.env.HETZNER_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.HETZNER_STORAGE_SECRET_ACCESS_KEY;
  const region = process.env.HETZNER_STORAGE_REGION || 'fsn1';

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Storage credentials not configured. Please set HETZNER_STORAGE_ENDPOINT, HETZNER_STORAGE_ACCESS_KEY_ID, and HETZNER_STORAGE_SECRET_ACCESS_KEY environment variables.',
    );
  }

  return new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: false,
  });
}

// Generate public URL
function generatePublicUrl(bucket: string, key: string): string {
  const endpoint = process.env.HETZNER_STORAGE_ENDPOINT;
  if (!endpoint) {
    throw new Error('HETZNER_STORAGE_ENDPOINT is not configured');
  }

  try {
    const endpointUrl = new URL(endpoint);
    const hostname = endpointUrl.hostname;
    const domainParts = hostname.split('.');
    if (domainParts.length < 2) {
      return `${endpoint}/${bucket}/${key}`;
    }
    return `${endpointUrl.protocol}//${bucket}.${hostname}/${key}`;
  } catch (error) {
    return `${endpoint}/${bucket}/${key}`;
  }
}

// Process image using sharp (same as FileUploadService)
async function processImage(
  inputBuffer: Buffer,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 85,
): Promise<Buffer> {
  let image = sharp(inputBuffer);
  const metadata = await image.metadata();

  if (metadata.width && metadata.height) {
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      image = image.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
  }

  return image.webp({ quality }).toBuffer();
}

async function uploadCategoryImage(
  s3Client: S3Client,
  bucket: string,
  categoryId: string,
  filePath: string,
): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const processedBuffer = await processImage(fileBuffer);

  const key = `categories/${categoryId}/image.webp`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: processedBuffer,
      ContentType: 'image/webp',
      ACL: 'public-read',
      Metadata: {
        originalName: path.basename(filePath),
        processed: 'true',
      },
    }),
  );

  return generatePublicUrl(bucket, key);
}

async function uploadCityHeader(
  s3Client: S3Client,
  bucket: string,
  cityId: string,
  filePath: string,
): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const processedBuffer = await processImage(fileBuffer);

  const key = `cities/${cityId}/header.webp`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: processedBuffer,
      ContentType: 'image/webp',
      ACL: 'public-read',
      Metadata: {
        originalName: path.basename(filePath),
        processed: 'true',
      },
    }),
  );

  return generatePublicUrl(bucket, key);
}

async function main() {
  console.log('☁️  Upload Category Assets to Object Storage');
  console.log('==========================================\n');

  if (SKIP_EXISTING) {
    console.log('⏭️  SKIP_EXISTING mode: Will skip categories/cities with existing imageUrl\n');
  }

  const assetsDir = path.join(__dirname, 'assets');
  const categoriesDir = path.join(assetsDir, 'categories');
  const cityHeadersDir = path.join(assetsDir, 'city-headers');

  // Check directories exist
  if (
    !(await fs
      .access(categoriesDir)
      .then(() => true)
      .catch(() => false))
  ) {
    console.error(
      '❌ Categories directory not found. Please run rename-and-organize-assets.ts first.',
    );
    process.exit(1);
  }

  // Initialize services
  const s3Client = createS3Client();
  const bucket = process.env.HETZNER_STORAGE_DEFAULT_BUCKET;
  if (!bucket) {
    throw new Error('HETZNER_STORAGE_DEFAULT_BUCKET is not configured');
  }

  const corePrisma = new CorePrismaClient();
  const cityPrisma = new CityPrismaClient();

  let uploadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Upload category images
  console.log('📦 Uploading category images...\n');
  for (const [slug, asset] of Object.entries(CATEGORY_ASSETS)) {
    const fileName = asset.imageFileName;
    const filePath = path.join(categoriesDir, fileName);

    // Check if file exists
    if (
      !(await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false))
    ) {
      console.log(`⚠️  File not found: ${fileName} (slug: ${slug})`);
      continue;
    }

    try {
      // Find category by slug
      const category = await corePrisma.category.findUnique({
        where: { slug },
        select: { id: true, imageUrl: true },
      });

      if (!category) {
        console.log(`⚠️  Category not found in database: ${slug}`);
        errorCount++;
        continue;
      }

      // Skip if already uploaded
      if (SKIP_EXISTING && category.imageUrl) {
        console.log(`⏭️  Skipping ${slug} (already has imageUrl)`);
        skippedCount++;
        continue;
      }

      console.log(`📤 Uploading ${slug}...`);
      const imageUrl = await uploadCategoryImage(s3Client, bucket, category.id, filePath);

      // Update database
      await corePrisma.category.update({
        where: { id: category.id },
        data: { imageUrl },
      });

      console.log(`  ✓ Uploaded: ${imageUrl}`);
      uploadedCount++;
    } catch (error) {
      console.error(
        `  ❌ Failed to upload ${slug}:`,
        error instanceof Error ? error.message : error,
      );
      errorCount++;
    }
  }

  // Upload city header images
  console.log('\n📦 Uploading city header images...\n');
  for (const [cityName, cityData] of Object.entries(CITY_HEADER_IMAGE)) {
    const fileName = cityData.primary;
    const filePath = path.join(cityHeadersDir, fileName);

    // Check if file exists
    if (
      !(await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false))
    ) {
      console.log(`⚠️  File not found: ${fileName} (city: ${cityName})`);
      continue;
    }

    try {
      // Find city by name (assuming Kiel for now, can be extended)
      const city = await cityPrisma.city.findFirst({
        where: {
          name: cityName === 'kiel' ? 'Kiel' : cityName,
        },
        select: { id: true, headerImageUrl: true },
      });

      if (!city) {
        console.log(`⚠️  City not found in database: ${cityName}`);
        errorCount++;
        continue;
      }

      // Skip if already uploaded
      if (SKIP_EXISTING && city.headerImageUrl) {
        console.log(`⏭️  Skipping ${cityName} (already has headerImageUrl)`);
        skippedCount++;
        continue;
      }

      console.log(`📤 Uploading ${cityName} header...`);
      const headerImageUrl = await uploadCityHeader(s3Client, bucket, city.id, filePath);

      // Update database
      await cityPrisma.city.update({
        where: { id: city.id },
        data: { headerImageUrl },
      });

      console.log(`  ✓ Uploaded: ${headerImageUrl}`);
      uploadedCount++;
    } catch (error) {
      console.error(
        `  ❌ Failed to upload ${cityName} header:`,
        error instanceof Error ? error.message : error,
      );
      errorCount++;
    }
  }

  // Summary
  console.log('\n\n📊 Upload Summary');
  console.log('================');
  console.log(`✓ Uploaded: ${uploadedCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  await Promise.allSettled([corePrisma.$disconnect(), cityPrisma.$disconnect()]);

  console.log('\n✅ Upload complete!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
