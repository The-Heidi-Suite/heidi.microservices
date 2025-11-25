# Salutation Implementation Guide

## Overview

This document describes the implementation of multi-language salutation (title) support for users. Salutations are now stored in the database with translations, ensuring users can select from predefined options that respect their preferred language.

## Changes Made

### 1. Database Schema (`libs/prisma/src/schemas/users/schema.prisma`)

#### New Salutation Model

```prisma
model Salutation {
  id        String   @id @default(uuid())
  code      String   // Unique code like "MR", "MRS", "MS", "DR", "PROF"
  label     String   // Translated label (e.g., "Mr", "Herr", "السيد")
  locale    String   // e.g., 'en', 'de', 'ar'
  sortOrder Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([code, locale])
  @@index([code])
  @@index([locale])
  @@index([isActive])
  @@index([sortOrder])
  @@map("salutations")
}
```

#### Updated User Model

- Changed from `salutation: String?` to `salutationCode: String?`
- Added index on `salutationCode`
- The code references `Salutation.code` for localized display

### 2. API Endpoints

#### GET `/salutations`

**Public endpoint** to retrieve available salutations in a specific language.

**Query Parameters:**

- `locale` (optional): Language code (e.g., 'en', 'de', 'ar'). Defaults to user's accept-language header or 'en'.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "code": "MR",
      "label": "Mr",
      "locale": "en",
      "sortOrder": 1
    },
    {
      "code": "MRS",
      "label": "Mrs",
      "locale": "en",
      "sortOrder": 2
    }
  ],
  "message": "Salutations retrieved successfully",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/salutations",
  "statusCode": 200
}
```

### 3. Updated DTOs

All user-related DTOs now use `salutationCode` instead of free-text `salutation`:

- `RegisterDto`
- `UpdateProfileDto`
- `CreateUserDto`
- `UpdateUserDto`
- `UserDto` (response)

**Example:**

```typescript
@ApiPropertyOptional({
  description: 'User salutation code (e.g., "MR", "MRS", "MS", "DR", "PROF"). Use GET /salutations to fetch available options.',
  example: 'MR',
})
@IsString()
@IsOptional()
salutationCode?: string;
```

### 4. Supported Languages

Salutations are available in 10 languages:

- **English** (en): Mr, Mrs, Ms, Dr, Prof, Rev
- **German** (de): Herr, Frau, Dr., Prof., Pastor
- **Arabic** (ar): السيد, السيدة, الآنسة, د., أ., القس
- **Danish** (dk): Hr., Fru, Frk., Dr., Prof., Pastor
- **Norwegian** (no): Hr., Fru, Frk., Dr., Prof., Pastor
- **Swedish** (se): Hr, Fru, Fröken, Dr, Prof, Pastor
- **Persian/Farsi** (fa): آقای, خانم, دکتر, استاد, کشیش
- **Turkish** (tr): Bay, Bayan, Dr., Prof., Papaz
- **Russian** (ru): Г-н, Г-жа, Д-р, Проф., Св.
- **Ukrainian** (uk): Пан, Пані, Панна, Д-р, Проф., Св.

## Usage Flow

### For Frontend/Mobile Clients:

1. **Fetch Available Salutations**

   ```http
   GET /salutations?locale=de
   ```

2. **Display Localized Options**
   Show the `label` to users while storing the `code`.

3. **Submit Registration/Update**

   ```json
   {
     "email": "user@example.com",
     "firstName": "John",
     "lastName": "Doe",
     "salutationCode": "MR",
     "hasVehicle": false
   }
   ```

4. **Display User Profile**
   When displaying the user's salutation, fetch it again using their preferred language:
   ```http
   GET /salutations?locale=en
   ```
   Then match the stored `salutationCode` with the localized `label`.

## Database Seeding

Run the seed script to populate salutations:

```bash
npx ts-node scripts/seed-salutations.ts
```

This will create:

- 6 salutation types (MR, MRS, MS, DR, PROF, REV)
- Translated into 10 languages
- Total: 60 salutation records

## Migration Steps

1. **Generate Prisma Client:**

   ```bash
   npx prisma generate --schema=libs/prisma/src/schemas/users/schema.prisma
   ```

2. **Create Migration:**

   ```bash
   npx prisma migrate dev --name add_salutations --schema=libs/prisma/src/schemas/users/schema.prisma
   ```

3. **Seed Salutations:**
   ```bash
   npx ts-node scripts/seed-salutations.ts
   ```

## Benefits

✅ **Type Safety**: Users can only select from predefined salutations
✅ **Localization**: Salutations automatically display in user's preferred language
✅ **Consistency**: Same salutation codes across all languages
✅ **Extensibility**: Easy to add new salutations or languages
✅ **Data Integrity**: No free-text errors or inconsistencies

## Example Frontend Implementation

```typescript
// Fetch salutations based on user's language
const fetchSalutations = async (locale: string) => {
  const response = await fetch(`/api/users/salutations?locale=${locale}`);
  const data = await response.json();
  return data.data; // Array of salutations
};

// Display in a dropdown
<Select>
  {salutations.map(s => (
    <Option key={s.code} value={s.code}>
      {s.label}
    </Option>
  ))}
</Select>

// When displaying user info
const getUserSalutationLabel = (userSalutationCode, salutations) => {
  const salutation = salutations.find(s => s.code === userSalutationCode);
  return salutation?.label || '';
};
```

## Notes

- The endpoint uses Accept-Language header by default if no locale is specified
- Fallback to English ('en') if requested locale has no salutations
- All salutations are marked as `isActive: true` by default
- The `sortOrder` field ensures consistent display order across all languages
