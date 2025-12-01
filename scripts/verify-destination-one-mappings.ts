#!/usr/bin/env ts-node
/**
 * Verification script: Destination One Category Mappings
 *
 * Fetches sample items from each category mapping query and analyzes
 * which fields contain the expected category values to identify mismatches.
 *
 * Env vars:
 * - DO_LICENSEKEY: destination_one license key (required)
 * - DO_EXPERIENCE: destination_one experience (default: heidi-app-kiel)
 * - DO_TEMPLATE: API template (default: ET2014A_MULTI.json)
 * - DO_BASE_URL: Base URL (default: https://meta.et4.de/rest.ashx/search/)
 * - LOAD_FROM_DB: Set to 'true' to load config from database (default: false, uses hardcoded)
 * - INTEGRATION_NAME: Integration name to load config from DB (optional, only used with LOAD_FROM_DB=true)
 *
 * Example:
 *   DO_LICENSEKEY="xxx" npx ts-node scripts/verify-destination-one-mappings.ts
 *   LOAD_FROM_DB=true DO_LICENSEKEY="xxx" npx ts-node scripts/verify-destination-one-mappings.ts
 */

import 'tsconfig-paths/register';
import {
  PrismaClient as IntegrationPrismaClient,
  IntegrationProvider,
} from '@prisma/client-integration';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { DestinationOneConfig, DestinationOneCategoryMapping } from '@heidi/contracts';

interface DestinationOneItem {
  global_id: string;
  id: string;
  title: string;
  type: string;
  categories: string[];
  texts?: Array<{ rel: string; type?: string; value: string }>;
  country?: string;
  city?: string;
  zip?: string;
  street?: string;
  phone?: string;
  web?: string;
  email?: string;
  geo?: { main?: { latitude: number; longitude: number } };
  media_objects?: Array<{
    rel?: string;
    url: string;
    type?: string;
    value?: string;
    source?: string;
    license?: string;
  }>;
  timeIntervals?: Array<{
    weekdays: string[];
    start: string;
    end: string;
    tz: string;
    freq: string;
    interval: number;
    repeatUntil?: string;
  }>;
  company?: string;
  district?: string;
  cuisine_types?: string[];
  features?: string[];
  attributes?: Array<{ key: string; value: string }>;
}

interface DestinationOneResult {
  status: string;
  count: number;
  overallcount: number;
  channels?: any[];
  items: DestinationOneItem[];
  facetGroups?: Array<{
    field: string;
    facets: Array<{
      value: string;
      count: number;
    }>;
  }>;
}

interface DestinationOneResponse {
  count: number;
  overallcount: number;
  results: DestinationOneResult[];
}

interface FieldAnalysis {
  field: string;
  foundValues: string[];
  missingValues: string[];
}

interface MappingAnalysis {
  mappingKey: string;
  heidiCategorySlug: string;
  heidiSubcategorySlug?: string;
  doTypes: string[];
  doCategoryValues: string[];
  sampleSize: number;
  itemsAnalyzed: number;
  fieldAnalyses: FieldAnalysis[];
  itemsWithMatches: number;
  itemsWithoutMatches: number;
  matchRate: number;
  sampleItems: Array<{
    id: string;
    title: string;
    type: string;
    fields: Record<string, any>;
  }>;
}

interface VerificationReport {
  generatedAt: string;
  config: {
    experience: string;
    baseUrl: string;
    template: string;
  };
  mappings: MappingAnalysis[];
  summary: {
    totalMappings: number;
    mappingsWithMatches: number;
    mappingsWithoutMatches: number;
    problematicMappings: string[];
  };
}

const prisma = new IntegrationPrismaClient();
const http: AxiosInstance = axios.create({
  timeout: 30000,
});

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`${name} must be set`);
  }
  return v.trim();
}

/**
 * Generate query string from category values (same logic as service)
 */
function generateQueryFromCategoryValues(categoryValues: string[]): string | undefined {
  if (!categoryValues || categoryValues.length === 0) {
    return undefined;
  }
  return categoryValues.map((val) => `category:"${val}"`).join(' OR ');
}

/**
 * Fetch data from Destination One API
 */
async function fetchData(
  config: DestinationOneConfig,
  type: string,
  query?: string,
  limit: number = 10,
): Promise<DestinationOneItem[]> {
  const baseUrl = config.baseUrl || 'https://meta.et4.de/rest.ashx/search/';
  const template = config.template || 'ET2014A_MULTI.json';

  const params = new URLSearchParams({
    experience: config.experience,
    licensekey: config.licensekey,
    template,
    type,
  });

  if (query) {
    params.append('q', query);
  }

  // Limit results
  params.append('pagesize', `${limit}`);

  const url = `${baseUrl}?${params.toString()}`;
  const sanitizedUrl = url.replace(config.licensekey, '***');

  console.log(`  Fetching: ${sanitizedUrl}`);

  try {
    const response = await http.get<DestinationOneResponse>(url);
    const items = response.data?.results?.[0]?.items || [];
    console.log(`  Retrieved ${items.length} items`);
    return items;
  } catch (error: any) {
    console.error(`  ❌ Failed to fetch: ${error?.message}`);
    return [];
  }
}

/**
 * Check which fields contain the expected category values
 */
function analyzeFields(item: DestinationOneItem, expectedValues: string[]): FieldAnalysis[] {
  const analyses: FieldAnalysis[] = [];

  // Fields to check based on item type
  const fieldsToCheck: Array<{ name: string; value: any }> = [
    { name: 'categories', value: item.categories || [] },
    { name: 'cuisine_types', value: item.cuisine_types || [] },
    { name: 'features', value: item.features || [] },
  ];

  // Also check attributes (as key-value pairs)
  if (item.attributes && item.attributes.length > 0) {
    const attributeValues = item.attributes.map((attr) => attr.value).filter(Boolean);
    fieldsToCheck.push({ name: 'attributes', value: attributeValues });
  }

  for (const field of fieldsToCheck) {
    if (!field.value || (Array.isArray(field.value) && field.value.length === 0)) {
      continue;
    }

    const fieldArray = Array.isArray(field.value) ? field.value : [field.value];
    const foundValues: string[] = [];
    const missingValues: string[] = [];

    for (const expected of expectedValues) {
      const found = fieldArray.some(
        (val) => typeof val === 'string' && val.toLowerCase() === expected.toLowerCase(),
      );
      if (found) {
        foundValues.push(expected);
      } else {
        missingValues.push(expected);
      }
    }

    if (foundValues.length > 0) {
      analyses.push({
        field: field.name,
        foundValues,
        missingValues,
      });
    }
  }

  return analyses;
}

/**
 * Get hardcoded category mappings (from seed-destination-one-integration.ts)
 */
function getHardcodedCategoryMappings(): DestinationOneCategoryMapping[] {
  return [
    // Event category mapping
    {
      heidiCategorySlug: 'events',
      doTypes: ['Event'],
      doCategoryValues: [],
    },
    // Shopping category mappings
    {
      heidiCategorySlug: 'shopping',
      doTypes: ['POI'],
      doCategoryValues: ['Einkaufen'],
    },
    {
      heidiCategorySlug: 'shopping',
      heidiSubcategorySlug: 'shopping-clothing',
      doTypes: ['POI'],
      doCategoryValues: [
        'Bekleidung',
        'Damen',
        'Herren',
        'Schuhe',
        'Baby & Kind',
        'Schuhe & Lederwaren',
      ],
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
      doCategoryValues: [
        'Melting Pot',
        'Fleet Quartier',
        'Obere Holstenstraße',
        'Kehden-Küter-Kiez',
        'Schlossquartier',
        'Holstenplatz',
        'Altstadt',
      ],
    },
    // Food & Drink category mappings
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
    // Culture category mappings
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
    {
      heidiCategorySlug: 'culture',
      doTypes: ['Tour', 'POI'],
      doCategoryValues: ['Ausflugsziele', 'Unterhaltung', 'Sport und Freizeit', 'bühne'],
    },
    // Tours category mappings
    {
      heidiCategorySlug: 'tours',
      doTypes: ['POI'],
      doCategoryValues: ['Blaue Linie'],
    },
  ];
}

async function verifyMappings() {
  console.log('🔍 Starting Destination One Category Mappings Verification...\n');

  const licensekey = requiredEnv('DO_LICENSEKEY');
  const experience = process.env.DO_EXPERIENCE?.trim() || 'heidi-app-kiel';
  const template = process.env.DO_TEMPLATE?.trim() || 'ET2014A_MULTI.json';
  const baseUrl = process.env.DO_BASE_URL?.trim() || 'https://meta.et4.de/rest.ashx/search/';
  // Set to 'db' to load from database, or leave empty/unset for hardcoded mappings
  const loadFromDb = process.env.LOAD_FROM_DB?.trim()?.toLowerCase() === 'true';
  const integrationName = process.env.INTEGRATION_NAME?.trim();

  let categoryMappings: DestinationOneCategoryMapping[];
  let config: DestinationOneConfig;

  // Load config from database or use hardcoded
  if (loadFromDb) {
    console.log('Loading config from database...');
    // Find by name if provided, otherwise find any DESTINATION_ONE integration
    const whereClause = integrationName
      ? { provider: IntegrationProvider.DESTINATION_ONE, name: integrationName }
      : { provider: IntegrationProvider.DESTINATION_ONE };

    const integration = await prisma.integration.findFirst({
      where: whereClause,
    });

    if (!integration) {
      throw new Error(
        integrationName
          ? `Integration "${integrationName}" not found`
          : 'No DESTINATION_ONE integration found in database',
      );
    }

    console.log(`  Found integration: "${integration.name}" (${integration.id})`);
    config = integration.config as unknown as DestinationOneConfig;
    categoryMappings = config.categoryMappings || [];
    console.log(`  Loaded ${categoryMappings.length} mappings from database\n`);
  } else {
    console.log('Using hardcoded category mappings\n');
    categoryMappings = getHardcodedCategoryMappings();
    config = {
      experience,
      licensekey,
      template,
      baseUrl,
      categoryMappings,
      cityId: '', // Not needed for verification
    };
  }

  // Create output directory
  const outputDir = path.join(__dirname, 'debug', 'do-responses');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}\n`);
  }

  const mappings: MappingAnalysis[] = [];
  const sampleSize = 10;

  console.log(`Analyzing ${categoryMappings.length} category mappings...\n`);

  // Analyze each mapping
  for (const mapping of categoryMappings) {
    const mappingKey = `${mapping.heidiCategorySlug}${mapping.heidiSubcategorySlug ? `/${mapping.heidiSubcategorySlug}` : ''}`;
    const query = generateQueryFromCategoryValues(mapping.doCategoryValues);

    console.log(`\n📋 Analyzing: ${mappingKey}`);
    console.log(`   Types: ${mapping.doTypes?.join(', ') || 'N/A'}`);
    console.log(
      `   Expected values: ${mapping.doCategoryValues.length > 0 ? mapping.doCategoryValues.join(', ') : '(all items)'}`,
    );
    console.log(`   Query: ${query || '(none - fetch all)'}`);

    const analysis: MappingAnalysis = {
      mappingKey,
      heidiCategorySlug: mapping.heidiCategorySlug,
      heidiSubcategorySlug: mapping.heidiSubcategorySlug,
      doTypes: mapping.doTypes || [],
      doCategoryValues: mapping.doCategoryValues,
      sampleSize,
      itemsAnalyzed: 0,
      fieldAnalyses: [],
      itemsWithMatches: 0,
      itemsWithoutMatches: 0,
      matchRate: 0,
      sampleItems: [],
    };

    // Fetch items for each type in the mapping
    const allItems: DestinationOneItem[] = [];
    for (const type of mapping.doTypes || []) {
      const items = await fetchData(config, type, query, sampleSize);
      allItems.push(...items);
    }

    analysis.itemsAnalyzed = allItems.length;

    // Analyze each item
    for (const item of allItems) {
      const fieldAnalyses = analyzeFields(item, mapping.doCategoryValues);
      const hasMatch = fieldAnalyses.length > 0;

      analysis.sampleItems.push({
        id: item.id,
        title: item.title,
        type: item.type,
        fields: {
          categories: item.categories || [],
          cuisine_types: item.cuisine_types || [],
          features: item.features || [],
          attributes: item.attributes || [],
        },
      });

      // Aggregate field analyses
      for (const fieldAnalysis of fieldAnalyses) {
        const existing = analysis.fieldAnalyses.find((fa) => fa.field === fieldAnalysis.field);
        if (existing) {
          // Merge found values (unique)
          const newFound = new Set([...existing.foundValues, ...fieldAnalysis.foundValues]);
          existing.foundValues = Array.from(newFound);
          // Update missing values
          const allExpected = new Set(mapping.doCategoryValues);
          existing.missingValues = Array.from(allExpected).filter(
            (v) => !existing.foundValues.includes(v),
          );
        } else {
          analysis.fieldAnalyses.push({ ...fieldAnalysis });
        }
      }

      if (hasMatch) {
        analysis.itemsWithMatches++;
      } else {
        analysis.itemsWithoutMatches++;
      }
    }

    // Calculate match rate
    if (analysis.itemsAnalyzed > 0) {
      analysis.matchRate = (analysis.itemsWithMatches / analysis.itemsAnalyzed) * 100;
    }

    // Save raw response to file
    const filename = `${mappingKey.replace(/\//g, '-')}.json`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(allItems, null, 2));
    console.log(`  💾 Saved ${allItems.length} items to: ${filepath}`);

    // Print summary
    console.log(`  ✓ Items analyzed: ${analysis.itemsAnalyzed}`);
    console.log(`  ✓ Items with matches: ${analysis.itemsWithMatches}`);
    console.log(`  ✓ Items without matches: ${analysis.itemsWithoutMatches}`);
    console.log(`  ✓ Match rate: ${analysis.matchRate.toFixed(1)}%`);
    if (analysis.fieldAnalyses.length > 0) {
      console.log(`  ✓ Fields with matches:`);
      for (const fieldAnalysis of analysis.fieldAnalyses) {
        console.log(`     - ${fieldAnalysis.field}: ${fieldAnalysis.foundValues.join(', ')}`);
      }
    } else if (analysis.itemsAnalyzed > 0 && mapping.doCategoryValues.length > 0) {
      console.log(`  ⚠️  WARNING: No fields matched expected values!`);
    }

    mappings.push(analysis);
  }

  // Generate report
  const problematicMappings = mappings
    .filter((m) => m.itemsAnalyzed > 0 && m.doCategoryValues.length > 0 && m.matchRate === 0)
    .map((m) => m.mappingKey);

  const report: VerificationReport = {
    generatedAt: new Date().toISOString(),
    config: {
      experience,
      baseUrl,
      template,
    },
    mappings,
    summary: {
      totalMappings: mappings.length,
      mappingsWithMatches: mappings.filter((m) => m.matchRate > 0).length,
      mappingsWithoutMatches: problematicMappings.length,
      problematicMappings,
    },
  };

  // Save report
  const reportPath = path.join(outputDir, 'mapping-analysis-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report saved to: ${reportPath}`);

  // Print summary
  console.log(`\n📊 SUMMARY`);
  console.log(`   Total mappings: ${report.summary.totalMappings}`);
  console.log(`   Mappings with matches: ${report.summary.mappingsWithMatches}`);
  console.log(`   Mappings without matches: ${report.summary.mappingsWithoutMatches}`);
  if (problematicMappings.length > 0) {
    console.log(`\n   ⚠️  Problematic mappings (no matches found):`);
    for (const mappingKey of problematicMappings) {
      console.log(`      - ${mappingKey}`);
    }
  }

  console.log(`\n✅ Verification complete!`);
}

verifyMappings()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
