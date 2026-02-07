# ADR-003: Frontend Technology Stack

**Status**: Accepted
**Date**: 2026-02-07
**Decision Makers**: CGT-001 (Program Director), CGT-002 (Senior IT Architect)

## Context

The source documents (Operational Architecture, Navigation Flows) reference "React/Vue" as the frontend framework without committing to a specific choice. The frontend must support:

- 25+ navigation flows documented in the Navigation Flows specification.
- Responsive design for desktop (>=1024px) and tablet (768-1023px) breakpoints.
- RBAC-driven navigation that dynamically filters menu items and routes based on user role and country scope.
- URL-based filter persistence for deep-linking and shareable views.
- Form-heavy interfaces for source configuration, rule management, ticket management, and user administration.
- Table-heavy interfaces for ticket lists, audit logs, ingestion runs, and CSV export previews.

The team needs to commit to a single framework, build tool, routing solution, and state management approach for MVP development.

## Decision

The frontend technology stack is:

- **Framework**: React 18 with functional components and hooks.
- **Language**: TypeScript 5 with strict mode (shared `tsconfig` base with backend).
- **Build Tool**: Vite 5 for development server and production builds.
- **Routing**: React Router v6 with data loaders for route-level data fetching.
- **State Management**:
  - React Context for global state (auth session, theme, user preferences).
  - URL search params (via React Router) for filter/pagination state.
  - Local component state (`useState`, `useReducer`) for form state.
  - No external state management library (no Redux, Zustand, or Jotai).
- **HTTP Client**: Fetch API with a thin typed wrapper for API calls.
- **Styling**: CSS Modules or a utility-first CSS approach (to be finalized during implementation).
- **Testing**: Vitest for unit tests, React Testing Library for component tests.

### Rationale

**React over Vue**: React has a larger ecosystem, more third-party component libraries (tables, forms, charts), and a larger talent pool. The JSX/TSX authoring model provides stronger TypeScript integration than Vue's SFC (Single File Component) format. React's hooks model aligns well with the composition patterns needed for RBAC-aware components.

**Vite over Webpack/CRA**: Vite provides near-instant hot module replacement (HMR) during development and fast production builds using Rollup. Create React App is deprecated. Webpack requires significant configuration for comparable performance.

**React Context over Redux/Zustand**: The MVP has limited global state requirements -- primarily the authenticated user session, theme preference, and RBAC role. React Context handles these cases without the boilerplate of external state management. Filter state is managed via URL params (not global state), and form state is local. If state management needs grow post-MVP, Zustand can be added incrementally without refactoring existing Context usage.

**URL params for filters**: The Navigation Flows document specifies that filter state should be shareable via URL. Using React Router's search params as the source of truth for filters ensures deep-linking works, browser back/forward navigation preserves filter state, and users can bookmark or share filtered views.

## Consequences

### Positive
- Shared TypeScript configuration and type definitions between frontend and backend reduce contract drift.
- Vite's fast HMR provides sub-second feedback during development, improving iteration speed.
- React Router v6's nested routes map cleanly to the navigation group structure (Operate, Monitor, Configure, Govern, Report).
- URL-based filter state enables deep-linking out of the box, satisfying the Navigation Flows requirement.
- No external state management library reduces bundle size and conceptual overhead.
- Vitest provides consistent test runner semantics across frontend and backend.

### Negative
- React Context can cause unnecessary re-renders if not structured carefully (e.g., splitting auth context from theme context). Mitigation: use separate context providers for independent concerns.
- No dedicated data-fetching library (like React Query/TanStack Query) means manual cache invalidation for API responses. Mitigation: if caching becomes a pain point, TanStack Query can be added incrementally.
- React 18 does not include a built-in form library; form validation must be handled manually or with a library like React Hook Form. Decision deferred to implementation phase.

### Risks
- **Context performance at scale**: If the number of context providers grows, deeply nested provider trees can become unwieldy. Mitigation: limit context to truly global concerns (auth, theme); use prop drilling or composition for component-level state.
- **Missing data-fetching layer**: Without TanStack Query, loading/error/caching states must be managed manually in each route loader. Mitigation: create a shared `useApiQuery` hook that encapsulates loading/error patterns.
- **Styling decision deferred**: Not committing to a styling approach now could lead to inconsistency. Mitigation: finalize styling approach in the first week of frontend development (Phase 2).

## Alternatives Considered

1. **Vue 3 + TypeScript + Vite**: Vue 3 with Composition API provides a similar developer experience to React hooks. Rejected because Vue's TypeScript integration in SFCs, while improved, is less mature than React's JSX/TSX integration. The Vue ecosystem has fewer production-grade table and form components suitable for the data-heavy UI this project requires.

2. **React + Next.js**: Next.js provides server-side rendering, file-based routing, and built-in API routes. Rejected because CGT is a single-page application (SPA) that communicates with a dedicated backend API. SSR adds complexity without benefit for an internal tool that does not need SEO. Next.js's opinionated file-based routing is less flexible than React Router for the complex nested navigation this project requires.

3. **React + Redux Toolkit + RTK Query**: Redux Toolkit with RTK Query provides a complete state management and data-fetching solution. Rejected because the MVP's state management needs are simple enough for React Context. Redux's boilerplate (slices, reducers, selectors) is disproportionate for the scope. RTK Query could be valuable but couples the project to Redux for the data layer.

4. **Svelte/SvelteKit**: Svelte offers excellent performance and minimal boilerplate. Rejected due to smaller ecosystem, fewer component libraries, and a smaller talent pool. The risk of hitting ecosystem gaps during MVP development is too high.
