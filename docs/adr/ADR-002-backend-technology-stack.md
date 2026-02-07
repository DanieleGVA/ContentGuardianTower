# ADR-002: Backend Technology Stack

**Status**: Accepted
**Date**: 2026-02-07
**Decision Makers**: CGT-001 (Program Director), CGT-002 (Senior IT Architect)

## Context

The source documents (Operational Architecture, Project Document) reference "Python/Node.js" as the backend technology without committing to a specific stack. For MVP velocity, the team must select a single backend language, runtime, HTTP framework, and database access layer. The choice must support:

- Type-safe API development with request/response validation.
- Efficient async I/O for web scraping and external API calls.
- A shared type system with the frontend to minimize contract drift.
- Mature ecosystem for PostgreSQL access, job queues, and LLM integration.
- Developer productivity for a small team building rapidly.

## Decision

The backend technology stack is:

- **Runtime**: Node.js 20 LTS (Long Term Support until April 2026).
- **Language**: TypeScript 5 with strict mode enabled (`strict: true`, `noUncheckedIndexedAccess: true`).
- **HTTP Framework**: Fastify 5 as the HTTP server framework.
- **Database Access**: Prisma ORM for type-safe database queries and schema migrations.
- **Validation**: Fastify's built-in JSON Schema validation with `@sinclair/typebox` for schema-as-code.
- **Testing**: Vitest as the test runner (compatible with Vite on the frontend).

### Rationale

**TypeScript over Python**: Using TypeScript on both backend and frontend enables shared type definitions (e.g., API request/response types, RBAC role enums, ticket status enums). This eliminates an entire class of contract drift bugs. Python would require maintaining separate type definitions (e.g., Pydantic models) and an OpenAPI code generation step.

**Fastify over Express/NestJS**: Fastify is the fastest mainstream Node.js HTTP framework, with built-in support for JSON Schema validation and serialization. Unlike Express, validation is declarative and integrated into the routing layer. Unlike NestJS, Fastify avoids the overhead of decorators and dependency injection containers, which add complexity without proportional benefit for an MVP.

**Prisma over TypeORM/Knex/raw SQL**: Prisma provides a type-safe query builder generated from the schema, automatic migration generation, and an intuitive schema definition language. TypeORM has a history of TypeScript type mismatches. Knex requires manual type definitions. Raw SQL is error-prone at scale.

## Consequences

### Positive
- Shared TypeScript types between frontend and backend eliminate contract drift.
- Fastify's built-in validation catches malformed requests before they reach business logic.
- Prisma generates type-safe client code from the database schema, catching query errors at compile time.
- Node.js 20 LTS provides stable async/await patterns ideal for I/O-heavy workloads (scraping, API calls, LLM requests).
- Vitest provides fast, modern test execution with TypeScript support out of the box.
- Single language across the stack simplifies tooling, CI/CD, and developer onboarding.

### Negative
- Node.js is single-threaded; CPU-intensive operations (e.g., large CSV generation) can block the event loop. Mitigation: use worker threads or streaming for heavy operations.
- Prisma ORM adds a query engine binary to the container, increasing image size by ~15-20MB.
- Prisma's query API, while type-safe, can be less flexible than raw SQL for complex analytical queries. Mitigation: Prisma supports `$queryRaw` for escape-hatch queries.
- TypeScript strict mode increases initial development effort (every type must be explicit). This is intentional -- the upfront cost pays off in fewer runtime errors.

### Risks
- **Prisma migration conflicts**: If multiple developers modify the schema concurrently, Prisma migrations can conflict. Mitigation: schema changes are serialized through sync points (SP-1 Schema Ready).
- **Node.js memory limits**: Large ingestion batches could exceed default heap limits. Mitigation: configure `--max-old-space-size` appropriately and use streaming patterns for large data sets.
- **LLM client library maturity**: The OpenAI Node.js SDK is well-maintained, but alternative LLM providers may have less mature Node.js clients. Mitigation: wrap LLM calls behind an adapter interface (per ADR-001 module boundaries).

## Alternatives Considered

1. **Python 3.12 + FastAPI + SQLAlchemy**: Strong option with excellent async support and mature data science ecosystem. Rejected because it requires maintaining two separate type systems (Python types + TypeScript types for frontend), adding an OpenAPI code generation step to keep them synchronized. For an MVP with a small team, the single-language advantage of TypeScript outweighs Python's ecosystem benefits.

2. **Node.js + Express + TypeORM**: Express is the most popular Node.js framework but lacks built-in validation and serialization. TypeORM has known issues with TypeScript type accuracy. Both are more established but provide weaker guarantees than the chosen stack.

3. **Node.js + NestJS + Prisma**: NestJS provides a structured, opinionated framework with dependency injection. Rejected because the decorator-heavy, Angular-inspired architecture adds conceptual overhead and boilerplate that is disproportionate for an MVP. Fastify's plugin system provides sufficient modularity without the ceremony.

4. **Deno or Bun**: Modern runtimes with TypeScript support. Rejected due to ecosystem maturity concerns -- many npm packages and deployment tools assume Node.js. The risk of encountering compatibility issues outweighs the marginal performance benefits.
