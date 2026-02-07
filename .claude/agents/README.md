# Content Guardian Tower - Multi-Agent Architecture

This directory contains the 18-agent development architecture for the CGT MVP.

## How Agents Work

The 18 agents are **role-based workflows**, not separate AI instances. Claude Code uses them as specialized instruction sets to produce high-quality, domain-specific output.

### Invoking Agents

**Slash Commands** (recommended for common workflows):

| Command | Agent | Purpose |
|---------|-------|---------|
| `/task [description]` | Auto-detected | Simple tasks with auto-routing |
| `/coordinate [description]` | CGT-001 | Complex multi-agent coordination |
| `/execute-plan` | Orchestrator | Execute a plan from `/coordinate` |
| `/plan-phase` | CGT-001 | Plan an entire MVP phase |
| `/architecture-review` | CGT-002 | SOLID and module boundary review |
| `/qa-review` | CGT-017 | Quality and conformance review |
| `/security-review` | CGT-018 | Security and compliance review |
| `/design-schema` | CGT-007 | Database schema design |
| `/design-ui` | CGT-010 | UX design for screens and components |

**Direct prompts** (for more control):

```
"Act as CGT-007 (Data Engineer). Design the PostgreSQL schema
following the requirements in docs/database_schema (1).docx"

"Act as CGT-017 (QA Architect). Review this code for SOLID compliance
using the checklist in .claude/agents/oversight/OVERSIGHT_SUMMARY.md"
```

**Parallel execution**: Claude Code supports real subagent parallelism via the Task tool. The `/coordinate` + `/execute-plan` workflow leverages this to run independent agent tracks concurrently.

## Agent Registry

### Leadership Tier (4)

| ID | Name | Role | Supervises |
|----|------|------|------------|
| CGT-001 | Program Director | Master Orchestrator, Planner & QC | All agents |
| CGT-002 | Senior IT Architect | SOLID, Scalability & Modular Design | Backend Lead, Frontend Lead |
| CGT-003 | Backend Lead | Backend Domain Coordinator | CGT-005 to CGT-009 |
| CGT-004 | Frontend Lead | Frontend Domain Coordinator | CGT-010, CGT-011 |

### Specialist Tier (12)

**Backend (5)**:

| ID | Name | Focus |
|----|------|-------|
| CGT-005 | API Engineer | REST API, RBAC, authentication (Fastify + TypeScript) |
| CGT-006 | Pipeline Engineer | State machine, pgboss job queue, scheduler |
| CGT-007 | Data Engineer | PostgreSQL (Prisma), full-text search, retention |
| CGT-008 | AI/NLP Engineer | LLM integration (OpenAI), compliance analysis |
| CGT-009 | Integration Engineer | Channel connectors (Web, Facebook, Instagram, LinkedIn, YouTube) |

**Frontend (2)**:

| ID | Name | Focus |
|----|------|-------|
| CGT-010 | UX Designer & Component Developer | UX design, React design system, components, responsive |
| CGT-011 | Navigation Developer | React Router, 25+ navigation flows, RBAC UI |

**Cross-Functional (5)**:

| ID | Name | Focus |
|----|------|-------|
| CGT-012 | DevOps Engineer | Docker, deployment, infrastructure |
| CGT-013 | Technical Writer | API reference, runbooks, ADRs |
| CGT-014 | Test Automation Engineer | Vitest, Playwright, performance testing |
| CGT-015 | Business Analyst | Requirements, acceptance criteria |
| CGT-016 | Compliance Specialist | Regulatory accuracy, i18n |

### Oversight Tier (2) - VETO POWER

| ID | Name | Authority |
|----|------|-----------|
| CGT-017 | QA Architect | Can block any release on quality/conformance issues |
| CGT-018 | Security Reviewer | Can block any release on security/compliance issues |

Veto decisions cannot be overridden except by human stakeholders.

## Workflow

### Simple Task

```
/task create the login API endpoint
```

The system auto-detects keywords, routes to the right agent (CGT-005), executes the task, and includes QA/Security review automatically.

### Complex Task

```
/coordinate implement the authentication system with RBAC
```

The Program Director (CGT-001) analyzes the task, identifies required agents, creates a delegation plan with parallel tracks and sync points. Then:

```
/execute-plan
```

Executes the plan, simulating each agent in sequence or parallel as specified.

### Phase Planning

```
/plan-phase
```

Plans an entire MVP phase with all parallel tracks, agent assignments, sync points, and quality gate criteria.

## Development Phases

| Phase | Weeks | Focus | Key Agents |
|-------|-------|-------|------------|
| 1 | 1-2 | Foundation | CGT-001, 002, 003, 004, 007, 010, 012, 013, 014, 015, 016, 018 |
| 2 | 3-4 | Core Backend + Frontend Scaffold | CGT-001, 003, 004, 005, 006, 007, 009, 010, 011, 014, 015, 017 |
| 3 | 5-6 | Pipeline Intelligence | CGT-001, 003, 004, 006, 007, 008, 009, 010, 014, 015, 016, 018 |
| 4 | 7-8 | Ticketing & Frontend Flows | CGT-001, 003, 004, 005, 006, 010, 011, 013, 014, 015, 016, 017 |
| 5 | 9-10 | Governance & Polish | CGT-001, 003, 004, 005, 007, 010, 011, 014, 018 |
| 6 | 10 | Integration & Release | ALL 18 AGENTS |

## Synchronization Points

| SP | Phase | Gate | Converges | Blocks |
|----|-------|------|-----------|--------|
| SP-1 | 1 | Schema Ready | Data Engineer + IT Architect | All backend specialists |
| SP-2 | 2 | API Contracts | API + Backend + Frontend Leads | Frontend track |
| SP-3 | 3 | Pipeline-to-Data | Pipeline + Data + Integration | E2E ingestion |
| SP-4 | 3 | AI-to-Rule | AI/NLP + Compliance | Integration testing |
| SP-5 | 6 | E2E Integration | All Backend + Frontend + Test | Phase 6 |
| SP-6 | 6 | Release Readiness | ALL 18 AGENTS | Production |

## Quality Gates

| Gate | Focus | Reviewers |
|------|-------|-----------|
| QG-1 | Foundation (Docker, schema, ES, contracts) | Director + Architect + Security |
| QG-2 | Core Backend (Auth/RBAC, CRUD, SOLID) | Director + QA + Test |
| QG-3 | Pipeline (E2E ingestion, idempotency) | Director + QA + Security + Compliance |
| QG-4 | AI Analysis (LLM accuracy, PII redaction) | Director + Security + Compliance + BA |
| QG-5 | Frontend (25+ flows, RBAC UI, responsive) | Director + QA + Test |
| QG-6 | MVP Sign-Off (full vertical slice) | ALL OVERSIGHT + Director + Architect + BA + Writer |

## Collaboration Patterns

- **Pipeline Assembly**: CGT-006 + CGT-009 + CGT-007 - concurrent development against shared contracts
- **Compliance Intelligence**: CGT-008 + CGT-016 + CGT-015 - iterative refinement loop
- **Frontend Pair**: CGT-010 + CGT-011 - CGT-010 designs then both build in parallel
- **Test-Driven**: CGT-014 + any Specialist - tests written concurrently with features
- **Architecture Governance**: CGT-002 + CGT-017 - continuous standards enforcement
- **Requirements Pipeline**: CGT-015 + CGT-001 - BA refines Phase N+1 during Phase N

## Documentation Map

```
.claude/agents/
  README.md                  <-- you are here
  AGENT_REGISTRY.md          <-- full agent list with parallel execution model
  AGENT_COORDINATION.md      <-- phase-by-phase coordination (detailed)
  leadership/                <-- 4 leadership agent specifications
  specialist/                <-- 12 specialist agent summaries
  oversight/                 <-- 2 oversight agent specifications (VETO)
```

For detailed phase coordination, see [AGENT_COORDINATION.md](./AGENT_COORDINATION.md).
For agent responsibilities and supervision chains, see [AGENT_REGISTRY.md](./AGENT_REGISTRY.md).
