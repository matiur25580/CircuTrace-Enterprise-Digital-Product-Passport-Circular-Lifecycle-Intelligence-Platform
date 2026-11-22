# API Conventions

## Baseline

The API will use versioned REST endpoints under `/api/v1`. JSON is the default representation. Breaking contract changes require an explicit versioning decision.

## Resource naming

- Use plural nouns: `/organizations`, `/products`, `/passports`.
- Use nested routes only when the child is strongly scoped to its parent.
- Use query parameters for filtering, sorting, and pagination.
- Use opaque identifiers; never treat identifier possession as authorization.

## Response shape

Successful collection responses should include `data` and pagination metadata where relevant. Error responses should include a stable machine-readable `code`, safe human-readable `message`, and `requestId`. Do not expose stack traces, database errors, secrets, or internal topology.

## HTTP semantics

- `GET`: read-only and safe.
- `POST`: create or execute a non-idempotent action; support idempotency keys where duplicate submission is costly.
- `PUT`: full replacement when appropriate.
- `PATCH`: partial update with explicit allowed fields.
- `DELETE`: deletion or deactivation according to documented retention policy.

Use appropriate status codes, including 201 for creation, 202 for accepted asynchronous work, 400 for malformed input, 401 for unauthenticated, 403 for unauthorized, 404 for unavailable resources, 409 for conflicts, 422 for semantically invalid input, and 429 for rate limits.

## Authentication endpoints

The initial identity routes are mounted at `/api/v1/auth`:

| Method | Path | Purpose | Access |
| --- | --- | --- | --- |
| POST | `/register` | Create an account and initial session | Public, rate limited |
| POST | `/login` | Authenticate and create a session | Public, rate limited |
| POST | `/refresh` | Rotate the HttpOnly refresh cookie | Refresh cookie |
| POST | `/logout` | Revoke the refresh session and clear cookie | Refresh cookie if present |
| GET | `/me` | Return the authenticated identity | Bearer access token |
| GET | `/sessions` | List active sessions for the caller | Bearer access token |
| DELETE | `/sessions/:sessionId` | Revoke one of the caller's sessions | Bearer access token |

Registration requires a display name, email, and password of at least 12 characters (maximum 72 UTF-8 bytes). Login returns a short-lived bearer access token; refresh credentials are never included in JSON. Auth errors use stable codes and safe messages. These endpoints do not yet implement email verification, password recovery, MFA, or tenant-scoped permissions.

## Security requirements

- Authenticate before accessing protected resources.
- Resolve tenant context from verified identity and membership.
- Authorize each action and resource on the server.
- Validate path, query, headers, and body with shared schemas.
- Apply request size limits, rate limits, and safe CORS policy.
- Avoid mass assignment; map allowed fields explicitly.
- Use CSRF protections if cookie-based authentication is selected.
- Redact sensitive values from logs and errors.

## Pagination and sorting

Prefer cursor pagination for large or frequently changing collections. Enforce maximum page sizes and allowlisted sort fields. Return stable cursors that do not expose internal secrets.

## Idempotency and concurrency

Support idempotency keys for selected write operations. Use optimistic concurrency/version checks for updates where lost updates would be harmful. Webhook consumers must deduplicate deliveries.

## Documentation and compatibility

Every endpoint must document purpose, authentication, permission, tenant scope, validation, response schema, error cases, and audit behavior. Contract tests should prevent accidental breaking changes.
