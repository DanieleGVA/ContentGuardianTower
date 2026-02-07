# ADR-004: PostgreSQL-Only Data Layer

**Status**: Accepted
**Date**: 2026-02-07
**Decision Makers**: CGT-001 (Program Director), CGT-002 (Senior IT Architect)

## Context

The source architecture (Operational Architecture document) prescribes a three-store data layer:

1. **PostgreSQL** -- System of record for users, roles, configurations, ticket state, run/job state, and audit log.
2. **Elasticsearch** -- Search and aggregation engine for revisions, analysis results, and ticket projections.
3. **Redis** -- Job queue (BullMQ), distributed locks for the scheduler, and ephemeral caching.

This architecture is appropriate for a production system handling millions of records and thousands of concurrent jobs. However, the MVP targets:

- Fewer than 100,000 content records.
- Fewer than 1,000 ingestion jobs per day.
- A single-tenant, on-premise deployment.
- A small operations team (likely the same developers who build it).

Running PostgreSQL, Elasticsearch, and Redis requires 6 Docker containers (each service plus its configuration), tripling operational complexity for monitoring, backup, log aggregation, and failure diagnosis. For the MVP scale, this is over-engineered.

## Decision

Use **PostgreSQL 15** as the single data store for all system data. Specifically:

### Full-Text Search (replaces Elasticsearch)

- Use PostgreSQL's built-in `tsvector` column type and `GIN` indexes for full-text search on content revisions, ticket descriptions, and audit log entries.
- Create `tsvector` columns with `to_tsvector('english', ...)` for indexed text fields.
- Use `ts_rank()` for relevance scoring and `ts_headline()` for highlighted snippets.
- Wrap all search operations behind a `SearchRepository` interface so that Elasticsearch can be swapped in later without changing business logic.

### Job Queue (replaces Redis + BullMQ)

- Use **pgboss** (PostgreSQL-backed job queue) for async job processing.
- pgboss uses PostgreSQL's `SKIP LOCKED` feature for efficient, concurrent job consumption.
- Supports job scheduling (cron), retry with exponential backoff, job expiration, and dead letter queues.
- Provides the same semantic guarantees as BullMQ (at-least-once delivery, visibility timeout) without requiring a separate Redis instance.

### Distributed Locks (replaces Redis distributed locks)

- Use **PostgreSQL advisory locks** (`pg_advisory_lock`, `pg_try_advisory_lock`) for distributed locking.
- Used by the scheduler to prevent duplicate execution of periodic tasks (escalation checks, retention jobs, scheduled ingestion runs).
- Advisory locks are lightweight and do not conflict with row-level locks.

### Caching

- No dedicated caching layer for MVP. PostgreSQL connection pooling (via Prisma) and query optimization handle the expected load.
- If hot-path caching is needed, in-process Node.js caching (e.g., `lru-cache`) is the first option before introducing Redis.

## Consequences

### Positive
- **Simpler deployment**: 3 Docker containers (API/Worker, PostgreSQL, Nginx/reverse proxy) instead of 6+ (API, Worker, PostgreSQL, Elasticsearch, Redis, Kibana).
- **Simpler operations**: One database to back up, monitor, and maintain. Single source of truth with no data synchronization concerns between PostgreSQL and Elasticsearch.
- **Simpler debugging**: All data visible via standard SQL queries. No need to learn Elasticsearch Query DSL or Redis CLI for debugging.
- **Transactional consistency**: Job creation and data writes can happen in the same PostgreSQL transaction, eliminating a class of consistency bugs that arise when coordinating writes across PostgreSQL and Redis.
- **Faster development**: Developers only need to know PostgreSQL and SQL. No Elasticsearch mapping configuration, no Redis connection management.
- **Adequate search performance**: PostgreSQL GIN indexes on `tsvector` columns handle full-text search efficiently for the expected data volume (<100K records). Typical query response times are <50ms for filtered, paginated search results.

### Negative
- **Search feature limitations**: PostgreSQL full-text search lacks some Elasticsearch features: faceted aggregations are manual (GROUP BY queries), fuzzy matching is limited, and there is no built-in synonym support. These limitations are acceptable for MVP.
- **Job queue scalability ceiling**: pgboss uses PostgreSQL polling (with `SKIP LOCKED`) rather than Redis's pub/sub push model. At very high job volumes (>10,000 jobs/hour), this polling can add load to the database. This is well above the MVP's <1,000 jobs/day target.
- **No real-time search updates**: Elasticsearch provides near-real-time indexing. PostgreSQL `tsvector` updates are synchronous with the transaction, which is actually an advantage for consistency but means the search index update is on the write path.
- **Advisory lock limitations**: Advisory locks are session-scoped or transaction-scoped. If a process crashes while holding a session-scoped lock, the lock is released when the connection closes. This is acceptable behavior for the MVP's scheduler use case.

### Risks
- **Search performance degradation at scale**: If the content volume grows beyond 100K records, full-text search queries with complex filters could slow down. Mitigation: the `SearchRepository` interface abstracts search implementation. Swapping in Elasticsearch requires implementing a new class behind the same interface, with no changes to business logic or API layer.
- **pgboss table bloat**: pgboss stores job history in PostgreSQL tables. Without periodic cleanup, these tables can grow large. Mitigation: configure pgboss's built-in `archiveCompletedAfterSeconds` and `deleteAfterDays` options.
- **Single point of failure**: With all data in one PostgreSQL instance, a database failure affects all system functions. Mitigation: this is already the case even in the multi-store architecture (PostgreSQL is the system of record). Standard PostgreSQL HA (streaming replication, pgBouncer) can be added if needed.

## Alternatives Considered

1. **Full three-store architecture (PostgreSQL + Elasticsearch + Redis)**: As prescribed by the source documents. Rejected for MVP because the operational complexity is disproportionate to the data volume. The 6-container deployment triples the surface area for failures, requires three different backup strategies, and demands expertise in three different data technologies. The source architecture is designed for production scale that the MVP does not need to address.

2. **PostgreSQL + Redis (drop Elasticsearch only)**: Keep Redis for job queue and caching while replacing Elasticsearch with PostgreSQL full-text search. Rejected because pgboss provides equivalent job queue functionality without the additional container. Redis adds value primarily at high concurrency and caching requirements that the MVP does not have.

3. **SQLite instead of PostgreSQL**: SQLite would further simplify deployment (embedded database, no separate container). Rejected because SQLite lacks concurrent write support (single writer), does not support advisory locks, and has limited full-text search capabilities. The MVP's job processing requires concurrent reads and writes that SQLite cannot efficiently handle.

4. **PostgreSQL + Meilisearch (lightweight search)**: Meilisearch is simpler to operate than Elasticsearch and provides typo-tolerant search. Rejected because it still requires an additional container and data synchronization. PostgreSQL's built-in search is sufficient for the MVP's needs.
