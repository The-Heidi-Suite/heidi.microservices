# New Module Scaffold

## Description
Add a new feature module to an existing microservice.

## Steps

1. **Create module directory:**
   ```
   apps/<service>/src/modules/<feature>/
   ├── <feature>.controller.ts
   ├── <feature>.service.ts
   ├── <feature>.module.ts
   └── dto/ (optional)
   ```

2. **Create service file:**
   ```typescript
   import { Injectable, Inject } from '@nestjs/common';
   import { Prisma<Service>Service } from '@heidi/prisma';
   import { RABBITMQ_CLIENT, RmqClientWrapper } from '@heidi/rabbitmq';
   import { RedisService } from '@heidi/redis';
   import { LoggerService } from '@heidi/logger';

   @Injectable()
   export class FeatureService {
     private readonly logger: LoggerService;

     constructor(
       private readonly prisma: Prisma<Service>Service,
       @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
       private readonly redis: RedisService,
       logger: LoggerService,
     ) {
       this.logger = logger;
       this.logger.setContext(FeatureService.name);
     }
   }
   ```

3. **Create controller file:**
   ```typescript
   import { Controller, Get, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
   import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
   import { JwtAuthGuard, GetCurrentUser, Public } from '@heidi/jwt';
   import { FeatureService } from './feature.service';
   import { CreateFeatureDto, FeatureResponseDto } from '@heidi/contracts';

   @ApiTags('feature')
   @Controller('features')
   @UseGuards(JwtAuthGuard)
   export class FeatureController {
     constructor(private readonly featureService: FeatureService) {}

     @Post()
     @ApiBearerAuth('JWT-auth')
     @ApiOperation({ summary: 'Create feature' })
     @ApiResponse({ status: 201, type: FeatureResponseDto })
     @HttpCode(HttpStatus.CREATED)
     async create(@Body() dto: CreateFeatureDto, @GetCurrentUser('userId') userId: string) {
       return this.featureService.create(dto, userId);
     }
   }
   ```

4. **Create module file:**
   ```typescript
   import { Module } from '@nestjs/common';
   import { FeatureController } from './feature.controller';
   import { FeatureService } from './feature.service';
   import { Prisma<Service>Module } from '@heidi/prisma';
   import { RabbitMQModule } from '@heidi/rabbitmq';
   import { RedisModule } from '@heidi/redis';

   @Module({
     imports: [Prisma<Service>Module, RabbitMQModule, RedisModule],
     controllers: [FeatureController],
     providers: [FeatureService],
     exports: [FeatureService], // If used by other modules
   })
   export class FeatureModule {}
   ```

5. **Import module in app.module.ts:**
   ```typescript
   import { FeatureModule } from './modules/feature/feature.module';

   @Module({
     imports: [
       // ... other imports
       FeatureModule,
     ],
   })
   export class AppModule {}
   ```

## Naming Convention
- Module: `FeatureModule` (PascalCase)
- Service: `FeatureService` (PascalCase)
- Controller: `FeatureController` (PascalCase)
- Files: `feature.service.ts`, `feature.controller.ts` (kebab-case)
