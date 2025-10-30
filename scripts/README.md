# HEIDI Microservices - Scripts

This directory contains helper scripts for setting up and managing the HEIDI microservices platform.

## 📋 Available Scripts

### 🗃️ Prisma & Database Migration Scripts

#### `prisma-generate-all.sh`

Generate Prisma clients for all microservices.

**Usage:**

```bash
./scripts/prisma-generate-all.sh
```

**What it does:**

- Generates Prisma clients for all 7 microservices (auth, users, city, core, notification, scheduler, integration)
- Each client is generated to a separate output directory in `node_modules/.prisma/client-<service>`
- Must be run after any schema changes

**When to use:**

- After modifying any Prisma schema
- After initial project setup
- Before running migrations

---

#### `prisma-migrate-all.sh`

Run database migrations for all microservice databases in development.

**Usage:**

```bash
./scripts/prisma-migrate-all.sh
```

**What it does:**

- Applies schema migrations to all microservice databases
- Creates migration files in each Prisma library
- Interactive - asks for confirmation before proceeding

**Prerequisites:**

- PostgreSQL server must be running
- All databases must exist (run `create-databases.sh` first)
- `.env` file must contain all `*_DATABASE_URL` variables

**When to use:**

- After schema changes in development
- Initial database setup

---

#### `prisma-migrate-prod.sh`

Deploy migrations to production for all microservice databases.

**Usage:**

```bash
./scripts/prisma-migrate-prod.sh
```

**What it does:**

- Deploys existing migration files to production databases
- Non-interactive (for CI/CD pipelines)
- Fails fast if any migration fails

**Prerequisites:**

- All migrations must already exist in `libs/prisma-*/prisma/migrations/`
- Production database URLs must be set in environment

**When to use:**

- Production deployments
- CI/CD pipelines

---

### 🔧 `setup-env.sh`

Creates `.env` and `.env.example` files with all required environment variables.

**Usage:**

```bash
./scripts/setup-env.sh
```

**What it does:**

- Creates `.env.example` template file
- Creates `.env` file (if it doesn't exist)
- Sets up all environment variables with default values

**After running:**

- Edit `.env` with your actual values
- Change JWT secrets to secure random values
- Update database credentials if needed

---

### 🔐 `generate-secrets.sh`

Generates cryptographically secure random secrets for JWT and other sensitive configurations.

**Usage:**

```bash
./scripts/generate-secrets.sh
```

**What it generates:**

- `JWT_SECRET` (64 hex characters)
- `JWT_REFRESH_SECRET` (64 hex characters)
- `POSTGRES_PASSWORD` (24 characters)
- `RABBITMQ_PASSWORD` (24 characters)
- `REDIS_PASSWORD` (24 characters)

**Options:**

- Interactive mode: Prompts to automatically update `.env` file
- Manual mode: Copy secrets manually to `.env`

**Important:**

- Always generates new random secrets
- Creates backup (`.env.backup`) before updating
- Updates all DATABASE_URLs with new passwords

---

### 🗄️ `create-databases.sh`

Creates all PostgreSQL databases for the microservices.

**Usage:**

```bash
./scripts/create-databases.sh
```

**What it does:**

- Checks PostgreSQL connection
- Creates 7 databases (one per microservice):
  - `heidi_auth`
  - `heidi_users`
  - `heidi_city`
  - `heidi_core`
  - `heidi_notification`
  - `heidi_scheduler`
  - `heidi_integration`
- Skips databases that already exist
- Shows color-coded status messages

**Prerequisites:**

- PostgreSQL must be running
- `.env` file must exist with correct credentials
- `psql` command must be available

---

### 📊 `init-databases.sql`

SQL script to create all databases at once.

**Usage:**

```bash
# Option 1: Using psql
psql -h localhost -U heidi -f scripts/init-databases.sql

# Option 2: Using docker
docker exec -i heidi-postgres psql -U heidi < scripts/init-databases.sql
```

**What it does:**

- Creates all 7 microservice databases
- Optional: Grants privileges
- Lists created databases

---

## 🚀 Quick Start Guide

### Initial Setup

1. **Set up environment variables:**

   ```bash
   ./scripts/setup-env.sh
   ```

2. **Generate secure secrets:**

   ```bash
   ./scripts/generate-secrets.sh
   # Choose 'y' to automatically update .env
   ```

3. **Edit `.env` with your specific values:**

   ```bash
   nano .env
   # or
   code .env
   ```

4. **Create databases:**

   ```bash
   ./scripts/create-databases.sh
   ```

5. **Generate Prisma clients:**

   ```bash
   ./scripts/prisma-generate-all.sh
   ```

6. **Run Prisma migrations:**

   ```bash
   ./scripts/prisma-migrate-all.sh
   ```

---

## 🔄 Common Workflows

### Reset Environment

```bash
# Backup current .env
cp .env .env.old

# Create fresh environment
./scripts/setup-env.sh

# Generate new secrets
./scripts/generate-secrets.sh

# Recreate databases (drops existing!)
# WARNING: This will delete all data
psql -h localhost -U heidi -c "DROP DATABASE IF EXISTS heidi_auth;"
./scripts/create-databases.sh
```

### Update Secrets Only

```bash
# Generate and update secrets
./scripts/generate-secrets.sh
# Choose 'y' when prompted

# Update docker-compose with new passwords
# Edit docker-compose.dev.yml and docker-compose.yml manually
```

### Verify Setup

```bash
# Check .env file exists
ls -la .env

# Check databases exist
psql -h localhost -U heidi -l | grep heidi_

# Test database connections
psql -h localhost -U heidi -d heidi_auth -c "SELECT 1;"
```

---

## 🛠️ Troubleshooting

### Script Permission Denied

```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### PostgreSQL Connection Failed

```bash
# Check PostgreSQL is running
docker ps | grep postgres
# or
pg_isready -h localhost

# Check credentials in .env
grep POSTGRES .env

# Test connection manually
psql -h localhost -U heidi -d postgres
```

### .env File Not Found

```bash
# Run setup script first
./scripts/setup-env.sh

# Or copy from template
cp env.template .env
```

### Database Already Exists

The `create-databases.sh` script will skip existing databases. To recreate:

```bash
# Drop database (WARNING: Deletes all data!)
psql -h localhost -U heidi -c "DROP DATABASE heidi_auth;"

# Then run create script
./scripts/create-databases.sh
```

---

## 📝 Environment Variables

All scripts read from `.env` file. Key variables:

```bash
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=heidi
POSTGRES_PASSWORD=heidi_password

# Per-service databases
AUTH_DATABASE_URL=postgresql://heidi:pass@localhost:5432/heidi_auth
USERS_DATABASE_URL=postgresql://heidi:pass@localhost:5432/heidi_users
# ... etc

# Security
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

See `docs/ENVIRONMENT_VARIABLES.md` for complete documentation.

---

## 🔒 Security Best Practices

1. **Never commit `.env` to version control**
   - Already in `.gitignore`
   - Contains sensitive credentials

2. **Always use strong secrets in production**
   - Use `generate-secrets.sh` script
   - Minimum 32 characters for JWT secrets

3. **Rotate secrets regularly**
   - Generate new secrets quarterly
   - Update all services simultaneously

4. **Backup `.env` files**
   - Store securely (password manager, vault)
   - Keep separate backup for production

5. **Use different credentials per environment**
   - Development, staging, production
   - Different database passwords
   - Different JWT secrets

---

## 📚 Additional Resources

- [Main README](../README.md)
- [Environment Variables Guide](../docs/ENVIRONMENT_VARIABLES.md)
- [TODO List](../TODO.md)
- [Getting Started Guide](../docs/GETTING_STARTED.md)

---

**Last Updated:** 2025-10-30
