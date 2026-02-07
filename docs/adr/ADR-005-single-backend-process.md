# ADR-005: Single Backend Process

**Status**: Accepted
**Date**: 2026-02-07
**Decision Makers**: CGT-001 (Program Director), CGT-002 (Senior IT Architect)

## Context

The source architecture (Operational Architecture document) prescribes two separate backend services deployed as independent Docker containers:

1. **API Server** -- REST API serving HTTP requests, handling authentication, CRUD operations, and synchronous CSV export.
2. **Worker Service** -- Async job orchestration running the 8-step ingestion state machine, LLM analysis, scheduled tasks (escalation, retention), and background processing.

This separation provides independent scaling (scale workers without scaling API), independent deployment (deploy worker fixes without API downtime), and process isolation (a worker crash does not affect API availability).

However, for the MVP:

- Job volume is <1,000 jobs/day, well within a single process's capacity.
- The API and worker share the same database, same business logic modules, and same configuration.
- Running two separate containers doubles the operational surface: two sets of logs, two health checks, two deployment pipelines, two sets of environment variables to manage.
- The development team is small and benefits from a simpler local development experience.

## Decision

Run the Fastify API server and pgboss worker in a **single Node.js process** within one Docker container. The source code is organized to preserve clean separation for future extraction:

```
backend/
  src/
    api/           # Fastify routes, middleware, request handlers
      routes/
      middleware/
      plugins/
    worker/        # pgboss job handlers, scheduler
      handlers/
      scheduler/
    modules/       # Shared business logic (auth, ingestion, analysis, etc.)
    shared/        # Cross-cutting concerns (logging, config, errors)
    index.ts       # Single entry point: starts Fastify + pgboss
```

### How It Works

The single `index.ts` entry point:

1. Initializes the database connection (Prisma client).
2. Starts the Fastify HTTP server (API routes, middleware, validation).
3. Starts pgboss (connects to PostgreSQL, begins polling for jobs).
4. Registers job handlers from `worker/handlers/`.
5. Starts the scheduler (periodic tasks: escalation check, retention, source ingestion).

Both the API and worker import business logic from the shared `modules/` directory. The API layer translates HTTP requests into module calls. The worker layer translates job payloads into module calls. Neither the API nor the worker contains business logic directly.

### Extraction Path

When scaling demands separation, the extraction is straightforward:

1. Create a second `Dockerfile` with a different entry point (`worker-main.ts` that starts only pgboss, not Fastify).
2. Add the worker container to `docker-compose.yml`.
3. No changes to business logic, database access, or module code.

This works because the API and worker already communicate exclusively through the database (pgboss job queue in PostgreSQL), not through shared memory or direct function calls.

## Consequences

### Positive
- **Simpler deployment**: One container to build, deploy, monitor, and debug instead of two.
- **Simpler development**: `npm run dev` starts everything. No need to run multiple processes locally.
- **Shared startup**: Database connection pool, configuration loading, and Prisma client are initialized once and shared between API and worker, reducing resource usage.
- **Faster feedback loop**: Changes to shared modules are immediately reflected in both API and worker without restarting multiple processes.
- **Reduced infrastructure**: One health check endpoint, one log stream, one set of environment variables.

### Negative
- **Shared process memory**: A memory leak in the worker can affect API responsiveness and vice versa. Mitigation: monitor memory usage and set appropriate Node.js heap limits (`--max-old-space-size`).
- **No independent scaling**: Cannot scale workers independently of the API. Mitigation: at MVP scale (<1,000 jobs/day), a single process handles both workloads comfortably. The extraction path (above) enables independent scaling when needed.
- **Coupled availability**: If the process crashes, both API and worker are down simultaneously. Mitigation: Docker restart policy (`restart: unless-stopped`) ensures rapid recovery. For MVP, brief downtime is acceptable.
- **CPU contention**: A CPU-intensive worker job (e.g., large CSV export) could increase API response latency. Mitigation: use streaming for large operations and consider Node.js worker threads for CPU-bound tasks.

### Risks
- **Event loop blocking**: Long-running synchronous operations in worker jobs could block the event loop and degrade API performance. Mitigation: all I/O operations use async/await. CPU-intensive operations (hashing, CSV generation) should use streaming or worker threads.
- **Graceful shutdown complexity**: The process must gracefully shut down both Fastify and pgboss, completing in-flight requests and jobs before exiting. Mitigation: implement proper signal handling (SIGTERM, SIGINT) that stops accepting new requests/jobs, waits for in-flight work to complete, then exits.
- **Delayed extraction**: The convenience of a single process might delay the decision to extract the worker even when scale demands it. Mitigation: monitor job processing latency and API response times. If P95 API latency exceeds 500ms due to worker contention, trigger extraction.

## Alternatives Considered

1. **Separate API and Worker containers (as per source architecture)**: Two independent Node.js processes in separate Docker containers communicating via the PostgreSQL job queue. Rejected for MVP because the operational overhead (two containers, two log streams, two health checks, two deployment pipelines) is not justified by the expected job volume. The code organization preserves the ability to make this switch later.

2. **Single container with two processes (e.g., using pm2)**: Run both API and worker as separate Node.js processes inside a single Docker container, managed by a process manager like pm2. Rejected because this provides the complexity of two processes (separate logs, separate memory spaces, process manager configuration) without the benefits of separate containers (independent scaling, independent deployment). It is the worst of both approaches.

3. **Serverless functions for worker jobs**: Deploy worker job handlers as serverless functions (AWS Lambda, Google Cloud Functions) triggered by queue events. Rejected because the project targets on-premise, single-tenant deployment where serverless platforms are not available.
