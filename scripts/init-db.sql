-- Content Guardian Tower - Initial Database Setup
-- This script is executed when PostgreSQL container starts for the first time

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

COMMENT ON DATABASE content_guardian_tower IS 'Content Guardian Tower MVP - System of Record';

-- Advisory lock support for scheduler
-- No table needed: use pg_advisory_lock(key) / pg_try_advisory_lock(key) directly
-- Scheduler lock key convention: 1 = escalation scan, 2 = retention purge, 3 = periodic ingestion
