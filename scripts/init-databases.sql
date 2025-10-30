-- HEIDI Microservices - Database Initialization Script
-- This script creates all databases for the microservices architecture
-- Run this with: psql -h localhost -U heidi -f scripts/init-databases.sql

-- Create databases for each microservice
CREATE DATABASE heidi_auth;
CREATE DATABASE heidi_users;
CREATE DATABASE heidi_city;
CREATE DATABASE heidi_core;
CREATE DATABASE heidi_notification;
CREATE DATABASE heidi_scheduler;
CREATE DATABASE heidi_integration;

-- Grant privileges (if needed)
-- Uncomment if you need to grant specific privileges
-- GRANT ALL PRIVILEGES ON DATABASE heidi_auth TO heidi;
-- GRANT ALL PRIVILEGES ON DATABASE heidi_users TO heidi;
-- GRANT ALL PRIVILEGES ON DATABASE heidi_city TO heidi;
-- GRANT ALL PRIVILEGES ON DATABASE heidi_core TO heidi;
-- GRANT ALL PRIVILEGES ON DATABASE heidi_notification TO heidi;
-- GRANT ALL PRIVILEGES ON DATABASE heidi_scheduler TO heidi;
-- GRANT ALL PRIVILEGES ON DATABASE heidi_integration TO heidi;

-- Verify databases were created
\l heidi_*
