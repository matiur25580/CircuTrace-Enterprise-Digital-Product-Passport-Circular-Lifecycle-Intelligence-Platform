# System Design

## Scope

This is the initial system design baseline for CircuTrace. It describes intended boundaries and runtime responsibilities; implementation details will be refined through architecture decision records and tested code.

## Runtime components

### Web application
React + TypeScript client. Responsible for presentation, accessible interaction, client-side navigation, and calling the API. Client-side permissions are for user experience only; the API remains authoritative.

### API application
Node.js + Express + TypeScript. Responsible for authentication, tenant resolution, authorization, validation, application use cases, persistence coordination, audit emission, and stable HTTP contracts.

### MongoDB
Stores tenant-owned business records and platform-level identity/configuration records. Tenant-owned documents carry an explicit tenant key. Unique indexes and query patterns must account for tenant scope.

### Worker (later milestone)
Processes long-running or retryable jobs such as imports, document scanning, webhook delivery, and analytics materialization. Jobs must be idempotent and have bounded retries and dead-letter handling.

### Object storage (later milestone)
Stores binary evidence and exports. The database stores metadata and controlled object references, not public permanent URLs. Access should use short-lived authorization where appropriate.

## Dependency direction

Presentation -> API contracts -> application services -> domain rules -> persistence adapters.

Domain rules must not depend on Express request objects, MongoDB models, or UI components. Infrastructure adapters implement interfaces owned by application/domain layers where that separation provides meaningful value.

## API layering

- Routes: HTTP mapping and middleware composition.
- Middleware: request identity, tenant context, authorization, validation, correlation.
- Controllers: translate HTTP input/output; avoid business rules.
- Application services: orchestrate use cases and transaction boundaries.
- Domain: invariants, value objects, state transitions.
- Repositories: tenant-aware persistence operations.
- Infrastructure: Mongoose models, external clients, queue adapters.

## Data boundaries

Every tenant-owned read, update, and delete must include tenant scope. Resource IDs are not authorization. Cross-tenant administrative access must be explicit, separately permissioned, audited, and unavailable to ordinary tenant roles.

## Cross-module communication

Prefer synchronous application service calls for simple transactional use cases. Use persisted outbox events for reliable asynchronous side effects once the eventing infrastructure is introduced. Do not rely on in-memory events for critical cross-process delivery.

## Resilience

- Apply timeouts to outbound requests.
- Bound request body size and pagination.
- Retry only transient failures and only when operations are idempotent.
- Use exponential backoff with jitter for asynchronous retries.
- Isolate third-party failures from core read paths.
- Expose readiness separately from liveness.
- Avoid leaking secrets or personal data in logs.

## Observability

Every request should receive or propagate a correlation ID. Structured logs should include timestamp, severity, service, environment, request ID, route template, duration, and outcome. Sensitive values, access tokens, document contents, and credentials must not be logged.

## Testing strategy

Unit tests cover domain invariants; integration tests cover repository tenant scoping and API authorization; contract tests cover API schemas; end-to-end tests cover critical user journeys and accessibility. Security tests must include cross-tenant access attempts and privilege escalation scenarios.
