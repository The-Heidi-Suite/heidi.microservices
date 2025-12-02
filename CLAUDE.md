# HEIDI Microservices - AI Assistant Guide

## Project Overview

HEIDI is a production-ready NestJS microservices monorepo with Docker, Prisma ORM, RabbitMQ messaging, Redis caching, and comprehensive observability. The platform supports multi-tenant operations across different cities and jurisdictions.

## Key Architecture Points

### Microservices

- **auth** (3001) - JWT authentication, login, logout, token refresh
- **users** (3002) - User CRUD operations with soft deletes
- **city** (3003) - City data management with geolocation
- **core** (3004) - Core business logic orchestration
- **notification** (3005) - Multi-channel notifications (email, SMS, push)
- **scheduler** (3006) - Cron jobs and scheduled tasks
- **integration** (3007) - External API integrations and webhooks
- **admin** (3008) - Admin interface service
- **terminal** (3009) - Terminal management (future)

### Multi-Database Architecture

Each microservice has its own PostgreSQL database:

- `heidi_auth`, `heidi_users`, `heidi_city`, `heidi_core`, etc.
- Prisma schemas located in `libs/prisma/src/schemas/<service>/`
- Use service-specific Prisma clients: `@prisma/client-auth`, `@prisma/client-core`, etc.

### Inter-Service Communication

- **RabbitMQ** for all inter-service communication
- **Never** make direct HTTP calls between services
- Request-response patterns for synchronous operations
- Fire-and-forget events for asynchronous operations
- All patterns defined in `libs/rabbitmq/src/rmq.constants.ts`

## Critical File Locations

### Services

- `apps/<service>/src/main.ts` - Service bootstrap
- `apps/<service>/src/app.module.ts` - Root module
- `apps/<service>/src/modules/<feature>/` - Feature modules

### Shared Libraries

- `libs/prisma/` - Database ORM (multi-database)
- `libs/contracts/` - DTOs and API contracts
- `libs/rabbitmq/` - Message queue client
- `libs/redis/` - Caching service
- `libs/jwt/` - Authentication utilities
- `libs/logger/` - Winston logger
- `libs/metrics/` - Prometheus metrics

### Configuration

- `tsconfig.json` - TypeScript configuration with path aliases
- `nest-cli.json` - NestJS monorepo configuration
- `docker-compose.yml` - Production Docker setup
- `docker-compose.dev.yml` - Development Docker setup

### Scripts

- `scripts/` - Seed scripts and utilities
- `scripts/seed-all.sh` - Run all seed scripts
- `scripts/prisma-migrate-all.sh` - Run migrations for all services

## Path Aliases

Always use TypeScript path aliases:

```typescript
import { PrismaAuthService } from '@heidi/prisma';
import { LoginDto } from '@heidi/contracts';
import { RabbitMQPatterns } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';
```

**Never use relative imports** like `../../../libs/prisma/src`.

## Common Workflows

### Adding a New Feature

1. Create DTO in `libs/contracts/src/dto/<domain>/`
2. Add validation decorators and Swagger docs
3. Create service method in `apps/<service>/src/modules/<feature>/<feature>.service.ts`
4. Create controller endpoint in `<feature>.controller.ts`
5. Add RabbitMQ pattern if needed in `libs/rabbitmq/src/rmq.constants.ts`
6. Update module imports

### Database Changes

1. Edit schema: `libs/prisma/src/schemas/<service>/schema.prisma`
2. Create migration: `yarn prisma:migrate`
3. Generate client: `yarn prisma:generate`
4. Update service code to use new schema

### Adding RabbitMQ Pattern

1. Add pattern to `RabbitMQPatterns` in `libs/rabbitmq/src/rmq.constants.ts`
2. Implement handler in target service message controller
3. Use pattern in calling service with timeout

## Do's and Don'ts

### ✅ Do

- Use path aliases (`@heidi/*`)
- Use service-specific Prisma clients
- Use RabbitMQ for inter-service communication
- Set timeouts on RabbitMQ requests
- Use `LoggerService` for logging
- Use DTOs from `@heidi/contracts`
- Follow kebab-case for files/directories
- Use Swagger decorators on all endpoints
- Handle errors with appropriate HTTP exceptions

### ❌ Don't

- Don't use relative imports
- Don't use `@prisma/client` directly
- Don't make HTTP calls between services
- Don't forget timeouts on RabbitMQ requests
- Don't use `console.log` (use `LoggerService`)
- Don't create DTOs outside `libs/contracts`
- Don't use camelCase for files
- Don't skip Swagger documentation
- Don't throw generic errors

## Code Patterns

### Service Injection

```typescript
constructor(
  private readonly prisma: PrismaCoreService,
  @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
  private readonly redis: RedisService,
  logger: LoggerService,
) {
  this.logger = logger;
  this.logger.setContext(ServiceName.name);
}
```

### RabbitMQ Request

```typescript
const user = await firstValueFrom(
  this.client.send(RabbitMQPatterns.USER_FIND_BY_ID, { id }).pipe(timeout(10000)),
);
```

### RabbitMQ Event

```typescript
this.client.emit(RabbitMQPatterns.USER_CREATED, {
  userId: user.id,
  email: user.email,
});
```

### Error Handling

```typescript
if (!user) {
  throw new NotFoundException({
    errorCode: 'USER_NOT_FOUND',
    message: `User with id ${id} not found`,
  });
}
```

## Environment Variables

Key variables (see `.env.example` for complete list):

- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `RABBITMQ_URL` - RabbitMQ connection
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `SERVICE_PORT` - Service port number
- `NODE_ENV` - Environment (development/production)

## Testing

- Test files: `*.spec.ts` in same directory
- Run: `yarn test`
- Coverage: `yarn test:cov`

## Docker Commands

- Start infra: `yarn docker:up:infra`
- Start services: `yarn docker:up:services`
- Start all: `yarn docker:up`
- View logs: `yarn docker:logs`
- Stop: `yarn docker:down`

## When Creating New Code

1. **Check existing patterns** - Look at similar features in the codebase
2. **Follow conventions** - Use established patterns and naming
3. **Use shared libraries** - Don't duplicate functionality
4. **Document** - Add Swagger docs and comments
5. **Test** - Write tests for new features
6. **Lint** - Run `yarn lint` before committing

## Quick Reference

| Task                    | Command                            |
| ----------------------- | ---------------------------------- |
| Run migrations          | `yarn prisma:migrate`              |
| Generate Prisma clients | `yarn prisma:generate`             |
| Start dev services      | `yarn dev:auth` (or other service) |
| Start all dev services  | `yarn dev:all`                     |
| Lint code               | `yarn lint`                        |
| Format code             | `yarn format`                      |
| Run tests               | `yarn test`                        |
| Seed database           | `yarn seed:all`                    |

## Important Notes

- **Multi-database**: Each service has its own database schema
- **No direct HTTP**: Use RabbitMQ for service communication
- **Path aliases**: Always use `@heidi/*` imports
- **Service-specific Prisma**: Use `@prisma/client-<service>` clients
- **Idempotent scripts**: Seed scripts should be safe to run multiple times
- **Health checks**: All services expose `/healthz` endpoint
- **Ports**: Services are internal-only, accessed via reverse proxy
