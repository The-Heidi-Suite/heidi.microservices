import { PrismaClient as PrismaUsersClient } from '@prisma/client-users';

const prisma = new PrismaUsersClient();

const salutations = [
  // English
  { code: 'MR', label: 'Mr', locale: 'en', sortOrder: 1 },
  { code: 'MRS', label: 'Mrs', locale: 'en', sortOrder: 2 },
  { code: 'MS', label: 'Ms', locale: 'en', sortOrder: 3 },
  { code: 'DR', label: 'Dr', locale: 'en', sortOrder: 4 },
  { code: 'PROF', label: 'Prof', locale: 'en', sortOrder: 5 },
  { code: 'REV', label: 'Rev', locale: 'en', sortOrder: 6 },

  // German (de)
  { code: 'MR', label: 'Herr', locale: 'de', sortOrder: 1 },
  { code: 'MRS', label: 'Frau', locale: 'de', sortOrder: 2 },
  { code: 'MS', label: 'Frau', locale: 'de', sortOrder: 3 },
  { code: 'DR', label: 'Dr.', locale: 'de', sortOrder: 4 },
  { code: 'PROF', label: 'Prof.', locale: 'de', sortOrder: 5 },
  { code: 'REV', label: 'Pastor', locale: 'de', sortOrder: 6 },

  // Arabic (ar)
  { code: 'MR', label: 'السيد', locale: 'ar', sortOrder: 1 },
  { code: 'MRS', label: 'السيدة', locale: 'ar', sortOrder: 2 },
  { code: 'MS', label: 'الآنسة', locale: 'ar', sortOrder: 3 },
  { code: 'DR', label: 'د.', locale: 'ar', sortOrder: 4 },
  { code: 'PROF', label: 'أ.', locale: 'ar', sortOrder: 5 },
  { code: 'REV', label: 'القس', locale: 'ar', sortOrder: 6 },

  // Danish (dk)
  { code: 'MR', label: 'Hr.', locale: 'dk', sortOrder: 1 },
  { code: 'MRS', label: 'Fru', locale: 'dk', sortOrder: 2 },
  { code: 'MS', label: 'Frk.', locale: 'dk', sortOrder: 3 },
  { code: 'DR', label: 'Dr.', locale: 'dk', sortOrder: 4 },
  { code: 'PROF', label: 'Prof.', locale: 'dk', sortOrder: 5 },
  { code: 'REV', label: 'Pastor', locale: 'dk', sortOrder: 6 },

  // Norwegian (no)
  { code: 'MR', label: 'Hr.', locale: 'no', sortOrder: 1 },
  { code: 'MRS', label: 'Fru', locale: 'no', sortOrder: 2 },
  { code: 'MS', label: 'Frk.', locale: 'no', sortOrder: 3 },
  { code: 'DR', label: 'Dr.', locale: 'no', sortOrder: 4 },
  { code: 'PROF', label: 'Prof.', locale: 'no', sortOrder: 5 },
  { code: 'REV', label: 'Pastor', locale: 'no', sortOrder: 6 },

  // Swedish (se)
  { code: 'MR', label: 'Hr', locale: 'se', sortOrder: 1 },
  { code: 'MRS', label: 'Fru', locale: 'se', sortOrder: 2 },
  { code: 'MS', label: 'Fröken', locale: 'se', sortOrder: 3 },
  { code: 'DR', label: 'Dr', locale: 'se', sortOrder: 4 },
  { code: 'PROF', label: 'Prof', locale: 'se', sortOrder: 5 },
  { code: 'REV', label: 'Pastor', locale: 'se', sortOrder: 6 },

  // Persian/Farsi (fa)
  { code: 'MR', label: 'آقای', locale: 'fa', sortOrder: 1 },
  { code: 'MRS', label: 'خانم', locale: 'fa', sortOrder: 2 },
  { code: 'MS', label: 'خانم', locale: 'fa', sortOrder: 3 },
  { code: 'DR', label: 'دکتر', locale: 'fa', sortOrder: 4 },
  { code: 'PROF', label: 'استاد', locale: 'fa', sortOrder: 5 },
  { code: 'REV', label: 'کشیش', locale: 'fa', sortOrder: 6 },

  // Turkish (tr)
  { code: 'MR', label: 'Bay', locale: 'tr', sortOrder: 1 },
  { code: 'MRS', label: 'Bayan', locale: 'tr', sortOrder: 2 },
  { code: 'MS', label: 'Bayan', locale: 'tr', sortOrder: 3 },
  { code: 'DR', label: 'Dr.', locale: 'tr', sortOrder: 4 },
  { code: 'PROF', label: 'Prof.', locale: 'tr', sortOrder: 5 },
  { code: 'REV', label: 'Papaz', locale: 'tr', sortOrder: 6 },

  // Russian (ru)
  { code: 'MR', label: 'Г-н', locale: 'ru', sortOrder: 1 },
  { code: 'MRS', label: 'Г-жа', locale: 'ru', sortOrder: 2 },
  { code: 'MS', label: 'Г-жа', locale: 'ru', sortOrder: 3 },
  { code: 'DR', label: 'Д-р', locale: 'ru', sortOrder: 4 },
  { code: 'PROF', label: 'Проф.', locale: 'ru', sortOrder: 5 },
  { code: 'REV', label: 'Св.', locale: 'ru', sortOrder: 6 },

  // Ukrainian (uk)
  { code: 'MR', label: 'Пан', locale: 'uk', sortOrder: 1 },
  { code: 'MRS', label: 'Пані', locale: 'uk', sortOrder: 2 },
  { code: 'MS', label: 'Панна', locale: 'uk', sortOrder: 3 },
  { code: 'DR', label: 'Д-р', locale: 'uk', sortOrder: 4 },
  { code: 'PROF', label: 'Проф.', locale: 'uk', sortOrder: 5 },
  { code: 'REV', label: 'Св.', locale: 'uk', sortOrder: 6 },
];

async function main() {
  console.log('🌱 Seeding salutations...');

  for (const salutation of salutations) {
    await prisma.salutation.upsert({
      where: {
        code_locale: {
          code: salutation.code,
          locale: salutation.locale,
        },
      },
      update: {
        label: salutation.label,
        sortOrder: salutation.sortOrder,
        isActive: true,
      },
      create: salutation,
    });
  }

  console.log(`✅ Successfully seeded ${salutations.length} salutations`);
  console.log('📊 Summary:');
  const locales = [...new Set(salutations.map((s) => s.locale))];
  for (const locale of locales) {
    const count = salutations.filter((s) => s.locale === locale).length;
    console.log(`   - ${locale}: ${count} salutations`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding salutations:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
