# Changelog

All notable changes to this project will be documented in this file.

See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project scaffold with NestJS microservices architecture
- 7 microservices: auth, users, city, core, notification, scheduler, integration
- 7 shared libraries: prisma, logger, rabbitmq, redis, jwt, interceptors, metrics
- Docker development and production environments
- PostgreSQL database with Prisma ORM
- Redis caching and session storage
- RabbitMQ message queue integration
- JWT authentication with refresh tokens
- Winston structured logging
- Prometheus metrics on all services
- Health check endpoints
- VSCode debugging configuration
- Comprehensive documentation

## [1.0.0] - 2025-01-29

### Added

- Initial release of HEIDI microservices platform
- Complete monorepo structure with Yarn workspaces
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
