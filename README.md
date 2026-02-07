# Content Guardian Tower

Piattaforma AI-first per il monitoraggio, analisi e governance della compliance dei contenuti digitali (web e social) su scala multi-paese.

## Architettura

Due componenti applicativi + PostgreSQL, deployati via docker-compose:

- **Backend** (`backend/`): Processo Node.js unico — Fastify REST API + pgboss worker + scheduler interno
- **Frontend** (`frontend/`): React SPA servita da Vite

PostgreSQL gestisce tutto: dati relazionali, job queue (pgboss), full-text search (tsvector + GIN), advisory lock per lo scheduler.

### Stack Tecnologico

- **Backend**: Node.js 20 LTS + TypeScript 5 (Fastify 5, Prisma ORM, pgboss)
- **Frontend**: React 18 + TypeScript 5 (Vite, React Context)
- **Data**: PostgreSQL 15 (system of record + queue + search)
- **AI/NLP**: OpenAI SDK
- **Testing**: Vitest, Playwright
- **Infrastructure**: Docker Compose (3 container)

## Quick Start

### Prerequisiti

- Docker >= 20.10 + Docker Compose >= 2.0
- Node.js >= 20 LTS (per sviluppo locale)

### Setup

```bash
git clone <repository-url>
cd ContentGuardianTower
cp .env.example .env
# Editare .env con le credenziali

docker compose up -d        # Avvia postgres, backend, frontend
docker compose ps            # Verifica stato
docker compose logs -f       # Visualizza log
```

### Accesso

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000

## Sviluppo

```bash
# Backend (da backend/)
npm run dev                  # API + worker in un processo
npm test                     # Vitest
npx prisma migrate dev       # Migrazioni
npx prisma db seed           # Dati iniziali

# Frontend (da frontend/)
npm run dev                  # Vite dev server
npm test                     # Test
npm run build                # Build produzione

# E2E
npx playwright test

# Quality
npm run lint && npm run typecheck
```

## Database

```bash
# Connettersi a PostgreSQL
docker compose exec postgres psql -U cgt_user -d content_guardian_tower

# Backup
docker compose exec postgres pg_dump -U cgt_user content_guardian_tower > backup.sql
```

## Documentazione

- **[CLAUDE.md](./CLAUDE.md)**: Guida architetturale per Claude Code
- **[docs/](./docs/)**: Requisiti e specifiche MVP

## Fasi MVP

| Fase | Settimane | Focus |
|------|-----------|-------|
| 1 | 1-2 | Foundation: schema, API contracts, module boundaries |
| 2 | 3-4 | Core Backend + Frontend Scaffold: Auth, RBAC, CRUD |
| 3 | 5-6 | Pipeline Intelligence: Connettori social, LLM, scheduler |
| 4 | 7-8 | Ticketing & Frontend Flows: 25+ navigation flows |
| 5 | 9-10 | Governance & Polish: Retention, audit, performance |
| 6 | 10 | Integration & Release: E2E validation, security review |

## Troubleshooting

```bash
# Container non si avviano
docker compose logs
lsof -i :3000    # API
lsof -i :5173    # Frontend
lsof -i :5432    # PostgreSQL

# Database connection errors
docker compose exec postgres pg_isready -U cgt_user
```
