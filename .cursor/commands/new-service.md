# New Service Scaffold

## Description

Scaffold a new microservice in the HEIDI monorepo.

## Steps

1. **Create service directory structure:**

   ```
   apps/<service-name>/
   ├── src/
   │   ├── main.ts
   │   ├── app.module.ts
   │   ├── health.controller.ts
   │   └── modules/
   └── tsconfig.app.json
   ```

2. **Create main.ts:**
   - Import NestFactory, ValidationPipe
   - Import AppModule
   - Set up global validation pipe
   - Listen on SERVICE_PORT (check existing services for port number)

3. **Create app.module.ts:**
   - Import ConfigModule, Prisma module, RabbitMQModule, RedisModule
   - Import LoggerModule, MetricsModule, HealthModule
   - Import feature modules

4. **Create health.controller.ts:**
   - Use HealthCheckService
   - Check database, Redis, RabbitMQ health

5. **Update nest-cli.json:**
   - Add service to projects section
   - Set root, entryFile, sourceRoot, tsConfigPath

6. **Update package.json:**
   - Add build script: `"build:<service>": "nest build <service>"`
   - Add dev script: `"dev:<service>": "nest start <service> --watch"`

7. **Create Prisma schema:**
   - Create `libs/prisma/src/schemas/<service>/schema.prisma`
   - Set up datasource and generator
   - Add initial models

8. **Create Prisma service:**
   - Create `libs/prisma/src/services/prisma-<service>.service.ts`
   - Create `libs/prisma/src/modules/prisma-<service>.module.ts`
   - Create alias in `libs/prisma/src/aliases/prisma-<service>.ts`

9. **Update tsconfig.json:**
   - Add path alias: `"@heidi/prisma-<service>": ["libs/prisma/src/aliases/prisma-<service>.ts"]`
   - Add Prisma client path: `"@prisma/client-<service>": ["./node_modules/.prisma/client-<service>"]`

10. **Update docker-compose.yml:**
    - Add service definition
    - Set SERVICE_PORT environment variable
    - Add health check
    - Add dependencies on postgres, redis, rabbitmq

11. **Run migrations:**
    ```bash
    yarn prisma:migrate
    yarn prisma:generate
    ```

## Example Service Names

- `auth`, `users`, `city`, `core`, `notification`, `scheduler`, `integration`, `admin`, `terminal`

## Port Assignment

Check existing services and assign next available port (3001-3009).
