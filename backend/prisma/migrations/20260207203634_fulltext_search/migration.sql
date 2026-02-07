-- Full-Text Search Setup for Content Guardian Tower
-- Applied after Prisma base migration creates tables
-- Uses tsvector columns + GIN indexes for PostgreSQL native full-text search

-- ============================================================
-- Tickets: search on title + summary
-- ============================================================

ALTER TABLE cgt_tickets ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_tickets_search ON cgt_tickets USING GIN (search_vector);

-- ============================================================
-- Content Revisions: search on extracted text fields
-- ============================================================

ALTER TABLE cgt_content_revisions ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(main_text, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(caption, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(comment_text, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(ocr_text, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(transcript, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_revisions_search ON cgt_content_revisions USING GIN (search_vector);

-- ============================================================
-- Sources: search on display_name
-- ============================================================

ALTER TABLE cgt_sources ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(display_name, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_sources_search ON cgt_sources USING GIN (search_vector);

-- ============================================================
-- Rules: search on name
-- ============================================================

ALTER TABLE cgt_rules ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_rules_search ON cgt_rules USING GIN (search_vector);

-- ============================================================
-- Audit Events: search on message
-- ============================================================

ALTER TABLE cgt_audit_events ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(message, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_audit_search ON cgt_audit_events USING GIN (search_vector);
