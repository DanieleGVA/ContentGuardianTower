# Content Guardian Tower - Agent Registry

This document lists all 18 agents in the multi-agent development architecture for CGT MVP.

## Team Structure

### Leadership Tier (4 agents)
Coordinate workstreams, define architecture, ensure quality.

| ID | Name | Role | Supervises |
|----|------|------|------------|
| CGT-001 | Program Director | Master Orchestrator, Planner & QC | All agents |
| CGT-002 | Senior IT Architect | SOLID, Scalability & Modular Design | Backend Lead, Frontend Lead (oversight) |
| CGT-003 | Backend Lead | Backend Domain Coordinator | CGT-005, 006, 007, 008, 009 |
| CGT-004 | Frontend Lead | Frontend Domain Coordinator | CGT-010, 011 |

### Specialist Tier (12 agents)
Implement specific technical domains.

#### Backend Specialists (5)
| ID | Name | Role |
|----|------|------|
| CGT-005 | API Engineer | API Server & RBAC Implementation |
| CGT-006 | Pipeline Engineer | Worker Service, Job Orchestration & Scheduler |
| CGT-007 | Data Engineer | Data Layer, Search & Retention |
| CGT-008 | AI/NLP Engineer | LLM Compliance Analysis & Language Processing |
| CGT-009 | Integration Engineer | Channel Connectors & Content Ingestion |

#### Frontend Specialists (2)
| ID | Name | Role |
|----|------|------|
| CGT-010 | UX Designer & Component Developer | UX Design, Design System, Dashboard & Interactive Components |
| CGT-011 | Navigation & Flow Developer | Routing, RBAC Navigation & Error Handling |

#### Cross-Functional Specialists (5)
| ID | Name | Role |
|----|------|------|
| CGT-012 | DevOps Engineer | Infrastructure, Containerization & Deployment |
| CGT-013 | Technical Writer | Documentation, Stakeholder Communication |
| CGT-014 | Test Automation Engineer | Test Strategy, Automated Testing & SLA Validation |
| CGT-015 | Business Analyst | Requirements Refinement, Gap Analysis |
| CGT-016 | Compliance & i18n Specialist | Regulatory Domain Expert & Internationalization |

### Oversight Tier (2 agents)
Review all deliverables, enforce quality and security standards. **VETO POWER**.

| ID | Name | Role | Authority |
|----|------|------|-----------|
| CGT-017 | QA Architect | Architecture Conformance & Code Quality | VETO on quality issues |
| CGT-018 | Security Reviewer | Security, Data Protection & Compliance | VETO on security issues |

## Parallel Execution Model

### Workstream Organization

#### BACKEND Workstream
- **Agents**: CGT-003 (Lead), CGT-005, CGT-006, CGT-007, CGT-008, CGT-009
- **Parallelism**: 5 specialists work concurrently on different modules
- **Key Sync**: Data Engineer delivers schema first (SP-1)

#### FRONTEND Workstream
- **Agents**: CGT-004 (Lead), CGT-010, CGT-011
- **Parallelism**: Components and navigation developed concurrently
- **Key Sync**: Starts Phase 2 once API contracts stable (SP-2)

#### CROSS-FUNCTIONAL Workstream
- **Agents**: CGT-012, CGT-013, CGT-014, CGT-015, CGT-016
- **Parallelism**: All 5 operate continuously across other streams
- **Pattern**: Business Analyst works one phase ahead

#### OVERSIGHT Workstream
- **Agents**: CGT-017, CGT-018
- **Parallelism**: Both review across all streams simultaneously
- **Pattern**: Provide early guidance, veto authority always active

## Synchronization Points (SP)

Critical convergence points where parallel work must sync:

| SP | Name | Converges | Blocks | Owner |
|----|------|-----------|--------|-------|
| SP-1 | Schema Ready | Data Engineer + Sr IT Architect | All backend specialists | CGT-001, CGT-003 |
| SP-2 | API Contracts | API Engineer + Backend + Frontend Leads | Frontend track | CGT-001, CGT-003, CGT-004 |
| SP-3 | Pipeline-to-Data | Pipeline + Data + Integration Engineers | E2E ingestion | CGT-003 |
| SP-4 | AI-to-Rule | AI/NLP + Compliance Specialist | Integration testing | CGT-008, CGT-016 |
| SP-5 | E2E Integration | All Backend + All Frontend + Test | Phase 6 | CGT-001 |
| SP-6 | Release Readiness | All 18 agents | Production deployment | CGT-001 |

## Quality Gates (QG)

| Gate | Checkpoint | Reviewers |
|------|-----------|-----------|
| QG-1 | Foundation Complete | Program Dir + Sr IT Arch + Security |
| QG-2 | Core Backend Ready | Program Dir + QA Arch + Test Autom |
| QG-3 | Pipeline Operational | Program Dir + QA + Security + Compliance |
| QG-4 | AI Analysis Validated | Program Dir + Security + Compliance + BA |
| QG-5 | Frontend Complete | Program Dir + QA + Test Autom |
| QG-6 | MVP Sign-Off | ALL OVERSIGHT + Program Dir + Sr IT Arch + BA + Tech Writer |

## Agent Collaboration Patterns

### Pipeline Assembly
- **Agents**: CGT-006 (Pipeline) + CGT-009 (Integration) + CGT-007 (Data)
- **Mode**: Real-time concurrent development against shared contracts

### Compliance Intelligence
- **Agents**: CGT-008 (AI/NLP) + CGT-016 (Compliance) + CGT-015 (BA)
- **Mode**: Iterative loop - BA refines rules, Compliance validates, AI/NLP implements

### Frontend Pair
- **Agents**: CGT-010 (UX Design + Components) + CGT-011 (Navigation)
- **Mode**: CGT-010 designs first (wireframes, patterns) → shared contract → both implement in parallel

### Test-Driven Development
- **Agents**: CGT-014 (Test) + any Specialist
- **Mode**: Concurrent - tests written while feature is implemented

### Architecture Governance
- **Agents**: CGT-002 (IT Architect) + CGT-017 (QA Architect)
- **Mode**: Continuous - IT defines standards, QA validates across all streams

### Requirements Pipeline
- **Agents**: CGT-015 (BA) + CGT-001 (Program Director)
- **Mode**: Lookahead - BA refines Phase N+1 while Director manages Phase N

### Documentation Stream
- **Agents**: CGT-013 (Tech Writer) + all agents
- **Mode**: Continuous collection - observes all streams, produces docs without blocking

## Agent Activation Guide

### Phase 1: Foundation (Weeks 1-2)
**Active Agents**: CGT-001, 002, 003, 004, 007, 010, 012, 013, 014, 015, 016, 018
- Program Director defines master plan
- Sr IT Architect defines module boundaries
- Business Analyst analyzes source documents
- DevOps Engineer sets up docker-compose
- Data Engineer implements schema
- Backend/Frontend Leads define contracts
- UX Designer creates design system, wireframes, and interaction patterns
- Technical Writer sets up documentation framework
- Test Automation sets up test infrastructure

### Phase 2: Core Backend + Frontend Scaffold (Weeks 3-4)
**Active Agents**: CGT-001, 003, 004, 005, 006, 007, 009, 010, 011, 014, 015, 017
- Backend Lead coordinates backend specialists working in parallel
- Frontend Lead coordinates frontend start against API contracts
- Test Automation creates test framework

### Phase 3: Pipeline Intelligence (Weeks 5-6)
**Active Agents**: CGT-001, 003, 004, 006, 007, 008, 009, 010, 014, 015, 016, 018
- Backend Lead coordinates social connectors and AI/NLP in parallel
- Frontend Lead coordinates continued frontend work
- Compliance validates LLM prompts

### Phase 4: Ticketing, Frontend Flows & Compliance (Weeks 7-8)
**Active Agents**: CGT-001, 003, 004, 005, 006, 010, 011, 013, 014, 015, 016, 017
- Backend Lead coordinates ticket APIs
- Frontend Lead coordinates frontend flows
- Technical Writer produces API reference v1

### Phase 5: Governance, Polish & Performance (Weeks 9-10)
**Active Agents**: CGT-001, 003, 004, 005, 007, 010, 011, 014, 018
- Backend Lead coordinates governance implementation
- Frontend Lead coordinates polish
- Performance testing concurrent

### Phase 6: Integration & Release (Week 10)
**Active Agents**: ALL 18 AGENTS
- Final convergence
- All quality gates passed
- Security validated
- Documentation delivered

## Usage in Claude Code

Agents can be invoked via slash commands or direct prompts. See [README.md](./README.md) for the complete guide.

```
/task create the login API endpoint
/coordinate implement the authentication system with RBAC
/plan-phase
```

Or use direct prompts:

```
"Act as CGT-007 (Data Engineer). Design the PostgreSQL schema..."
"Act as CGT-017 (QA Architect). Review this code for SOLID compliance..."
```

Claude Code supports real parallel execution via the Task tool, enabling concurrent agent workstreams.
