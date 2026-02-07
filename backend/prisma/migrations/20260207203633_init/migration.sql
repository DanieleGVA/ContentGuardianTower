-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GLOBAL_MANAGER', 'REGIONAL_MANAGER', 'LOCAL_MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('WEB', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('WEB_PAGE', 'SOCIAL_POST', 'SOCIAL_COMMENT', 'YOUTUBE_VIDEO', 'YOUTUBE_COMMENT', 'YOUTUBE_COMMUNITY_POST');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'UNCERTAIN');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'UNCERTAIN_MEDIUM');

-- CreateEnum
CREATE TYPE "EscalationLevel" AS ENUM ('LOCAL', 'REGIONAL', 'GLOBAL');

-- CreateEnum
CREATE TYPE "RuleSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('WEB_OWNED', 'WEB_SEARCH_DISCOVERY', 'SOCIAL_ACCOUNT', 'YOUTUBE_CHANNEL');

-- CreateEnum
CREATE TYPE "CountryScopeType" AS ENUM ('ALL', 'LIST');

-- CreateEnum
CREATE TYPE "SecretStoreType" AS ENUM ('VAULT', 'KMS', 'FILE', 'ENV');

-- CreateEnum
CREATE TYPE "CredentialTestStatus" AS ENUM ('SUCCESS', 'FAILURE', 'NEVER_TESTED');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('OK', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "RunType" AS ENUM ('CRAWL', 'SOCIAL_PULL', 'SEARCH_DISCOVERY_REFRESH');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL', 'CANCELED');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "FetchStatus" AS ENUM ('OK', 'HTTP_4XX', 'HTTP_5XX', 'TIMEOUT', 'PARSE_FAILED');

-- CreateEnum
CREATE TYPE "TicketEventType" AS ENUM ('STATUS_CHANGED', 'ASSIGNED', 'UNASSIGNED', 'ESCALATED', 'COMMENT_ADDED', 'ATTACHMENT_ADDED', 'CREATED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'SOURCE_CREATED', 'SOURCE_UPDATED', 'SOURCE_DELETED', 'RULE_VERSION_CREATED', 'RULE_ACTIVATED', 'RULE_DEACTIVATED', 'TICKET_STATUS_CHANGED', 'TICKET_ASSIGNED', 'TICKET_COMMENT_ADDED', 'ESCALATION_TRIGGERED', 'RETENTION_RUN', 'EXPORT_REQUESTED', 'USER_CREATED', 'USER_UPDATED', 'SETTINGS_UPDATED', 'INGESTION_RUN_STARTED', 'INGESTION_RUN_COMPLETED');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('USER', 'SOURCE', 'RULE', 'RULE_VERSION', 'CONTENT', 'REVISION', 'ANALYSIS', 'TICKET', 'INGESTION_RUN', 'SYSTEM_SETTINGS', 'EXPORT');

-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('TICKETS_CSV', 'AUDIT_CSV');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('S3_COMPAT', 'FILESYSTEM');

-- CreateTable
CREATE TABLE "cgt_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "country_scope_type" "CountryScopeType" NOT NULL DEFAULT 'ALL',
    "country_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cgt_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "platform" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "country_code" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "identifier" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "start_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "domain_allowlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language_targets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "url_allow_patterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "url_block_patterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "crawl_frequency_minutes" INTEGER,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "credential_ref_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cgt_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_platform_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "platform" "Channel" NOT NULL,
    "secret_store_type" "SecretStoreType" NOT NULL,
    "secret_store_key" TEXT NOT NULL,
    "masked_hint" TEXT,
    "last_test_status" "CredentialTestStatus" NOT NULL DEFAULT 'NEVER_TESTED',
    "last_tested_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cgt_platform_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "RuleSeverity" NOT NULL,
    "applicable_channels" "Channel"[],
    "applicable_countries" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "active_rule_version_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cgt_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_rule_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rule_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "type_snapshot" TEXT NOT NULL,
    "severity_snapshot" "RuleSeverity" NOT NULL,
    "applicable_channels_snapshot" "Channel"[],
    "applicable_countries_snapshot" TEXT[],
    "payload_schema_version" TEXT,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID NOT NULL,

    CONSTRAINT "cgt_rule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_content_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "channel" "Channel" NOT NULL,
    "country_code" TEXT NOT NULL,
    "source_id" UUID NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "external_id" TEXT NOT NULL,
    "url" TEXT,
    "parent_content_id" UUID,
    "author_handle" TEXT,
    "published_at" TIMESTAMP(3),
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "last_modified_at" TIMESTAMP(3),
    "current_revision_id" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "source_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cgt_content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_content_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "content_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "normalized_text_hash" TEXT NOT NULL,
    "title" TEXT,
    "main_text" TEXT,
    "caption" TEXT,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "comment_text" TEXT,
    "ocr_text" TEXT,
    "transcript" TEXT,
    "extraction_status" "ExtractionStatus" NOT NULL DEFAULT 'OK',
    "extraction_errors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "first_seen_or_modified_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cgt_content_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_analysis_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "content_id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "channel" "Channel" NOT NULL,
    "country_code" TEXT NOT NULL,
    "language_detected" TEXT,
    "language_confidence" DOUBLE PRECISION,
    "compliance_status" "ComplianceStatus" NOT NULL,
    "uncertain_reason" TEXT,
    "applicable_rule_version_ids" UUID[],
    "violations" JSONB NOT NULL DEFAULT '[]',
    "llm_provider" TEXT,
    "llm_model" TEXT,
    "pii_redaction_enabled" BOOLEAN NOT NULL DEFAULT true,
    "analysis_started_at" TIMESTAMP(3),
    "analysis_completed_at" TIMESTAMP(3),
    "analysis_latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cgt_analysis_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_key" TEXT NOT NULL,
    "content_id" UUID NOT NULL,
    "revision_id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "channel" "Channel" NOT NULL,
    "country_code" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "risk_level" "RiskLevel" NOT NULL,
    "escalation_level" "EscalationLevel" NOT NULL DEFAULT 'LOCAL',
    "due_at" TIMESTAMP(3),
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "assignee_user_id" UUID,
    "created_by" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "violated_rule_version_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "uncertain_reason" TEXT,
    "content_url" TEXT,
    "detected_language" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "cgt_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_ticket_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "event_type" "TicketEventType" NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "actor_user_id" UUID,
    "from_status" "TicketStatus",
    "to_status" "TicketStatus",
    "from_assignee_user_id" UUID,
    "to_assignee_user_id" UUID,
    "from_escalation_level" "EscalationLevel",
    "to_escalation_level" "EscalationLevel",
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cgt_ticket_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_ticket_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cgt_ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_ticket_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "uploaded_by_user_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "storage_type" "StorageType" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cgt_ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_ingestion_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_type" "RunType" NOT NULL,
    "source_id" UUID,
    "channel" "Channel" NOT NULL,
    "country_code" TEXT,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "cancel_requested" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "items_fetched" INTEGER NOT NULL DEFAULT 0,
    "items_failed" INTEGER NOT NULL DEFAULT 0,
    "items_changed" INTEGER NOT NULL DEFAULT 0,
    "analysis_queued" INTEGER NOT NULL DEFAULT 0,
    "analysis_completed" INTEGER NOT NULL DEFAULT 0,
    "oldest_queue_age_seconds" INTEGER,
    "last_error" TEXT,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cgt_ingestion_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_ingestion_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "channel" "Channel" NOT NULL,
    "country_code" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "url" TEXT,
    "fetch_status" "FetchStatus" NOT NULL,
    "http_status" INTEGER,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cgt_ingestion_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" "AuditEventType" NOT NULL,
    "actor_type" "ActorType" NOT NULL,
    "actor_user_id" UUID,
    "entity_type" "AuditEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "country_code" TEXT,
    "channel" "Channel",
    "message" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cgt_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_system_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "allowed_country_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language_confidence_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "default_due_hours_high" INTEGER NOT NULL DEFAULT 24,
    "default_due_hours_medium" INTEGER NOT NULL DEFAULT 72,
    "default_due_days_low" INTEGER NOT NULL DEFAULT 7,
    "uncertain_default_risk_level" "RiskLevel" NOT NULL DEFAULT 'UNCERTAIN_MEDIUM',
    "escalation_after_hours" INTEGER NOT NULL DEFAULT 48,
    "retention_days" INTEGER NOT NULL DEFAULT 180,
    "pii_redaction_enabled_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cgt_system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgt_exports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "export_type" "ExportType" NOT NULL,
    "requested_by_user_id" UUID NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'QUEUED',
    "filters_snapshot" JSONB,
    "row_count" INTEGER,
    "max_rows_enforced" INTEGER,
    "storage_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "last_error" TEXT,

    CONSTRAINT "cgt_exports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cgt_users_username_key" ON "cgt_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "cgt_users_email_key" ON "cgt_users"("email");

-- CreateIndex
CREATE INDEX "cgt_users_role_idx" ON "cgt_users"("role");

-- CreateIndex
CREATE INDEX "cgt_users_is_enabled_idx" ON "cgt_users"("is_enabled");

-- CreateIndex
CREATE INDEX "cgt_sources_channel_idx" ON "cgt_sources"("channel");

-- CreateIndex
CREATE INDEX "cgt_sources_country_code_idx" ON "cgt_sources"("country_code");

-- CreateIndex
CREATE INDEX "cgt_sources_source_type_idx" ON "cgt_sources"("source_type");

-- CreateIndex
CREATE INDEX "cgt_sources_is_enabled_idx" ON "cgt_sources"("is_enabled");

-- CreateIndex
CREATE INDEX "cgt_sources_is_deleted_idx" ON "cgt_sources"("is_deleted");

-- CreateIndex
CREATE INDEX "cgt_rules_severity_idx" ON "cgt_rules"("severity");

-- CreateIndex
CREATE INDEX "cgt_rules_is_active_idx" ON "cgt_rules"("is_active");

-- CreateIndex
CREATE INDEX "cgt_rule_versions_rule_id_idx" ON "cgt_rule_versions"("rule_id");

-- CreateIndex
CREATE UNIQUE INDEX "cgt_rule_versions_rule_id_version_key" ON "cgt_rule_versions"("rule_id", "version");

-- CreateIndex
CREATE INDEX "cgt_content_items_channel_idx" ON "cgt_content_items"("channel");

-- CreateIndex
CREATE INDEX "cgt_content_items_country_code_idx" ON "cgt_content_items"("country_code");

-- CreateIndex
CREATE INDEX "cgt_content_items_content_type_idx" ON "cgt_content_items"("content_type");

-- CreateIndex
CREATE INDEX "cgt_content_items_is_deleted_idx" ON "cgt_content_items"("is_deleted");

-- CreateIndex
CREATE INDEX "cgt_content_items_first_seen_at_idx" ON "cgt_content_items"("first_seen_at");

-- CreateIndex
CREATE INDEX "cgt_content_items_last_seen_at_idx" ON "cgt_content_items"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "cgt_content_items_source_id_external_id_key" ON "cgt_content_items"("source_id", "external_id");

-- CreateIndex
CREATE INDEX "cgt_content_revisions_content_id_idx" ON "cgt_content_revisions"("content_id");

-- CreateIndex
CREATE INDEX "cgt_content_revisions_normalized_text_hash_idx" ON "cgt_content_revisions"("normalized_text_hash");

-- CreateIndex
CREATE UNIQUE INDEX "cgt_content_revisions_content_id_revision_number_key" ON "cgt_content_revisions"("content_id", "revision_number");

-- CreateIndex
CREATE INDEX "cgt_analysis_results_content_id_idx" ON "cgt_analysis_results"("content_id");

-- CreateIndex
CREATE INDEX "cgt_analysis_results_channel_idx" ON "cgt_analysis_results"("channel");

-- CreateIndex
CREATE INDEX "cgt_analysis_results_country_code_idx" ON "cgt_analysis_results"("country_code");

-- CreateIndex
CREATE INDEX "cgt_analysis_results_compliance_status_idx" ON "cgt_analysis_results"("compliance_status");

-- CreateIndex
CREATE UNIQUE INDEX "cgt_analysis_results_revision_id_key" ON "cgt_analysis_results"("revision_id");

-- CreateIndex
CREATE UNIQUE INDEX "cgt_tickets_ticket_key_key" ON "cgt_tickets"("ticket_key");

-- CreateIndex
CREATE INDEX "cgt_tickets_status_idx" ON "cgt_tickets"("status");

-- CreateIndex
CREATE INDEX "cgt_tickets_risk_level_idx" ON "cgt_tickets"("risk_level");

-- CreateIndex
CREATE INDEX "cgt_tickets_escalation_level_idx" ON "cgt_tickets"("escalation_level");

-- CreateIndex
CREATE INDEX "cgt_tickets_country_code_idx" ON "cgt_tickets"("country_code");

-- CreateIndex
CREATE INDEX "cgt_tickets_channel_idx" ON "cgt_tickets"("channel");

-- CreateIndex
CREATE INDEX "cgt_tickets_source_id_idx" ON "cgt_tickets"("source_id");

-- CreateIndex
CREATE INDEX "cgt_tickets_assignee_user_id_idx" ON "cgt_tickets"("assignee_user_id");

-- CreateIndex
CREATE INDEX "cgt_tickets_due_at_idx" ON "cgt_tickets"("due_at");

-- CreateIndex
CREATE INDEX "cgt_tickets_is_overdue_idx" ON "cgt_tickets"("is_overdue");

-- CreateIndex
CREATE INDEX "cgt_tickets_created_at_idx" ON "cgt_tickets"("created_at");

-- CreateIndex
CREATE INDEX "cgt_ticket_events_ticket_id_idx" ON "cgt_ticket_events"("ticket_id");

-- CreateIndex
CREATE INDEX "cgt_ticket_events_event_type_idx" ON "cgt_ticket_events"("event_type");

-- CreateIndex
CREATE INDEX "cgt_ticket_events_created_at_idx" ON "cgt_ticket_events"("created_at");

-- CreateIndex
CREATE INDEX "cgt_ticket_comments_ticket_id_idx" ON "cgt_ticket_comments"("ticket_id");

-- CreateIndex
CREATE INDEX "cgt_ticket_attachments_ticket_id_idx" ON "cgt_ticket_attachments"("ticket_id");

-- CreateIndex
CREATE INDEX "cgt_ingestion_runs_source_id_idx" ON "cgt_ingestion_runs"("source_id");

-- CreateIndex
CREATE INDEX "cgt_ingestion_runs_channel_idx" ON "cgt_ingestion_runs"("channel");

-- CreateIndex
CREATE INDEX "cgt_ingestion_runs_country_code_idx" ON "cgt_ingestion_runs"("country_code");

-- CreateIndex
CREATE INDEX "cgt_ingestion_runs_status_idx" ON "cgt_ingestion_runs"("status");

-- CreateIndex
CREATE INDEX "cgt_ingestion_runs_started_at_idx" ON "cgt_ingestion_runs"("started_at");

-- CreateIndex
CREATE INDEX "cgt_ingestion_items_run_id_idx" ON "cgt_ingestion_items"("run_id");

-- CreateIndex
CREATE INDEX "cgt_ingestion_items_source_id_idx" ON "cgt_ingestion_items"("source_id");

-- CreateIndex
CREATE INDEX "cgt_ingestion_items_fetch_status_idx" ON "cgt_ingestion_items"("fetch_status");

-- CreateIndex
CREATE INDEX "cgt_audit_events_event_type_idx" ON "cgt_audit_events"("event_type");

-- CreateIndex
CREATE INDEX "cgt_audit_events_actor_user_id_idx" ON "cgt_audit_events"("actor_user_id");

-- CreateIndex
CREATE INDEX "cgt_audit_events_entity_type_idx" ON "cgt_audit_events"("entity_type");

-- CreateIndex
CREATE INDEX "cgt_audit_events_entity_id_idx" ON "cgt_audit_events"("entity_id");

-- CreateIndex
CREATE INDEX "cgt_audit_events_country_code_idx" ON "cgt_audit_events"("country_code");

-- CreateIndex
CREATE INDEX "cgt_audit_events_created_at_idx" ON "cgt_audit_events"("created_at");

-- CreateIndex
CREATE INDEX "cgt_exports_requested_by_user_id_idx" ON "cgt_exports"("requested_by_user_id");

-- CreateIndex
CREATE INDEX "cgt_exports_status_idx" ON "cgt_exports"("status");

-- CreateIndex
CREATE INDEX "cgt_exports_export_type_idx" ON "cgt_exports"("export_type");

-- AddForeignKey
ALTER TABLE "cgt_sources" ADD CONSTRAINT "cgt_sources_credential_ref_id_fkey" FOREIGN KEY ("credential_ref_id") REFERENCES "cgt_platform_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_rules" ADD CONSTRAINT "cgt_rules_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "cgt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_rules" ADD CONSTRAINT "cgt_rules_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "cgt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_rules" ADD CONSTRAINT "cgt_rules_active_rule_version_id_fkey" FOREIGN KEY ("active_rule_version_id") REFERENCES "cgt_rule_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_rule_versions" ADD CONSTRAINT "cgt_rule_versions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "cgt_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_rule_versions" ADD CONSTRAINT "cgt_rule_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "cgt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_content_items" ADD CONSTRAINT "cgt_content_items_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "cgt_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_content_items" ADD CONSTRAINT "cgt_content_items_parent_content_id_fkey" FOREIGN KEY ("parent_content_id") REFERENCES "cgt_content_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_content_items" ADD CONSTRAINT "cgt_content_items_current_revision_id_fkey" FOREIGN KEY ("current_revision_id") REFERENCES "cgt_content_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_content_revisions" ADD CONSTRAINT "cgt_content_revisions_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "cgt_content_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_analysis_results" ADD CONSTRAINT "cgt_analysis_results_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "cgt_content_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_analysis_results" ADD CONSTRAINT "cgt_analysis_results_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "cgt_content_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_tickets" ADD CONSTRAINT "cgt_tickets_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "cgt_content_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_tickets" ADD CONSTRAINT "cgt_tickets_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "cgt_content_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_tickets" ADD CONSTRAINT "cgt_tickets_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "cgt_analysis_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_tickets" ADD CONSTRAINT "cgt_tickets_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "cgt_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_tickets" ADD CONSTRAINT "cgt_tickets_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "cgt_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_ticket_events" ADD CONSTRAINT "cgt_ticket_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cgt_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_ticket_events" ADD CONSTRAINT "cgt_ticket_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "cgt_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_ticket_comments" ADD CONSTRAINT "cgt_ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cgt_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_ticket_comments" ADD CONSTRAINT "cgt_ticket_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "cgt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_ticket_attachments" ADD CONSTRAINT "cgt_ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "cgt_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_ticket_attachments" ADD CONSTRAINT "cgt_ticket_attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "cgt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_ingestion_runs" ADD CONSTRAINT "cgt_ingestion_runs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "cgt_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_ingestion_items" ADD CONSTRAINT "cgt_ingestion_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "cgt_ingestion_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_ingestion_items" ADD CONSTRAINT "cgt_ingestion_items_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "cgt_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_audit_events" ADD CONSTRAINT "cgt_audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "cgt_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cgt_exports" ADD CONSTRAINT "cgt_exports_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "cgt_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
