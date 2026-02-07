# ADR-006: Simplified Quality Gates and Sync Points

**Status**: Accepted
**Date**: 2026-02-07
**Decision Makers**: CGT-001 (Program Director), CGT-002 (Senior IT Architect)

## Context

The source document (Multi-Agent Team Architecture) defines a formal quality assurance process consisting of:

**6 Quality Gates (QG-1 through QG-6)**:
- QG-1 Foundation: Docker working, schema valid, ES deployed, module contracts defined.
- QG-2 Core Backend: Auth/RBAC working, CRUD tested, API contracts verified, SOLID compliance validated.
- QG-3 Pipeline: E2E ingestion working, idempotency verified, integration tests passing.
- QG-4 AI Analysis: LLM accuracy validated, evidence correct, data minimization OK.
- QG-5 Frontend: All 25+ flows working, RBAC in UI, responsive, E2E tests passing.
- QG-6 MVP Sign-Off: Full vertical slice complete, security validated, SLA met, docs delivered.

**6 Sync Points (SP-1 through SP-6)**:
- SP-1 Schema Ready: Postgres schema and ES mappings finalized.
- SP-2 API Contracts: OpenAPI contracts stable for frontend integration.
- SP-3 Pipeline-to-Data: Pipeline and data layer handoff format agreed.
- SP-4 AI-to-Rule: LLM prompts validated by compliance specialist.
- SP-5 E2E Integration: Full vertical slice working.
- SP-6 Release Readiness: All quality gates passed, all agents signed off.

This process is designed for a team of 18 specialized agents working in parallel across 4 workstreams. It ensures coordination between independent agents who may be working on different parts of the system simultaneously.

For a single-developer AI-assisted workflow (one human developer using Claude Code as an AI pair programmer), this level of ceremony introduces overhead without proportional benefit. The developer has full context of all workstreams, does not need formal sync points to coordinate with themselves, and can validate quality continuously rather than at discrete gates.

## Decision

Consolidate to **3 Checkpoints** and **2 Sync Points**:

### Checkpoints (replacing 6 Quality Gates)

**CP-1: Foundation Complete**
- Maps to: QG-1
- Validates: Docker containers start successfully, PostgreSQL schema applied, database migrations run, module directory structure created, API server responds to health check, pgboss worker starts.
- Exit criteria: `docker-compose up` works, `GET /health` returns 200, database tables exist.

**CP-2: Backend End-to-End**
- Maps to: QG-2 + QG-3 + QG-4
- Validates: Authentication and session management work. RBAC enforces role and country scope on all endpoints. CRUD operations for all entities pass. Ingestion pipeline processes content through all 8 steps. Hash-based change detection skips unchanged content. LLM analysis produces compliance evaluations with evidence. Auto-ticketing creates tickets from non-compliant results. Job retry and error handling work correctly.
- Exit criteria: Integration tests pass for the full ingestion-to-ticket pipeline. API tests cover all RBAC scenarios. LLM analysis produces expected output format.

**CP-3: MVP Complete**
- Maps to: QG-5 + QG-6
- Validates: All 25+ frontend navigation flows implemented. RBAC-driven navigation works across all 5 roles. Responsive design works on desktop and tablet. CSV export produces valid output. Audit log captures all state changes. Retention policy executes correctly. Security review complete (no secrets in code, input validation on all endpoints, RBAC enforced everywhere).
- Exit criteria: E2E tests pass for critical flows. Manual walkthrough of all navigation flows succeeds across roles. Performance meets SLA (95% of jobs < 4 hours).

### Sync Points (replacing 6 Sync Points)

**SP-1: Schema Ready** (retained as-is)
- When: End of Phase 1 (Foundation).
- What: PostgreSQL schema (Prisma schema file) is finalized. All tables, columns, indexes, and constraints are defined. Database migrations are tested.
- Why: All backend modules depend on the schema. Changing the schema after backend development begins causes cascading changes.

**SP-2: API Contracts Stable** (retained as-is)
- When: End of Phase 2 (Core Backend).
- What: OpenAPI specification for all endpoints is finalized. Request/response types are defined. Error response format is standardized. Authentication flow is documented.
- Why: Frontend development depends on stable API contracts. Changing contracts after frontend development begins causes rework.

### Absorbed Sync Points

- **SP-3 (Pipeline-to-Data)**: Absorbed into CP-2. The pipeline and data layer are in the same codebase and use the same Prisma schema. No formal handoff is needed.
- **SP-4 (AI-to-Rule)**: Absorbed into CP-2. LLM prompts and rule definitions are validated as part of the backend E2E checkpoint.
- **SP-5 (E2E Integration)**: Absorbed into CP-3. The full vertical slice is validated as part of the MVP complete checkpoint.
- **SP-6 (Release Readiness)**: Absorbed into CP-3. Release readiness is the definition of MVP complete.

## Consequences

### Positive
- **Reduced overhead**: 3 checkpoints instead of 6 quality gates means fewer formal review ceremonies.
- **Faster iteration**: The developer can move fluidly between modules without waiting for formal gate approvals.
- **Appropriate for team size**: A single developer with AI assistance does not need formal sync points to coordinate with themselves.
- **Maintains rigor where it matters**: SP-1 (Schema Ready) and SP-2 (API Contracts Stable) are retained because they represent genuine dependencies where premature advancement causes expensive rework.
- **Clear milestone structure**: Three checkpoints provide natural demo points and progress markers.

### Negative
- **Less granular progress tracking**: With 3 checkpoints instead of 6 gates, there is less visibility into intermediate progress. Mitigation: use git commits and issue tracking for fine-grained progress.
- **Larger validation surface per checkpoint**: CP-2 covers what was previously 3 separate quality gates, making the checkpoint validation more complex. Mitigation: break CP-2 validation into sub-checks (auth, pipeline, analysis) that can be verified incrementally.
- **Risk of skipping quality checks**: Without formal gates, quality checks might be deferred or forgotten. Mitigation: each checkpoint has explicit exit criteria documented above. CI/CD pipeline runs tests automatically.

### Risks
- **Schema changes after SP-1**: If the schema needs to change after SP-1 (which is likely for any real project), there is no formal process for managing the change. Mitigation: Prisma migrations handle schema evolution gracefully. Schema changes after SP-1 are permitted but should be minimized and accompanied by migration scripts.
- **API contract drift**: Without formal SP-2 enforcement, API contracts could drift during implementation. Mitigation: TypeScript shared types between frontend and backend catch contract mismatches at compile time (see ADR-002, ADR-003).

## Alternatives Considered

1. **Retain all 6 Quality Gates and 6 Sync Points**: As defined in the source document. Rejected because the process is designed for 18 parallel agents and introduces ceremony disproportionate to a single-developer workflow. The formal gate reviews, sign-offs, and sync point coordination add overhead without proportional quality benefit when one person has full context.

2. **No formal checkpoints (continuous delivery)**: Eliminate all gates and sync points in favor of continuous integration and deployment. Rejected because some checkpoints represent genuine technical dependencies (schema must be stable before building on it, API contracts must be stable before frontend integration). Eliminating these leads to expensive rework.

3. **2 Checkpoints (Foundation + MVP)**: Further consolidation to just two checkpoints. Rejected because collapsing the backend E2E validation into the MVP checkpoint means the frontend would be built on an unvalidated backend, risking late discovery of fundamental issues.
