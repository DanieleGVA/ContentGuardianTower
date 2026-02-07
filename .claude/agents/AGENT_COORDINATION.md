# Agent Coordination & Workflow Guide

This document defines how the 18 agents coordinate their work across the 6 phases of the MVP.

## Coordination Principles

### 1. Parallel Execution First
- Maximize concurrent work within constraints
- Use synchronization points only when necessary
- Avoid serialization of independent tasks

### 2. Clear Ownership
- Each agent owns specific deliverables
- No overlapping responsibilities
- Clear escalation paths

### 3. Contract-Based Integration
- Agents work against defined interfaces
- Module boundaries prevent tight coupling
- Interface contracts enable parallel development

### 4. Continuous Oversight
- QA and Security review all streams simultaneously
- Early guidance prevents rework
- Veto power ensures quality

## Phase-by-Phase Coordination

### Phase 1: Foundation (Weeks 1-2)

**Objective**: Establish architecture, infrastructure, and data foundation

#### Parallel Tracks

**Track A: Architecture Definition**
```
CGT-001 (Program Director)
├─> Define master plan, milestones, dependencies
├─> Assign Phase 1 tasks
└─> Set sync points

CGT-002 (Senior IT Architect)
├─> Define module boundaries (ADR-001)
├─> Create interface contracts
├─> Define SOLID guidelines
└─> Create dependency map

CGT-015 (Business Analyst)
├─> Cross-analyze all 4 source documents
├─> Produce gap report
├─> Refine Phase 2 requirements
└─> Create acceptance criteria
```

**Track B: Infrastructure & Data**
```
CGT-012 (DevOps Engineer) [PARALLEL-A]
├─> Create docker-compose.yml
├─> Configure PostgreSQL (system of record + job queue + search)
├─> Setup health checks
├─> Configure secret management
└─> Test full stack startup

CGT-007 (Data Engineer) [PARALLEL-B]
├─> Design Postgres schema
├─> Create full-text search indexes (tsvector + GIN)
├─> Document data model
└─> Prepare Prisma migration scripts

CGT-003 (Backend Lead) [PARALLEL-C]
├─> Define API contracts (OpenAPI)
├─> Work with IT Architect on module interfaces
└─> Plan backend workstream

CGT-004 (Frontend Lead) [PARALLEL-D]
├─> Setup frontend project structure
├─> Create routing scaffold
└─> Plan frontend workstream

CGT-010 (UX Designer & Component Developer) [PARALLEL-D2]
├─> Define design system (colors, typography, spacing, elevation)
├─> Create wireframes for key screens (dashboard, ticket detail, source wizard)
├─> Define component patterns (data table, form wizard, KPI card, status badge)
└─> Create interaction pattern guide (loading, error, empty states, dialogs)

CGT-016 (Compliance Specialist) [PARALLEL-E]
├─> Define initial rule templates
├─> Document compliance requirements for 3 priority countries
└─> Prepare i18n framework design
```

**Track C: Documentation & Testing Foundation**
```
CGT-013 (Technical Writer)
├─> Create project wiki
├─> Setup ADR template
├─> Create API doc scaffold
└─> Begin collecting decisions

CGT-014 (Test Automation Engineer)
├─> Setup test frameworks
├─> Define test strategy
├─> Create CI/CD pipeline outline
└─> Prepare test environments
```

**Track D: Oversight**
```
CGT-018 (Security Reviewer)
├─> Review initial setup
├─> Validate secret management
├─> Define security baseline
└─> Prepare security test scenarios

CGT-017 (QA Architect)
├─> Review architecture decisions
├─> Define quality standards
├─> Prepare conformance checklists
└─> Setup code review process
```

#### Synchronization Point: SP-1 (Schema Ready)

**Trigger**: Data Engineer completes schema design + Senior IT Architect approves

**Convergence**:
- CGT-007 (Data Engineer): Schema implemented and documented
- CGT-002 (Senior IT Architect): Architecture approval

**Unblocks**:
- CGT-005 (API Engineer): Can start implementing CRUD
- CGT-006 (Pipeline Engineer): Can start state machine implementation
- CGT-008 (AI/NLP Engineer): Can start analysis pipeline
- CGT-009 (Integration Engineer): Can start connectors

**Gate Check**: QG-1 - Foundation Complete
- Program Director + Sr IT Architect + Security Reviewer
- Verify: Docker working, schema valid, ES deployed, module contracts defined

---

### Phase 2: Core Backend + Frontend Scaffold (Weeks 3-4)

**Objective**: Implement authentication, RBAC, CRUD, state machine foundation

#### Parallel Tracks

**Track A: Backend Specialists (5 concurrent)**
```
CGT-005 (API Engineer) [PARALLEL-A]
├─> Implement authentication (bcrypt, sessions)
├─> Implement RBAC middleware (role + country scope)
├─> Implement CRUD endpoints (users, sources, rules, settings)
├─> Implement audit logging API
└─> Generate OpenAPI documentation

CGT-006 (Pipeline Engineer) [PARALLEL-B]
├─> Implement state machine (8 steps)
├─> Setup pgboss job queue (PostgreSQL-backed)
├─> Implement retry logic (exponential backoff + jitter)
├─> Implement timeout and soft cancel
└─> Create job monitoring API

CGT-009 (Integration Engineer) [PARALLEL-C]
├─> Implement Web owned connector (full scan)
├─> Implement Web search-discovered connector
├─> Implement content normalization
├─> Implement hash-based change detection
└─> Setup credential management (masking)

CGT-007 (Data Engineer) [PARALLEL-D]
├─> Implement repository pattern (Postgres)
├─> Implement ES query layer
├─> Create dashboard aggregations
├─> Optimize indices
└─> Setup change detection storage

CGT-008 (AI/NLP Engineer) [PARALLEL-E]
├─> Research LLM prompt patterns
├─> Design compliance evaluation flow
├─> Implement language detection
└─> Design evidence extraction structure
```

**Track B: Frontend Scaffold (2 concurrent)**
```
CGT-010 (UX Designer & Component Developer) [PARALLEL-F]
├─> Implement design system components (from Phase 1 wireframes)
├─> Create data table component (sort, filter, pagination)
├─> Create form patterns (validation, error handling)
├─> Create dashboard KPI widgets
└─> Setup responsive breakpoints

CGT-011 (Navigation Developer) [PARALLEL-G]
├─> Implement routing scaffold
├─> Create RBAC navigation shell
├─> Implement filter persistence (URL state)
├─> Create error boundary patterns
└─> Setup breadcrumb generation
```

**Track C: Testing & Documentation**
```
CGT-014 (Test Automation Engineer)
├─> Write unit tests for auth/RBAC
├─> Write API contract tests
├─> Create integration test framework
└─> Setup E2E test structure

CGT-013 (Technical Writer)
├─> Document API endpoints (as implemented)
├─> Create developer setup guide
├─> Document module boundaries
└─> Collect architecture decisions
```

**Track D: Requirements Lookahead**
```
CGT-015 (Business Analyst)
├─> Refine Phase 3 requirements (pipeline + AI)
├─> Create acceptance criteria for LLM analysis
├─> Document edge cases for social connectors
└─> Create user story backlog for Phase 3
```

#### Synchronization Point: SP-2 (API Contracts Stable)

**Trigger**: API Engineer completes CRUD + Backend Lead + Frontend Lead agree on contracts

**Convergence**:
- CGT-005 (API Engineer): OpenAPI spec stable
- CGT-003 (Backend Lead): Backend contracts approved
- CGT-004 (Frontend Lead): Frontend integration ready

**Unblocks**:
- CGT-010 (UX Designer & Component Developer): Can integrate with real API
- CGT-011 (Navigation Developer): Can implement real data flows

**Gate Check**: QG-2 - Core Backend Ready
- Program Director + QA Architect + Test Automation
- Verify: Auth/RBAC working, CRUD tested, API contracts verified, SOLID compliance

---

### Phase 3: Pipeline Intelligence (Weeks 5-6)

**Objective**: Complete ingestion pipeline, social connectors, LLM analysis

#### Parallel Tracks

**Track A: Social Connectors (concurrent with AI)**
```
CGT-009 (Integration Engineer) [PARALLEL-A]
├─> Implement Facebook connector (posts + comments)
├─> Implement Instagram connector
├─> Implement LinkedIn connector
├─> Implement YouTube connector (videos + comments + transcripts)
├─> Handle parent/child content model
└─> Implement rate limiting and throttling
```

**Track B: Pipeline Completion**
```
CGT-006 (Pipeline Engineer) [PARALLEL-B]
├─> Complete 8-step pipeline orchestration
├─> Implement scheduler (escalation, retention, periodic ingestion)
├─> Integrate with Integration Engineer's connectors
├─> Implement distributed locks (PostgreSQL advisory locks)
├─> Test idempotency across full pipeline
└─> Implement auto-ticket creation
```

**Track C: AI/NLP Implementation**
```
CGT-008 (AI/NLP Engineer) [PARALLEL-C]
├─> Implement compliance prompt templates
├─> Integrate with LLM API (OpenAI)
├─> Implement evidence extraction (field, snippet, offsets)
├─> Implement fix suggestion generation
├─> Implement Uncertain handling
├─> Implement OCR for social media images
├─> Implement PII redaction (data minimization)
└─> Integrate language detection

CGT-016 (Compliance Specialist) [PARALLEL-C-PAIR]
├─> Validate LLM prompts for regulatory accuracy
├─> Define country-specific rule logic
├─> Create edge case catalog
└─> Test compliance analysis outputs
```

**Track D: Data Layer Enhancement**
```
CGT-007 (Data Engineer) [PARALLEL-D]
├─> Implement change detection (hash comparison)
├─> Implement revision management (immutable)
├─> Setup hash-based idempotency
├─> Optimize ES queries for dashboard
└─> Prepare retention job structure
```

**Track E: Frontend Continuation**
```
CGT-010 (UX Designer & Component Developer) [PARALLEL-E]
├─> Implement dashboard KPI components (real data)
├─> Create ticket list views
├─> Create source management wizard UI
└─> Implement responsive tablet layouts

CGT-011 (Navigation Developer) [PARALLEL-F]
├─> Continue navigation flow implementation
├─> Implement deep-link handling
└─> Create access denied / not found pages
```

**Track F: Testing**
```
CGT-014 (Test Automation Engineer)
├─> Write integration tests for pipeline
├─> Create connector mocks for testing
├─> Write E2E tests for ingestion flow
└─> Setup performance test framework
```

#### Synchronization Points

**SP-3: Pipeline-to-Data Handoff Validated**
- **Converges**: CGT-006 (Pipeline) + CGT-007 (Data) + CGT-009 (Integration)
- **Validates**: Data format between fetching → processing → storage

**SP-4: AI-to-Rule Prompts Validated**
- **Converges**: CGT-008 (AI/NLP) + CGT-016 (Compliance Specialist)
- **Validates**: LLM prompts are regulatory accurate

**Gate Check**: QG-3 - Pipeline Operational
- Program Director + QA Architect + Security Reviewer + Compliance Specialist
- Verify: E2E ingestion working, idempotency verified, integration tests passing, prompts validated

---

### Phase 4: Ticketing & Frontend Flows (Weeks 7-8)

**Objective**: Complete ticket lifecycle, implement all 25+ navigation flows

#### Parallel Tracks

**Track A: Backend Ticketing**
```
CGT-005 (API Engineer) [PARALLEL-A]
├─> Implement ticket CRUD endpoints
├─> Implement assignment API
├─> Implement comments API (internal, with attachments)
├─> Implement attachment upload/download
├─> Implement synchronous CSV export (tickets)
├─> Implement CSV export (audit)
└─> Add RBAC enforcement to all endpoints

CGT-006 (Pipeline Engineer) [PARALLEL-B]
├─> Implement auto-ticket creation (idempotent per revision)
├─> Implement 48h escalation logic
├─> Test escalation scheduler
└─> Implement ticket upsert step in pipeline
```

**Track B: Frontend Flows (concurrent)**
```
CGT-010 (UX Designer & Component Developer) [PARALLEL-C]
├─> Implement ticket detail view
├─> Implement source management UI (create/edit)
├─> Implement rule management UI (create/edit/version)
├─> Implement user management UI
├─> Implement system settings UI
├─> Implement audit log viewer UI
└─> Implement tablet adaptations

CGT-011 (Navigation Developer) [PARALLEL-D]
├─> Implement all 25+ documented navigation flows:
│   ├─> AUTH: Login, session timeout
│   ├─> DASHBOARD/TICKETS: Cockpit triage, escalation-first, ticket detail, status updates
│   ├─> SOURCES: Create/edit (Web owned, Web discovered, Social), credential mgmt
│   ├─> INGESTION: Monitor backlog, run detail, error triage/retry
│   ├─> RULES: Create/edit rules, versioning, activate/deactivate
│   ├─> AUDIT: Audit log viewer, retention reports
│   ├─> EXPORT: Filtered CSV exports
│   └─> ADMIN: User management, system settings
├─> Implement RBAC-filtered navigation
├─> Implement filter persistence across routes
└─> Test all deep-link scenarios
```

**Track C: Compliance Validation**
```
CGT-016 (Compliance Specialist) [PARALLEL-E]
├─> Validate country-specific rules
├─> Test multi-jurisdiction scenarios
├─> Create edge case test data
└─> Validate rule versioning behavior
```

**Track D: Testing**
```
CGT-014 (Test Automation Engineer)
├─> Write E2E tests for ticket lifecycle
├─> Write RBAC enforcement tests (all roles)
├─> Test 25+ navigation flows
├─> Write assignment/comment/attachment tests
└─> Test escalation logic
```

**Track E: Documentation**
```
CGT-013 (Technical Writer)
├─> Complete API reference v1.0
├─> Document all user flows
├─> Create user manual draft
└─> Document RBAC patterns
```

**Gate Check**: QG-4 - AI Analysis Validated + Ticketing Complete
- Program Director + Security + Compliance + Business Analyst
- Verify: LLM accuracy validated, evidence correct, data minimization OK, ticket lifecycle working

---

### Phase 5: Governance & Polish (Weeks 9-10)

**Objective**: Implement retention, audit logging, performance optimization, polish

#### Parallel Tracks

**Track A: Backend Governance**
```
CGT-007 (Data Engineer) [PARALLEL-A]
├─> Implement 6-month retention job
├─> Implement retention DELETE jobs (PostgreSQL + file storage)
├─> Implement retention reporting
├─> Test retention across Postgres + file storage
└─> Implement audit log append-only guarantees

CGT-005 (API Engineer) [PARALLEL-B]
├─> Implement audit log viewer API
├─> Implement audit CSV export
├─> Optimize CSV streaming for large exports
└─> Add rate limiting to all endpoints
```

**Track B: Frontend Polish**
```
CGT-010 (UX Designer & Component Developer) [PARALLEL-C]
├─> Implement audit viewer UI
├─> Implement retention reports UI
├─> Complete tablet adaptations
├─> Polish responsive breakpoints
└─> Accessibility improvements (WCAG baseline)

CGT-011 (Navigation Developer) [PARALLEL-D]
├─> Implement error handling (access denied, not found, deleted entities)
├─> Polish navigation transitions
├─> Test all fallback scenarios
└─> Implement tablet touch optimizations
```

**Track C: Performance Testing**
```
CGT-014 (Test Automation Engineer) [PARALLEL-E]
├─> Run performance tests (SLA: 95% < 4h)
├─> Run load tests
├─> Test concurrent user scenarios
├─> Measure query performance
└─> Validate dashboard aggregation performance
```

**Track D: Security Hardening**
```
CGT-018 (Security Reviewer)
├─> Conduct RBAC penetration test
├─> Validate audit trail integrity
├─> Test retention correctness
├─> Verify PII redaction
├─> Check for secret leaks (logs, ES, code)
└─> Validate GDPR compliance
```

**Gate Check**: QG-5 - Frontend Complete
- Program Director + QA Architect + Test Automation
- Verify: All 25+ flows working, RBAC in UI, responsive, E2E tests passing, accessibility

---

### Phase 6: Integration & Release (Week 10)

**Objective**: Final integration, validation, documentation, MVP sign-off

#### Full Team Convergence (SP-5, SP-6)

**Track A: E2E Validation**
```
ALL Backend Agents (CGT-003, 005, 006, 007, 008, 009)
└─> Validate full backend vertical slice

ALL Frontend Agents (CGT-004, 010, 011)
└─> Validate full frontend vertical slice

CGT-014 (Test Automation)
└─> Run full E2E test suite
```

**Track B: Final Documentation**
```
CGT-013 (Technical Writer)
├─> Complete API reference
├─> Complete user manual
├─> Create deployment runbook
├─> Finalize release notes
└─> Compile all ADRs
```

**Track C: Requirements Validation**
```
CGT-015 (Business Analyst)
├─> Validate all acceptance criteria met
├─> Complete requirements traceability matrix
├─> Sign off on functional completeness
└─> Document known limitations
```

**Track D: Final Security Review**
```
CGT-018 (Security Reviewer)
├─> Execute penetration test scenarios
├─> Final RBAC bypass attempts
├─> Audit trail integrity check
├─> GDPR compliance final validation
└─> Sign security approval or VETO
```

**Track E: Final QA Review**
```
CGT-017 (QA Architect)
├─> Architecture conformance validation
├─> SOLID compliance check (import graph)
├─> Specification traceability verification
├─> Code quality assessment
├─> Test coverage validation
└─> Sign quality approval or VETO
```

**Track F: Architecture Sign-Off**
```
CGT-002 (Senior IT Architect)
├─> Validate all module boundaries respected
├─> Review evolution pathway documentation
├─> Verify no critical technical debt
├─> Sign architectural approval
└─> Document post-MVP recommendations
```

**Track G: Final Coordination**
```
CGT-001 (Program Director)
├─> Collect all sign-offs
├─> Execute QG-6 review with all oversight
├─> Make go/no-go decision
├─> Report to stakeholders
└─> Coordinate MVP handoff
```

**Synchronization Point: SP-6 (Release Readiness)**
- **Converges**: ALL 18 AGENTS
- **Validates**: Everything

**Gate Check**: QG-6 - MVP Sign-Off
- ALL OVERSIGHT + Program Director + Sr IT Architect + Business Analyst + Tech Writer
- Verify: Vertical slice complete, security validated, audit intact, SLA met, docs delivered, requirements traced, architecture signed off

---

## Inter-Agent Communication Patterns

### Pattern 1: Handoff with Contract
```
Agent A: Produces deliverable conforming to interface contract
↓
Agent B: Consumes deliverable via interface (no implementation knowledge)
```

**Example**: Integration Engineer → Pipeline Engineer
- Integration Engineer provides normalized content via `IConnector` interface
- Pipeline Engineer doesn't know about Facebook API internals

### Pattern 2: Parallel with Sync Point
```
Agent A [PARALLEL]  ─┐
Agent B [PARALLEL]  ─┼─> Sync Point → Validation → Proceed
Agent C [PARALLEL]  ─┘
```

**Example**: SP-3 (Pipeline-to-Data)
- Pipeline Engineer, Data Engineer, Integration Engineer work in parallel
- Sync at SP-3 to validate handoff format
- All three must approve before proceeding

### Pattern 3: Continuous Collaboration
```
Agent A (Specialist): Implements feature
    ↓ (continuous)
Agent B (Oversight): Reviews in real-time, provides guidance
```

**Example**: Any Specialist + QA Architect
- Specialist works on implementation
- QA Architect reviews continuously, catches issues early
- No blocking until gate review

### Pattern 4: Lookahead Pipeline
```
Phase N: Agent A executes
Phase N+1: Agent B refines requirements for Phase N+2
```

**Example**: Business Analyst
- While Phase 2 executes, BA refines Phase 3 requirements
- Requirements ready when Phase 3 starts

---

## Conflict Resolution

### Level 1: Peer Resolution
Agents at same level try to resolve first
- Backend specialists coordinate via Backend Lead
- Frontend specialists coordinate via Frontend Lead

### Level 2: Coordinator Escalation
If peers cannot resolve, escalate to coordinator
- Backend Lead or Frontend Lead makes decision
- Documented in meeting notes

### Level 3: Architectural Escalation
If touches architecture, escalate to Senior IT Architect
- IT Architect reviews against SOLID principles
- Makes binding architectural decision (ADR)

### Level 4: Program Director Escalation
If cross-domain or impacts timeline/scope
- Program Director makes final decision
- May convene review with affected agents

### Veto Override
QA Architect or Security Reviewer veto
- Cannot be overridden by any agent
- Only human stakeholder can override (extreme circumstances)

---

## Success Metrics

### Coordination Effectiveness
- All 6 phases completed in 10 weeks ✓
- All sync points executed successfully ✓
- Zero critical blockers at MVP sign-off ✓

### Quality Metrics
- All 6 quality gates passed ✓
- Zero SOLID violations at QG-6 ✓
- Test coverage >80% ✓
- SLA target met (95% < 4h) ✓

### Security Metrics
- Zero critical vulnerabilities ✓
- RBAC bypass attempts all blocked ✓
- No secrets exposed ✓
- Audit trail integrity 100% ✓

### Documentation Metrics
- All ADRs published ✓
- API reference complete ✓
- User manual delivered ✓
- Deployment runbook ready ✓

---

## Tools for Coordination

### Communication
- ADRs for architectural decisions
- Meeting notes for sync points
- OpenAPI spec for API contracts
- Interface contracts for module boundaries

### Tracking
- Quality gate checklists
- Sync point criteria
- Deliverable status board
- Blocker escalation log

### Validation
- Import graph analysis (SOLID)
- API contract tests
- Integration tests
- E2E tests
- Security penetration tests

---

**This coordination model ensures all 18 agents work effectively in parallel while maintaining quality, security, and architectural integrity throughout the MVP delivery.**
