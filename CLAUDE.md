# CLAUDE.md

## Project Overview

**Content Guardian Tower (CGT)** - AI-first platform for monitoring and governing compliance of digital content (web and social media) across multiple countries.

18-agent development architecture with slash commands: `/task`, `/coordinate`, `/execute-plan`, `/plan-phase`, `/architecture-review`, `/qa-review`, `/security-review`, `/design-schema`, `/design-ui`. Agent specs in `.claude/agents/`.

## Technology Stack

- **Backend**: Node.js 20 LTS + TypeScript 5 (Fastify 5, Prisma ORM, pgboss for job queue)
- **Frontend**: React 18 + TypeScript 5 (Vite, React Context for state)
- **Data**: PostgreSQL 15 (system of record, job queue, full-text search)
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Code Quality**: ESLint, Prettier, TypeScript strict mode
- **AI**: OpenAI SDK for compliance analysis
- **Infrastructure**: Docker Compose (3 containers), on-premise single-tenant

## Architecture

Two application components + PostgreSQL, deployed via docker-compose:
1. **Backend** (`backend/`) - Single Node.js process: Fastify REST API + pgboss background worker + internal scheduler
2. **Frontend** (`frontend/`) - React SPA served by Vite

Source code: `backend/src/api/` (routes, middleware), `backend/src/worker/` (jobs, state machine), `backend/src/shared/` (Prisma, types, repositories).

PostgreSQL handles everything: relational data, job queue (pgboss), full-text search (tsvector + GIN indexes), advisory locks for scheduler. No Redis, no Elasticsearch for MVP - add them later behind repository interfaces if scale demands it.

## Development Commands

```bash
# Docker
docker compose up -d                     # Start all services (postgres, backend, frontend)
docker compose logs -f [service]         # View logs
docker compose down                      # Stop all services

# Backend (from backend/)
npm run dev                              # Run locally (API + worker in one process)
npm test                                 # Run tests (Vitest)
npx prisma migrate dev                   # Apply migrations
npx prisma generate                      # Generate Prisma client
npx prisma db seed                       # Seed database

# Frontend (from frontend/)
npm run dev                              # Vite dev server (port 5173)
npm test                                 # Run tests
npm run build                            # Production build

# Quality
npm run lint                             # ESLint
npm run typecheck                        # TypeScript check
npx playwright test                      # E2E tests
```

## Module Boundaries (CRITICAL)

All module interactions go through defined interfaces. No cross-module internal access.

| Module | Responsibility |
|--------|---------------|
| **auth** | Authentication, session (24h timeout), RBAC (5 roles + country scope) |
| **ingestion** | Content fetching, normalization, hash-based change detection |
| **analysis** | LLM compliance evaluation, PII redaction, evidence extraction |
| **ticketing** | Ticket lifecycle, assignments, 48h auto-escalation |
| **governance** | Append-only audit log, 6-month retention |
| **export** | Synchronous CSV streaming |

Dependency direction: `route handler -> service -> repository -> data layer`

## Key Patterns

- **Repository Pattern**: Business logic uses abstractions (e.g. `SearchRepository`), not direct Prisma calls. This enables swapping PostgreSQL full-text search for Elasticsearch later without touching business logic
- **Plugin/Adapter**: Channel connectors implement `IConnector` interface (pluggable)
- **State Machine**: 8-step ingestion pipeline (RUN_START -> FETCH_ITEMS -> NORMALIZE+HASH -> STORE_REVISION -> DIFF -> ANALYZE_LLM -> UPSERT_TICKET -> RUN_FINISH). Each step: PENDING/RUNNING/SUCCEEDED/FAILED/SKIPPED
- **Idempotency**: `content_key = sha256(normalized_text + canonical_url)` for dedup; `ticket_key = rev:{revision_id}` prevents duplicate tickets
- **Job Queue**: pgboss (PostgreSQL-backed) with retry, exponential backoff + jitter, soft cancel via `cancel_requested` flag
- **RBAC**: Admin, Global Manager, Regional Manager, Local Manager, Viewer - with country scope on all queries
- **Ingestion Trigger**: Both scheduled (per-source `crawl_frequency_minutes`) and manual (`POST /api/v1/ingestion-runs`)
- **Ticket Due Dates**: Calculated from `system_settings.default_due_hours_*` per risk level; overdue flag tracked
- **Auto-Escalation**: 48h inactivity on OPEN/IN_PROGRESS tickets, escalation levels LOCAL -> REGIONAL -> GLOBAL
- **Logging**: JSON to stdout with mandatory fields: `request_id`, `job_id`, `run_id`, `ticket_id`

## Security Rules

- bcrypt for password hashing, never plaintext in logs/DB/responses
- Environment variables for all secrets, never in code
- All API inputs validated (Fastify JSON Schema)
- PII redacted before sending to OpenAI API (data minimization)
- LLM generates: compliance status, evidence (field + snippet + offsets), explanation, fix suggestions
- OCR required for Facebook image content (Tesseract or similar)
- YouTube connector must extract transcripts when available
- Audit log is append-only (no UPDATE/DELETE) — must be legally defensible
- RBAC enforced on every endpoint and every data query
- CSV export guardrails: max row limit, timeout, HTTP 422 if exceeded, streaming response
- Credential test endpoint: validate social platform credentials before use

## Frontend Rules

- Desktop (>=1024px) + tablet (768-1023px) only, no mobile
- RBAC-filtered navigation: Operate | Monitor | Configure | Govern | Report
- 25+ navigation flows documented in `docs/Content_Guardian_Tower_Navigation_Flows_MVP (1).docx`
- URL state management for filter persistence and deep-linking
- WCAG 2.1 Level AA: 44px tap targets, semantic headings, focus states
- State: React Context for auth/theme, URL params for filters, local state for forms

## Checkpoints

Three quality checkpoints gate progression:

1. **CP-1 Foundation** (end Phase 1): Docker working, Prisma schema valid, module contracts defined
2. **CP-2 Backend E2E** (end Phase 3): Auth/RBAC working, ingestion pipeline E2E, LLM analysis validated
3. **CP-3 MVP Complete** (end Phase 6): All 25+ flows working, security validated, SLA met (95% < 4h)

## Sync Points

- **SP-1**: Prisma schema ready -> unblocks all backend specialist work
- **SP-2**: API contracts (OpenAPI) stable -> unblocks frontend integration

## Scalability Path

Current MVP uses PostgreSQL for everything. When scale demands it, add without rewriting:
- **Need faster search?** -> Add Elasticsearch behind `SearchRepository` interface
- **Need faster queue?** -> Swap pgboss for BullMQ + Redis
- **Need separate worker?** -> Extract `src/worker/` into its own container
- **Need global state?** -> Add Zustand store (30 min)

## Reference Documents

1. `CGT_Agent_Team_v3_EN.docx` - 18-agent architecture
2. `docs/Content Guardian Tower – Architettura Operativa & Decisioni Mvp (1).pdf` - Operational architecture
3. `docs/database_schema (1).docx` - PostgreSQL schema
4. `docs/Content_Guardian_Tower_Navigation_Flows_MVP (1).docx` - 25+ UI flows
5. `docs/Content Guardian Tower – Documento Di Progetto Aggiornato (mvp).pdf` - MVP requirements

Agent docs: `.claude/agents/README.md` (start here), `.claude/agents/AGENT_REGISTRY.md`, `.claude/agents/AGENT_COORDINATION.md`

## Development Phases

| Phase | Weeks | Focus |
|-------|-------|-------|
| 1 | 1-2 | Foundation: docker-compose, Prisma schema, API contracts, module boundaries |
| 2 | 3-4 | Core Backend + Frontend Scaffold: Auth, RBAC, CRUD, state machine |
| 3 | 5-6 | Pipeline Intelligence: Social connectors, LLM analysis, scheduling |
| 4 | 7-8 | Ticketing & Frontend Flows: Ticket lifecycle, 25+ navigation flows |
| 5 | 9-10 | Governance & Polish: Retention, audit logging, performance |
| 6 | 10 | Integration & Release: E2E validation, security review, documentation |
