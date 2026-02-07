# ADR-001: Module Boundary Definitions

**Status**: Accepted
**Date**: 2026-02-07
**Decision Makers**: CGT-001 (Program Director), CGT-002 (Senior IT Architect)

## Context

The source document (Operational Architecture) defines 10 discrete modules for the Content Guardian Tower platform: auth, source, ingestion, connector, analysis, rule, ticket, audit, export, and search. Each module implies its own interface contracts, repository abstractions, and inter-module communication patterns.

For an MVP targeting a single-tenant on-premise deployment with a small development team, maintaining 10 module boundaries introduces excessive interface overhead, increases the number of integration points to test, and slows iteration velocity. Several of these modules are tightly coupled in practice: source configuration is consumed exclusively by the ingestion pipeline, connector logic is an implementation detail of ingestion, rule management exists solely to feed the analysis engine, and audit logging is part of broader governance concerns.

A consolidation is needed to reduce complexity while preserving the ability to decompose modules later as the system scales.

## Decision

Consolidate from 10 modules to 6 primary modules:

1. **Auth** -- Authentication, session management, RBAC enforcement, user CRUD.
2. **Ingestion** -- Absorbs source management and connector logic. Handles source configuration, channel connectors (web scraping, social media APIs), content fetching, normalization, hashing, and the 8-step ingestion state machine.
3. **Analysis** -- Absorbs rule management. Handles compliance rule CRUD, rule versioning, LLM prompt construction, compliance evaluation, confidence scoring, and evidence extraction.
4. **Ticketing** -- Ticket lifecycle management, auto-ticketing from analysis results, status transitions, assignment, escalation, comments, and attachments.
5. **Governance** -- Absorbs audit logging. Handles append-only audit log, retention policies, ILM enforcement, and retention reporting.
6. **Export** -- CSV generation for tickets and audit data, filtered exports, file storage management.

The **search** abstraction is not a standalone module. Instead, a `SearchRepository` interface is defined in the shared/common layer. Each module that needs search capabilities (primarily Ticketing and Governance) depends on this interface. The initial implementation uses PostgreSQL full-text search (tsvector + GIN indexes); a future Elasticsearch implementation can be swapped in behind the same interface.

## Consequences

### Positive
- Fewer module boundaries (6 vs 10) reduces the number of interface contracts to define, implement, and test.
- Source and connector logic co-located with ingestion eliminates unnecessary abstraction layers for tightly coupled concerns.
- Rule management co-located with analysis simplifies the rule-to-prompt pipeline.
- Audit and retention co-located under governance provides a single module for all compliance-related data management.
- Each module still has a clear single responsibility, maintaining SOLID compliance.
- Module boundaries are drawn at natural deployment and team boundaries, making future decomposition straightforward.

### Negative
- The ingestion module is larger than the others, combining source CRUD, connector implementations, and pipeline orchestration.
- If source management needs a distinct UI/API surface in the future, extracting it from ingestion will require refactoring.
- The analysis module combines two concerns (rule management and LLM evaluation) that could evolve at different rates.

### Risks
- **Module bloat**: The ingestion module could grow unwieldy as more channel connectors are added. Mitigation: enforce sub-module organization within ingestion (e.g., `ingestion/connectors/`, `ingestion/sources/`, `ingestion/pipeline/`).
- **Premature coupling**: Co-locating rule management with analysis could make it harder to reuse rules across different analysis engines. Mitigation: rules are defined as data (stored in PostgreSQL), not as code tightly bound to the LLM integration.

## Alternatives Considered

1. **Keep all 10 modules as defined in the source document**: Rejected because the interface overhead is disproportionate to the MVP scope. Each module requires its own repository interface, service layer, and integration tests. With a small team, this slows development without providing proportional benefit.

2. **Consolidate to 3 mega-modules (API, Pipeline, Data)**: Rejected because this groups concerns by technical layer rather than business domain, violating the single responsibility principle and making future decomposition harder.

3. **Consolidate to 4 modules (Auth, Pipeline, Ticketing, Admin)**: Rejected because it merges governance with admin and loses the clear separation between operational concerns (ticketing) and compliance concerns (governance/audit).
