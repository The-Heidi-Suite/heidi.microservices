# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.11.0](https://github.com/The-Heidi-Suite/heidi.microservices/compare/v1.10.0...v1.11.0) (2025-11-05)


### 🔧 Chores

* **prisma:** remove deprecated Prisma schema files and migration scripts ([1ba22f7](https://github.com/The-Heidi-Suite/heidi.microservices/commit/1ba22f76b8b3c3a88191ea971eabf8557e917345))


### 🐛 Bug Fixes

* **auth, users, nginx:** update Swagger documentation endpoint and enhance Nginx configuration ([a9ec258](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a9ec258535f1517b6bf8be40561a26aa5cd4fd46))
* **caddy, nginx:** update API route prefixes for services ([6437a55](https://github.com/The-Heidi-Suite/heidi.microservices/commit/6437a5586d071f14852dd552d372a8b40b6a2873))
* **prisma:** update schema paths in migration and generation scripts ([6c462a3](https://github.com/The-Heidi-Suite/heidi.microservices/commit/6c462a39fd1661451af54d0c8302e69d8dca02bb))
* update email addresses in configuration files ([39e09fd](https://github.com/The-Heidi-Suite/heidi.microservices/commit/39e09fd9c6d0322f258b31a511c3e79a6fc6b5a2))


### ♻️ Code Refactoring

* **controllers:** remove route prefixes from multiple controllers ([50efa4e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/50efa4e2712e42b2243632610a7ff5cc3d3e482d))
* **docker:** streamline Dockerfile for Prisma client generation and build process ([4ef980d](https://github.com/The-Heidi-Suite/heidi.microservices/commit/4ef980dceef45803dfe3017a380daaa49a8821dc))
* **microservices:** standardize RabbitMQ microservice connection configuration ([165a763](https://github.com/The-Heidi-Suite/heidi.microservices/commit/165a7630f989da0b71c5c049f588de95b1675494))
* **rabbitmq:** restructure RabbitMQ module and configuration ([5c1d2bf](https://github.com/The-Heidi-Suite/heidi.microservices/commit/5c1d2bfeb70b162ab2d441d57416802698054b44))
* **rabbitmq:** update RabbitMQ integration to use RmqModule ([65fa6f7](https://github.com/The-Heidi-Suite/heidi.microservices/commit/65fa6f79c75ee8ad2fadc0dee1cf27abfdfe5e72))


### ✨ Features

* **api:** add ENABLE_API_GATEWAY_PREFIX for Swagger configuration ([a85e56b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a85e56b861b45e5818784043511cb87f0ec4c1d7))
* **auth, users, nginx:** add API server endpoints and enhance Nginx configuration ([ddc6429](https://github.com/The-Heidi-Suite/heidi.microservices/commit/ddc6429df20d4b28fa162876d859852d6452ce3a))
* **auth, users:** add username support in login and registration DTOs ([4d7a077](https://github.com/The-Heidi-Suite/heidi.microservices/commit/4d7a07715c922ee701f6dac766038db2e6dc26df))
* **auth, users:** enhance API response documentation with error handling details ([2ca5e5f](https://github.com/The-Heidi-Suite/heidi.microservices/commit/2ca5e5f7542293f3dcd556495e2068a6c55fd391))
* **auth, users:** improve user authentication and registration flow ([6c448c2](https://github.com/The-Heidi-Suite/heidi.microservices/commit/6c448c21c660d1eb0ac982fd159144348db6b783))
* **auth, users:** support username login and enhance user registration ([bb9c19e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/bb9c19e78a3efb20380e708ec6df2ac8089573db))
* **auth:** enhance login documentation and examples for clarity ([ba94d1b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/ba94d1b8c30c7919efb53f0c913891f9dd15f6ad))
* **caddy:** add Caddy reverse proxy configuration with automatic SSL support ([835bb0e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/835bb0e715a9133c89747caae0ba084f99b8eb26))
* **caddy:** enhance Caddy configuration for dynamic Caddyfile generation ([093b146](https://github.com/The-Heidi-Suite/heidi.microservices/commit/093b146d21dca8d330ee43a95d9b7c73e88cb3f1))
* **docker:** add sequential build script and optimize Docker Compose configuration ([1ece1b4](https://github.com/The-Heidi-Suite/heidi.microservices/commit/1ece1b479d0cb199cf7e6df8de6cbabe97a04304))
* **docker:** enhance Docker commands in package.json ([99a5b5b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/99a5b5b516c8c24efefdc22433b92533e516d156))
* **docker:** enhance Dockerfile for Prisma compatibility and build optimization ([5ddb08e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/5ddb08e7c4aa1500c90414be8063acf347e888fc))
* **docker:** update Dockerfile and Prisma schemas for enhanced compatibility ([0f26989](https://github.com/The-Heidi-Suite/heidi.microservices/commit/0f26989d1b121fd8745afb0d3d4a269270b641c4))
* **docker:** update Dockerfile for improved dependency management and build process ([cdf24af](https://github.com/The-Heidi-Suite/heidi.microservices/commit/cdf24af9c32f99b1799bc0c9172ed71dbdb7ec2f))
* **docker:** update RabbitMQ and Docker Compose configurations ([15e2982](https://github.com/The-Heidi-Suite/heidi.microservices/commit/15e29827845c5c5617716c3d7382a78024ba3938))
* **env:** add environment configuration and update Docker Compose for monitoring ([906c8fa](https://github.com/The-Heidi-Suite/heidi.microservices/commit/906c8faa4da5841210bb83c6769d93d8177924d8))
* **nginx, scripts:** enhance Nginx configuration and improve database URL handling ([c775ff2](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c775ff2754b889d9da74996bcd56edc2c3b2194b))
* **pm2:** add ecosystem configuration for PM2 process management ([fe18eb3](https://github.com/The-Heidi-Suite/heidi.microservices/commit/fe18eb32f048fc7519957f63e4b15d841f7d4d2b))
* **prisma:** add initial migration scripts for Admin, Auth, City, Core, Integration, Notification, Scheduler, and Users schemas ([04ed67f](https://github.com/The-Heidi-Suite/heidi.microservices/commit/04ed67fbc699b88387f0b870b9243bb9265bee6a))
* **prisma:** add new Prisma schemas and migration scripts for microservices ([b6b931f](https://github.com/The-Heidi-Suite/heidi.microservices/commit/b6b931fdb908bc45e07b5ac63e246c28816dafc4))
* **prisma:** enhance database URL handling in migration script ([d2f947a](https://github.com/The-Heidi-Suite/heidi.microservices/commit/d2f947a70b374eada9a49c17096d77c0dfb0fadc))
* **rabbitmq:** introduce RmqClientWrapper for dynamic message routing ([3974682](https://github.com/The-Heidi-Suite/heidi.microservices/commit/397468218755a016294b6f253b0ea43e352a49c9))
* **rabbitmq:** update RabbitMQ configuration for environment variable support ([c1caad8](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c1caad8a8be6f353618339f520d6698377566b07))

## [1.10.0](///compare/v1.9.0...v1.10.0) (2025-11-03)

### ✨ Features

- **logging:** enhance logging for message processing in Core and Users controllers e52d3d4
- **rabbitmq:** enhance RabbitMQ queue options across applications 16e3340

## [1.9.0](///compare/v1.8.0...v1.9.0) (2025-11-03)

### 🐛 Bug Fixes

- **errors:** improve error handling and messaging in GlobalExceptionFilter 34df8f7

### ✨ Features

- **config:** enhance service configuration with database settings and RabbitMQ improvements 6a87024
- **core:** implement CoreMessageController for RabbitMQ message handling 7107478
- **database:** implement database connection handling and logging for services d967f4a
- **microservices:** integrate RabbitMQ microservice support across applications 021319e
- **users:** add UsersMessageController for RabbitMQ message handling e9e2cee

### 🔧 Chores

- **dependencies:** update package.json and yarn.lock to include axios and @nestjs/axios 076c64e
- **env:** update environment configuration and enhance security 982a133
- **translations:** remove trailing whitespace in JSON translation files a90480d

## [1.8.0](///compare/v1.7.0...v1.8.0) (2025-11-03)

### 🐛 Bug Fixes

- improve context logging in LoggerService f9854a3

### ♻️ Code Refactoring

- enhance authentication flow with IP and user agent logging 95033aa
- integrate Saga pattern into AuthService for distributed transactions a3e9ff2
- replace Logger with LoggerService in multiple services for improved logging 80833f0
- update ConfigModule imports across applications 42b25cc

### ✨ Features

- add contracts library configuration and path mappings 4b9f7a4
- add DTOs for user and authentication management 8a4cd28
- add internationalization support with language decorators and translation files d6b55d4
- add JWT authentication and user profile management endpoints 36230c6
- add saga DTOs for managing saga workflows 088954c
- add saga library configuration and path mappings ea29786
- add Swagger documentation to authentication DTOs c046e54
- **config:** enhance configuration management and service ports 0cb937f
- enhance session management with new endpoints and service methods d034e3d
- enhance Swagger documentation for user management endpoints 2bc6e05
- enhance user DTOs with Swagger documentation af8e848
- **errors:** integrate I18nService into GlobalExceptionFilter for enhanced error messaging ab4e896
- **i18n:** add i18n library configuration and update TypeScript paths babf1f1
- **i18n:** add internationalization configuration and update documentation e780924
- **i18n:** integrate I18nModule and LanguageInterceptor across multiple applications 1ecbd47
- implement i18n module for internationalization support 23a88f9
- integrate Swagger documentation for authentication endpoints d75aea1
- introduce Saga Orchestrator library for managing distributed transactions 42d4524
- **swagger:** update Swagger titles for Auth and Users services bda2ca6
- **validation:** enhance ValidationInterceptor with I18nService for localized error messages b7838f1

## [1.7.0](///compare/v1.6.0...v1.7.0) (2025-11-03)

### ♻️ Code Refactoring

- comment out unused terminal module exports in index.ts af25618
- enhance ConfigService get method and clean up JWT strategy permissions retrieval d2628bc
- improve user role handling and permissions retrieval in AuthService 42016bb
- remove permissions generation and migration scripts 825900b
- remove Prisma permissions module and update JWT handling 04fb440
- remove unused permissions module and related exports f045cd3
- simplify imports and formatting in RBAC-related files d6d6185
- update interceptor and logger initialization across multiple modules 843a1fe

### ✨ Features

- add new Prisma aliases for admin, terminal, and permissions modules in tsconfig 938ad30
- add user registration functionality and enhance user management 91fdc88
- implement city management and access guards for RBAC 0d6a76b
- introduce city hierarchy service and enhance RBAC with city management features 59c3582

## [1.6.0](///compare/v1.5.0...v1.6.0) (2025-11-03)

### ✨ Features

- add permissions module and service for permissions management bb9e55c
- add permissions schema generation and migration to scripts 7f0dc26
- add tenancy and RBAC libraries to project configuration 0243329
- add tenancy module with city context management and guards c4babec
- enhance auth module with city admin assignment and user city retrieval c2d547d
- enhance JWT module and service with city and permissions support 9b622b5
- implement RBAC module with guards and services for role-based access control edf80b3

### 🐛 Bug Fixes

- downgrade @types/node version to 24.10.0 in package.json and update yarn.lock a53001e

### 📚 Documentation

- expand README with platform overview, user roles, and core features c41996f

## [1.5.0](///compare/v1.4.1...v1.5.0) (2025-11-02)

### ✨ Features

- add terminal module and service for terminal management 6980a85
- add terminal service configuration and metrics scraping 148a13d
- add terminal service configuration to Docker and environment setup c2b1ec8
- implement terminal service with core functionality 93e7aaa
- update scripts to include terminal service in production setup dd143f1

### ♻️ Code Refactoring

- comment out terminal service configurations in Nginx, Prometheus, and database initialization 32a75bd
- comment out terminal service in Docker configuration and update development scripts e92fa11
- update service configurations to exclude terminal service b7565a4
- update terminal service implementation and documentation 699d867

### [1.4.1](///compare/v1.4.0...v1.4.1) (2025-11-01)

### ✨ Features

- update scripts to include admin service in production setup dca548e

## [1.4.0](///compare/v1.3.0...v1.4.0) (2025-11-01)

### ✨ Features

- add admin service configuration and database initialization 9a234fb
- add admin service to Docker Compose and environment configuration 8145f50
- add Prisma Admin module and service for admin management 25b5b49
- implement admin service with health checks and admin management f24ea43
- update Prisma scripts to include admin service 88c094a

## [1.3.0](///compare/v1.2.0...v1.3.0) (2025-11-01)

### ✨ Features

- add PostgreSQL auto-initialization and configuration documentation 77f3821
- add Redis Commander and monitoring exporters to Docker setup bfcd0eb
- enhance Docker Compose configuration for PostgreSQL initialization 32419ef
- enhance Grafana dashboards and Prometheus configuration 75f7242
- enhance production setup with initialization script and documentation updates fc2be4b
- update environment configuration for monitoring and administration tools 593e2f1

## [1.2.0](///compare/v1.1.0...v1.2.0) (2025-11-01)

### 🔧 Chores

- add .yarnrc.yml for node-modules linker and update VSCode settings 6d2aa6f

### ✨ Features

- implement comprehensive monitoring setup for HEIDI Microservices b587067

### ♻️ Code Refactoring

- update Dockerfile paths and Node.js version in configuration cf727a0

### 📚 Documentation

- update Node.js version in getting started and project overview documentation 44f8fdd

## [1.1.0](///compare/v1.0.1...v1.1.0) (2025-11-01)

### ✨ Features

- add Prisma client generation and migration scripts d7c352e

### 🔧 Chores

- remove unused package.json files and update VSCode settings 1911f0e

### ♻️ Code Refactoring

- restructure Prisma service modules and schemas 503f3aa
- update Prisma scripts and package.json for improved service management d26e974
- update Prisma service imports and restructure Dockerfile 1ac9f46
- update TypeScript configuration and service imports 0f15af1

### 🐛 Bug Fixes

- update type assertion for Prisma service connections 068822b

### 📚 Documentation

- add comprehensive release workflow guide f1a8f2d
- update getting started and project structure documentation 06198b2

### 1.0.1 (2025-10-30)

### 📚 Documentation

- add Commit Quick Reference and Contribution Guidelines 2626c65
- **env:** add .env.example, env.template and ENVIRONMENT_VARIABLES guide 373fa0b

### 🔧 Chores

- add configuration files for Commitizen and standard-version 97beb2c
- update .gitignore and CHANGELOG.md 4122914

## [1.0.0] - 2025-01-29

### Added

- Initial release of HEIDI microservices platform
- Complete monorepo structure with NestJS CLI
- Production-ready infrastructure setup
- Developer tooling and hot-reload support

---

## Version History

- **1.0.0** - Initial release (2025-01-29)

## How to Update This Changelog

When making changes, add them under the `[Unreleased]` section using these categories:

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

Example:

```markdown
## [Unreleased]

### Added

- New email notification templates

### Fixed

- User registration validation bug
```

When releasing a new version:

1. Move items from `[Unreleased]` to a new version section
2. Add the version number and date
3. Update the version in `package.json`
4. Create a git tag
