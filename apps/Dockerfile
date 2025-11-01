# Multi-stage Dockerfile for NestJS microservices
# Usage: docker build --build-arg APP_NAME=auth -t heidi-auth .

ARG NODE_VERSION=20

# Development stage
FROM node:${NODE_VERSION}-alpine AS development

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client
RUN yarn prisma:generate

# Expose port (will be overridden by docker compose)
EXPOSE 3000

# Start in watch mode for hot-reload
CMD ["sh", "-c", "nest start ${APP_NAME} --watch"]


# Build stage
FROM node:${NODE_VERSION}-alpine AS builder

ARG APP_NAME
ENV APP_NAME=${APP_NAME}

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install all dependencies (including dev dependencies for building)
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma Client
RUN yarn prisma:generate

# Build the specific app
RUN nest build ${APP_NAME}

# Remove dev dependencies
RUN yarn install --frozen-lockfile --production && yarn cache clean


# Production stage
FROM node:${NODE_VERSION}-alpine AS production

ARG APP_NAME
ENV APP_NAME=${APP_NAME}
ENV NODE_ENV=production

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

WORKDIR /app

# Copy package files
COPY --chown=nestjs:nodejs package.json yarn.lock ./

# Copy built application and node_modules from builder
COPY --chown=nestjs:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs --from=builder /app/dist ./dist
COPY --chown=nestjs:nodejs --from=builder /app/libs ./libs

# Copy Prisma schema and generated client
COPY --chown=nestjs:nodejs --from=builder /app/libs/prisma/schema ./libs/prisma/schema
COPY --chown=nestjs:nodejs --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=nestjs:nodejs --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/main.js"]
