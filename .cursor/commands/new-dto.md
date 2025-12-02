# New DTO Scaffold

## Description

Create a new DTO in the contracts library.

## Steps

1. **Determine domain:**
   - Choose appropriate domain folder: `auth`, `users`, `city`, `core`, `listings`, `notification`, etc.
   - If domain doesn't exist, create it

2. **Create DTO file:**

   ```
   libs/contracts/src/dto/<domain>/<name>.dto.ts
   ```

3. **Request DTO template:**

   ```typescript
   import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';
   import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

   export class CreateFeatureDto {
     @ApiProperty({
       description: 'Feature name',
       example: 'My Feature',
     })
     @IsString()
     @MinLength(3)
     name: string;

     @ApiPropertyOptional({
       description: 'Optional description',
       example: 'Feature description',
     })
     @IsOptional()
     @IsString()
     description?: string;
   }
   ```

4. **Response DTO template:**

   ```typescript
   import { ApiProperty } from '@nestjs/swagger';

   export class FeatureResponseDto {
     @ApiProperty({
       description: 'Feature ID',
       example: '123e4567-e89b-12d3-a456-426614174000',
     })
     id: string;

     @ApiProperty({
       description: 'Feature name',
       example: 'My Feature',
     })
     name: string;

     @ApiProperty({
       description: 'Creation timestamp',
       example: '2024-01-01T00:00:00.000Z',
     })
     createdAt: string;
   }
   ```

5. **Error Response DTO template:**

   ```typescript
   import { ApiProperty } from '@nestjs/swagger';

   export class FeatureErrorResponseDto {
     @ApiProperty({
       description: 'Error code',
       example: 'FEATURE_NOT_FOUND',
     })
     errorCode: string;

     @ApiProperty({
       description: 'Error message',
       example: 'Feature with id 123 not found',
     })
     message: string;

     @ApiProperty({
       description: 'HTTP status code',
       example: 404,
     })
     statusCode: number;

     @ApiProperty({
       description: 'Timestamp',
       example: '2024-01-01T00:00:00.000Z',
     })
     timestamp: string;

     @ApiProperty({
       description: 'Request path',
       example: '/features/123',
     })
     path: string;
   }
   ```

6. **Export from domain index:**

   ```typescript
   // libs/contracts/src/dto/<domain>/index.ts
   export * from './<name>.dto';
   ```

7. **Export from main index:**
   ```typescript
   // libs/contracts/src/dto/index.ts
   export * from './<domain>';
   ```

## Naming Convention

- Request: `CreateFeatureDto`, `UpdateFeatureDto`, `DeleteFeatureDto`
- Response: `FeatureResponseDto`, `FeatureListResponseDto`
- Error: `FeatureErrorResponseDto`
- Filter: `FeatureFilterDto`

## Validation

- Use `class-validator` decorators
- Provide clear error messages
- Use `@IsOptional()` for optional fields
- Use `@Type()` for type transformation

## Swagger

- Always use `@ApiProperty()` or `@ApiPropertyOptional()`
- Provide descriptions and examples
- Specify types and formats
