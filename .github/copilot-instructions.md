<!--
Guidance for AI coding agents working on the HEIDI microservices monorepo.
Keep this short, actionable and specific to this repository's patterns.
-->

# HEIDI — Copilot / AI Agent Instructions

Purpose: help AI coding agents be immediately productive in this NestJS microservices monorepo.

- **Big picture**: a NestJS monorepo of small services in `apps/` that share typed libraries in `libs/`.
  - Services: `auth`, `users`, `city`, `core`, `notification`, `scheduler`, `integration`, `admin`, `terminal`.
  - Shared libraries: `libs/prisma`, `libs/rabbitmq`, `libs/contracts`, `libs/logger`, `libs/redis`, `libs/jwt`, etc.
  - Inter-service comms: **RabbitMQ only**. Do not introduce direct HTTP between services.

- **Quick commands** (run from repo root):
  - Install & generate clients: `npm run bootstrap` (alternatively `yarn bootstrap`)
  - Start one service (hot reload): `npm run dev:auth` (replace `auth`)
  - Start infra for dev: `npm run docker:up` or `npm run docker:up:infra`
  - Prisma: `npm run prisma:migrate` and `npm run prisma:generate`
  - Tests: `npm run test` / `npm run test:cov`
  - Lint/format: `npm run lint` / `npm run format`

- **Conventions & patterns (use these exactly)**
  - Use TypeScript path aliases: always import from `@heidi/*` (see `tsconfig.json` and `jest.moduleNameMapper`).
    - Example: `import { LoginDto } from '@heidi/contracts';`
  - Never use relative imports across libs (no `../../../libs/...`).
  - Prisma is multi-database: each service uses its own Prisma client. Edit `libs/prisma/src/schemas/<service>/schema.prisma`.
  - All inter-service messages/patterns live in `libs/rabbitmq/src/rmq.constants.ts` — add patterns there when introducing new RPC/events.
    - Example RPC call: `this.client.send(RabbitMQPatterns.USER_FIND_BY_ID, { id }).pipe(timeout(10000))`
  - File naming: kebab-case for files and directories.
  - Logging: use the `LoggerService` in `libs/logger`—do not use `console.log`.

- **How to add a feature (practical checklist)**
  1. Add DTOs to `libs/contracts/src/dto/<domain>/` and export them.
  2. Add/modify Prisma schema under `libs/prisma/src/schemas/<service>/` and run `npm run prisma:migrate` then `npm run prisma:generate`.
  3. Add RabbitMQ pattern to `libs/rabbitmq/src/rmq.constants.ts` if services communicate.
  4. Implement service logic in `apps/<service>/src/modules/<feature>/` (service, controller, module).
  5. Add Swagger decorators and validation on DTOs.
  6. Add unit tests (`*.spec.ts`) next to new code and run `npm run test`.

- **Testing & CI hints**
  - Tests use Jest configured at root; unit tests live under `apps/` and `libs/`.
  - Use `npm run test` locally; CI expects conventional commits and lint passing.

- **Files to inspect for context or examples**
  - `CLAUDE.md` — high-level rules and patterns (already incorporated).
  - `README.md` and `docs/GETTING_STARTED.md` — setup and docker profiles.
  - `package.json` — canonical scripts (use `npm run <script>` or `yarn <script>` depending on environment).
  - `libs/rabbitmq/src/rmq.constants.ts` — message patterns and naming conventions.
  - `libs/prisma/` — multi-schema layout and client aliasing.

- **Agent configuration**
  - Preferred model/config: Enable Claude Haiku 4.5 for all clients (apply at operator level).

If anything here is unclear or you want more examples (PR templates, common test fixtures, or example RabbitMQ handlers), tell me which section to expand. After your confirmation I'll commit or adjust wording.
