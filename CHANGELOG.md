# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.5.0](///compare/v1.4.1...v1.5.0) (2025-11-02)


### ✨ Features

* add terminal module and service for terminal management 6980a85
* add terminal service configuration and metrics scraping 148a13d
* add terminal service configuration to Docker and environment setup c2b1ec8
* implement terminal service with core functionality 93e7aaa
* update scripts to include terminal service in production setup dd143f1


### ♻️ Code Refactoring

* comment out terminal service configurations in Nginx, Prometheus, and database initialization 32a75bd
* comment out terminal service in Docker configuration and update development scripts e92fa11
* update service configurations to exclude terminal service b7565a4
* update terminal service implementation and documentation 699d867

### [1.4.1](///compare/v1.4.0...v1.4.1) (2025-11-01)


### ✨ Features

* update scripts to include admin service in production setup dca548e

## [1.4.0](///compare/v1.3.0...v1.4.0) (2025-11-01)


### ✨ Features

* add admin service configuration and database initialization 9a234fb
* add admin service to Docker Compose and environment configuration 8145f50
* add Prisma Admin module and service for admin management 25b5b49
* implement admin service with health checks and admin management f24ea43
* update Prisma scripts to include admin service 88c094a

## [1.3.0](///compare/v1.2.0...v1.3.0) (2025-11-01)


### ✨ Features

* add PostgreSQL auto-initialization and configuration documentation 77f3821
* add Redis Commander and monitoring exporters to Docker setup bfcd0eb
* enhance Docker Compose configuration for PostgreSQL initialization 32419ef
* enhance Grafana dashboards and Prometheus configuration 75f7242
* enhance production setup with initialization script and documentation updates fc2be4b
* update environment configuration for monitoring and administration tools 593e2f1

## [1.2.0](///compare/v1.1.0...v1.2.0) (2025-11-01)


### 🔧 Chores

* add .yarnrc.yml for node-modules linker and update VSCode settings 6d2aa6f


### ✨ Features

* implement comprehensive monitoring setup for HEIDI Microservices b587067


### ♻️ Code Refactoring

* update Dockerfile paths and Node.js version in configuration cf727a0


### 📚 Documentation

* update Node.js version in getting started and project overview documentation 44f8fdd

## [1.1.0](///compare/v1.0.1...v1.1.0) (2025-11-01)


### ✨ Features

* add Prisma client generation and migration scripts d7c352e


### 🔧 Chores

* remove unused package.json files and update VSCode settings 1911f0e


### ♻️ Code Refactoring

* restructure Prisma service modules and schemas 503f3aa
* update Prisma scripts and package.json for improved service management d26e974
* update Prisma service imports and restructure Dockerfile 1ac9f46
* update TypeScript configuration and service imports 0f15af1


### 🐛 Bug Fixes

* update type assertion for Prisma service connections 068822b


### 📚 Documentation

* add comprehensive release workflow guide f1a8f2d
* update getting started and project structure documentation 06198b2

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
