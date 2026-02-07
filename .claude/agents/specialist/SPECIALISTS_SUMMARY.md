# Specialist Tier Agents (12 total)

## Backend Specialists (5)

### CGT-005: API Engineer
- **Focus**: REST API implementation, RBAC enforcement, authentication
- **Deliverables**: Complete API Server with all CRUD endpoints, CSV export, audit log API
- **Key Skills**: Fastify 5, TypeScript, bcrypt/JWT, RBAC middleware, input validation, OpenAPI/Swagger docs
- **Reports to**: CGT-003 (Backend Lead)
- **Parallel**: Works with Pipeline Engineer, Data Engineer

### CGT-006: Pipeline Engineer
- **Focus**: Worker Service, state machine, job orchestration, scheduler
- **Deliverables**: 8-step ingestion pipeline, retry logic, scheduler, auto-ticketing
- **Key Skills**: TypeScript, pgboss (PostgreSQL-backed queue), state machines, exponential backoff, idempotency, advisory locks
- **Reports to**: CGT-003 (Backend Lead)
- **Parallel**: Integrates with Integration Engineer, Data Engineer (SP-3)

### CGT-007: Data Engineer
- **Focus**: Database schema, full-text search, retention, performance
- **Deliverables**: Prisma schema + migrations, PostgreSQL full-text search setup (tsvector + GIN), retention job, SearchRepository interface
- **Key Skills**: PostgreSQL, Prisma ORM, full-text search (tsvector), index optimization, hash-based change detection
- **Reports to**: CGT-003 (Backend Lead)
- **Parallel**: Provides foundation (SP-1), blocks all backend work until ready

### CGT-008: AI/NLP Engineer
- **Focus**: LLM integration, prompt engineering, compliance analysis
- **Deliverables**: Compliance prompt templates, evidence extraction, PII redaction, language detection
- **Key Skills**: LLM prompt engineering, NLP, OCR integration, data minimization
- **Reports to**: CGT-003 (Backend Lead)
- **Parallel**: Collaborates with Compliance Specialist (SP-4)

### CGT-009: Integration Engineer
- **Focus**: Channel connectors (Web, Facebook, Instagram, LinkedIn, YouTube)
- **Deliverables**: All 5 channel connectors, credential management, rate limiting
- **Key Skills**: Web scraping, social media APIs, normalization, hashing, throttling
- **Reports to**: CGT-003 (Backend Lead)
- **Parallel**: Builds Web and Social connectors concurrently, feeds Pipeline Engineer

## Frontend Specialists (2)

### CGT-010: UX Designer & Component Developer
- **Focus**: UX design, design system, components, dashboard, forms, tables
- **Deliverables**:
  - **Design Phase (Phase 1-2)**: Design system document (colors, typography, spacing, elevation), wireframes for key screens (dashboard, ticket detail, source wizard, rule editor, audit log), component pattern library (data table, form wizard, KPI card, status badge), interaction pattern guide (loading states, error states, empty states, confirmation dialogs)
  - **Implementation Phase (Phase 2+)**: Complete React design system, all UI components, responsive layouts (desktop + tablet)
- **Key Skills**: UX design, wireframing, design systems, React 18, TypeScript, component architecture, data tables, form wizards, responsive CSS, WCAG 2.1 Level AA
- **Reports to**: CGT-004 (Frontend Lead)
- **Collaboration with CGT-011**: CGT-010 designs (visual system, wireframes, interaction patterns) → shared design contract → CGT-011 implements (routing, RBAC navigation, URL state, flow transitions). Both sync on route-component binding and navigation patterns.
- **Parallel**: Produces design artifacts in Phase 1-2 while CGT-011 scaffolds routing; builds components in Phase 2+ while CGT-011 handles navigation flows

### CGT-011: Navigation & Flow Developer
- **Focus**: Routing, 25+ navigation flows, RBAC navigation, error handling
- **Deliverables**: Complete React Router implementation, filter persistence, breadcrumbs, error pages
- **Key Skills**: React Router, TypeScript, RBAC filtering, URL state management, error boundaries
- **Reports to**: CGT-004 (Frontend Lead)
- **Parallel**: Works alongside UX Designer & Component Developer, syncs on design contract and route-component binding

## Cross-Functional Specialists (5)

### CGT-012: DevOps Engineer
- **Focus**: Docker infrastructure, deployment, observability, security hardening
- **Deliverables**: docker-compose setup, health checks, JSON logging, backup procedures
- **Key Skills**: Docker/docker-compose, on-premise deployment, secret management, health checks
- **Reports to**: CGT-001 (Program Director)
- **Parallel**: Works independently, must deliver in Phase 1 to unblock all others

### CGT-013: Technical Writer
- **Focus**: Documentation, API reference, runbooks, stakeholder communication
- **Deliverables**: API docs (OpenAPI), dev guides, deployment runbooks, ADRs, release notes
- **Key Skills**: API documentation, technical writing, stakeholder communication, ADRs
- **Reports to**: CGT-001 (Program Director)
- **Parallel**: Operates continuously across all streams, collects decisions in real-time

### CGT-014: Test Automation Engineer
- **Focus**: Test strategy, automated tests, SLA validation
- **Deliverables**: Unit/integration/E2E test suites, performance tests, RBAC enforcement tests
- **Key Skills**: Vitest, Playwright, TypeScript, API testing, E2E automation, performance testing, RBAC scenarios
- **Reports to**: CGT-001 (Program Director)
- **Parallel**: Writes tests concurrently with feature development

### CGT-015: Business Analyst
- **Focus**: Requirements refinement, gap analysis, acceptance criteria
- **Deliverables**: Clarified requirements, acceptance criteria, edge case catalog, traceability matrix
- **Key Skills**: Requirements elicitation, gap analysis, user stories, acceptance criteria, traceability
- **Reports to**: CGT-001 (Program Director)
- **Parallel**: Works one phase ahead (refines Phase N+1 while N executes)

### CGT-016: Compliance & i18n Specialist
- **Focus**: Regulatory accuracy, compliance rules, i18n framework
- **Deliverables**: Rule templates, i18n design, LLM prompt validation, edge case handling
- **Key Skills**: Multi-jurisdiction regulations, rule design, i18n patterns, GDPR compliance
- **Reports to**: CGT-001 (Program Director)
- **Parallel**: Collaborates with AI/NLP Engineer for prompt validation (SP-4)

## Usage Pattern

Each specialist agent:
1. Receives task assignments from their Lead or Program Director
2. Works in parallel with other specialists in their workstream
3. Coordinates at defined sync points
4. Delivers outputs that conform to module contracts
5. Submits deliverables for review by QA Architect and Security Reviewer

## Reference

This summary file is the authoritative source for specialist agent specifications.
For leadership agents, see `../leadership/`. For oversight agents, see `../oversight/`.
