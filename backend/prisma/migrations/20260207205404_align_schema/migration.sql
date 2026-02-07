-- Schema alignment migration
-- Adds User.fullName, SystemSettings new fields, and extended AuditEventType enum values

-- AlterEnum: Add new AuditEventType values
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'LOGOUT';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'USER_PASSWORD_CHANGED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'SOURCE_CREDENTIAL_TESTED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'SOURCE_INGESTION_TRIGGERED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'RULE_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'RULE_UPDATED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'TICKET_CREATED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'TICKET_UNASSIGNED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'TICKET_ATTACHMENT_ADDED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'INGESTION_RUN_FAILED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'INGESTION_RUN_CANCELLED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'EXPORT_COMPLETED';
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'EXPORT_FAILED';

-- AlterTable: Add new SystemSettings fields
ALTER TABLE "cgt_system_settings"
  ADD COLUMN "default_schedule_interval_minutes" INTEGER NOT NULL DEFAULT 1440,
  ADD COLUMN "export_max_rows" INTEGER NOT NULL DEFAULT 50000,
  ADD COLUMN "llm_max_tokens" INTEGER NOT NULL DEFAULT 4096,
  ADD COLUMN "llm_model" TEXT NOT NULL DEFAULT 'gpt-4o',
  ADD COLUMN "llm_provider" TEXT NOT NULL DEFAULT 'openai',
  ADD COLUMN "max_retries_per_step" INTEGER NOT NULL DEFAULT 3;

-- AlterTable: Add full_name to users (with default for existing rows, then make required)
ALTER TABLE "cgt_users" ADD COLUMN "full_name" TEXT NOT NULL DEFAULT '';
-- Populate existing rows with username as fullName
UPDATE "cgt_users" SET "full_name" = "username" WHERE "full_name" = '';

-- NOTE: search_vector columns and GIN indexes are managed via the fulltext_search migration
-- and are intentionally NOT dropped here. Prisma does not track raw SQL columns.
