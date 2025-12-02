# New Seed Script Scaffold

## Description
Create a new seed script for database seeding.

## Steps

1. **Create script file:**
   ```
   scripts/seed-<name>.ts
   ```

2. **Script template:**
   ```typescript
   #!/usr/bin/env ts-node
   /**
    * <Description> Seeding Script
    *
    * Prerequisites:
    * 1. Run Prisma migrations: yarn prisma:migrate
    * 2. Regenerate Prisma client: yarn prisma:generate
    *
    * Run: yarn seed:<name>
    * Or: npx ts-node -r tsconfig-paths/register scripts/seed-<name>.ts
    */

   // Register tsconfig-paths to resolve TypeScript path mappings
   import 'tsconfig-paths/register';

   import { PrismaClient } from '@prisma/client-<service>'; // Use appropriate service client
   import { LoggerService } from '@heidi/logger'; // Optional

   const prisma = new PrismaClient();

   type SeedSummary = {
     created: number;
     updated: number;
     skipped: number;
   };

   const summary: SeedSummary = {
     created: 0,
     updated: 0,
     skipped: 0,
   };

   async function seedData() {
     console.log('🌱 Starting seeding...');

     try {
       // Seeding logic here
       // Use upsert for idempotency

       console.log('\n📊 Seeding summary:');
       console.log(`  • Created: ${summary.created}`);
       console.log(`  • Updated: ${summary.updated}`);
       console.log(`  • Skipped: ${summary.skipped}`);
       console.log('\n🎉 Seeding completed successfully!');
     } catch (error) {
       console.error('❌ Error seeding:', error);
       throw error;
     } finally {
       await prisma.$disconnect();
     }
   }

   seedData().catch((error) => {
     console.error(error);
     process.exit(1);
   });
   ```

3. **Add to package.json:**
   ```json
   {
     "scripts": {
       "seed:<name>": "bash ./scripts/seed-wrapper.sh scripts/seed-<name>.ts"
     }
   }
   ```

4. **Update seed-all.sh:**
   Add script to the list of scripts to run in `scripts/seed-all.sh`

## Idempotency
- Scripts must be safe to run multiple times
- Use `upsert` instead of `create` when possible
- Check for existing records before creating

## Prisma Client
- Use service-specific client: `@prisma/client-<service>`
- Import types: `import { Model, ModelType } from '@prisma/client-<service>';`

## Error Handling
- Always use try-catch
- Log errors with context
- Exit with error code on failure
- Disconnect Prisma client in finally block

## Summary Tracking
- Track created, updated, skipped counts
- Display summary at the end
- Use emoji for visual clarity (🌱, ✓, ↻, ❌, 📊, 🎉)
