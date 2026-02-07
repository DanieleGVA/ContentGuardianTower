# ADR-007: Five-Role RBAC Model

**Status**: Accepted
**Date**: 2026-02-07
**Decision Makers**: CGT-001 (Program Director), CGT-002 (Senior IT Architect)

## Context

The source documents define two conflicting RBAC models:

**3-Role Model** (from the Operational Architecture document):
- **Admin**: Full system access, user management, configuration.
- **Analyst**: Content review, ticket management, compliance evaluation.
- **Viewer**: Read-only access to dashboards and reports.

**5-Role Model** (from the Database Schema and Navigation Flows documents):
- **Admin**: Full system access across all countries.
- **Global Manager**: Operational access across all countries.
- **Regional Manager**: Operational access scoped to assigned countries.
- **Local Manager**: Operational access scoped to a single country.
- **Viewer**: Read-only access within their assigned scope.

The 3-role model is simpler but does not support the multi-country governance requirements that are central to the platform's value proposition. Content Guardian Tower is designed to monitor compliance across multiple jurisdictions (EU, LATAM, APAC), each with different regulatory requirements. A single "Analyst" role cannot express the difference between a manager responsible for all of LATAM and a manager responsible for only Brazil.

The Database Schema document defines the `users` table with `role` and `country_scope` columns, and the Navigation Flows document specifies role-based navigation filtering across all 25+ flows. Both documents assume the 5-role model.

## Decision

Adopt the **5-role model** as the canonical RBAC model for Content Guardian Tower. The 3-role model from the Operational Architecture document is treated as an early simplification that was superseded by the more detailed schema and navigation specifications.

### Role Definitions

| Role | Scope | Description |
|------|-------|-------------|
| **Admin** | All countries | Full system access. Can manage users, configure sources and rules, view all data, modify system settings. The only role that can access the Configure and full Govern navigation groups. |
| **Global Manager** | All countries | Operational access across all countries. Can manage tickets, view dashboards, run exports, and monitor ingestion across all jurisdictions. Cannot manage users or system configuration. |
| **Regional Manager** | Assigned countries (1+) | Operational access scoped to a set of assigned countries. Can manage tickets, view dashboards, and run exports for their assigned countries only. Data from other countries is not visible. |
| **Local Manager** | Single country | Operational access scoped to a single country. Same capabilities as Regional Manager but limited to one country. This is the role that maps to "Analyst" in the 3-role model. |
| **Viewer** | Assigned scope | Read-only access within their assigned country scope. Can view dashboards, tickets, and reports but cannot modify any data. Cannot create, update, or assign tickets. |

### Role-to-3-Role Mapping

The "Analyst" role from the 3-role model maps to **Local Manager** in the 5-role model:
- Both roles can review content, manage tickets, and perform compliance evaluation.
- Local Manager adds the country scope constraint, which is essential for multi-country deployments.
- In a single-country deployment, Local Manager behaves identically to the original Analyst role.

### Scope Enforcement

Country scope is enforced at three levels:

1. **Backend (API layer)**: Every database query for scoped data (tickets, sources, ingestion runs, content) includes a `WHERE country IN (user.country_scope)` clause. This is implemented via a middleware that injects the scope filter into all repository calls.

2. **Database (query layer)**: PostgreSQL Row Level Security (RLS) policies are considered but not used for MVP. Instead, scope filtering is handled at the application layer via repository pattern methods that accept scope parameters.

3. **Frontend (UI layer)**: Navigation groups are filtered based on role. Menu items, data tables, and filter options only show data within the user's scope. The role and scope are provided by the auth context (see ADR-003).

### Navigation Group Access

| Navigation Group | Admin | Global Manager | Regional Manager | Local Manager | Viewer |
|-----------------|-------|----------------|-------------------|---------------|--------|
| **Operate** (Dashboard, Tickets) | Yes | Yes | Yes (scoped) | Yes (scoped) | Yes (read-only, scoped) |
| **Monitor** (Ingestion Runs, System Health) | Yes | Yes | Limited | No | No |
| **Configure** (Sources, Rules, Users, Settings) | Yes | No | No | No | No |
| **Govern** (Audit Log, Retention) | Yes | Limited | No | No | No |
| **Report** (CSV Export) | Yes | Yes | Yes (scoped) | Yes (scoped) | No |

### Data Model

The `users` table includes:

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'global_manager', 'regional_manager', 'local_manager', 'viewer')),
  country_scope VARCHAR(10)[] NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- `country_scope` is an array of ISO 3166-1 alpha-2 country codes.
- For Admin and Global Manager, `country_scope` is empty (interpreted as "all countries").
- For Regional Manager, `country_scope` contains multiple country codes.
- For Local Manager and Viewer, `country_scope` contains exactly one country code.
- The application layer enforces the cardinality constraint (single vs. multiple countries) based on role.

## Consequences

### Positive
- **Multi-country governance**: The 5-role model directly supports the platform's core use case of monitoring compliance across multiple jurisdictions with role-appropriate access control.
- **Granular access control**: Organizations can assign managers at global, regional, and local levels, matching their actual organizational structure.
- **Consistent with detailed specs**: The Database Schema and Navigation Flows documents (which are more detailed and recent than the Operational Architecture document) both use the 5-role model. Adopting it eliminates inconsistency.
- **Backward compatible**: A single-country deployment can use only Admin, Local Manager, and Viewer roles, which is functionally equivalent to the 3-role model.
- **Country scope enforcement**: Scoping data access by country at the backend level prevents data leakage between jurisdictions, which is critical for regulatory compliance.

### Negative
- **More complex RBAC logic**: 5 roles with country scope require more conditional logic in middleware, API routes, and frontend navigation than 3 flat roles. Every data query must consider both role and scope.
- **More test scenarios**: RBAC testing must cover 5 roles times multiple scope configurations, increasing the test matrix. Mitigation: parameterized tests that iterate over role/scope combinations.
- **User management complexity**: Admins must understand the difference between Global Manager, Regional Manager, and Local Manager when creating users. Mitigation: clear UI labels and help text explaining each role's scope.

### Risks
- **Scope bypass**: A bug in the scope filtering middleware could expose data from other countries to scoped users. Mitigation: integration tests that verify scope enforcement for every endpoint. The QA Architect (CGT-017) validates scope isolation.
- **Role creep**: Stakeholders may request additional roles (e.g., "Auditor", "Compliance Officer") that do not map cleanly to the 5-role model. Mitigation: the 5-role model covers the MVP requirements. Additional roles can be added post-MVP by extending the `role` check constraint and adding navigation rules.
- **Empty scope ambiguity**: Using an empty `country_scope` array to mean "all countries" (for Admin and Global Manager) is a convention that must be consistently enforced. A bug that treats empty scope as "no countries" would lock out admins. Mitigation: document the convention clearly and test for it explicitly.

## Alternatives Considered

1. **3-Role Model (Admin, Analyst, Viewer)**: As defined in the Operational Architecture document. Rejected because it does not support country-scoped access control, which is fundamental to the multi-country governance use case. An "Analyst" with no country scope would either see all countries (a security risk) or be limited to one country (unable to handle regional responsibilities). The 3-role model was an early simplification that was refined in later specifications.

2. **Permission-based model (no fixed roles)**: Define granular permissions (e.g., `tickets:read`, `tickets:write`, `sources:manage`) and assign them individually to each user. Rejected because this is more flexible than needed for MVP and significantly increases the complexity of user management, permission checking, and UI navigation logic. Fixed roles with implied permissions are simpler to implement and easier for administrators to understand.

3. **6+ Role Model (add Auditor, Compliance Officer)**: Extend beyond 5 roles to cover additional organizational functions. Rejected for MVP scope. The 5-role model covers the documented navigation flows and RBAC requirements. Additional roles can be added post-MVP if needed, as the role system is a simple enum extension.

4. **Hierarchical role model (role inheritance)**: Define roles in a hierarchy where each role inherits permissions from roles below it (e.g., Admin inherits from Global Manager, which inherits from Regional Manager). Rejected because the role permissions are not strictly hierarchical -- for example, Viewer has access to dashboards that Local Manager also has, but the access patterns are different (read-only vs. read-write). A flat role model with explicit permission mapping per role is clearer and less error-prone.
