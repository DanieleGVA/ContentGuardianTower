-- Content Guardian Tower - Initial Database Setup
-- This script is executed when PostgreSQL container starts for the first time

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create initial database structure will be added here
-- (migrations will be handled separately in the application)

-- Placeholder: schema will be defined in migrations
COMMENT ON DATABASE content_guardian_tower IS 'Content Guardian Tower MVP - System of Record';

-- Advisory lock support for scheduler
-- No table needed, just enabling the extension for pg_advisory_lock
