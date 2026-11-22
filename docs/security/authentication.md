# Authentication & Session Security

## Scope

This document describes the initial first-party identity API. It is not an SSO, MFA, email-verification, or tenant-authorization implementation.

## Account credentials

- Email addresses are trimmed and normalized to lowercase.
- Passwords must contain at least 12 characters and no more than 72 UTF-8 bytes.
- Passwords are hashed with bcryptjs using a work factor of 12.
- The password hash is excluded from ordinary Mongoose query results and JSON serialization.
- Duplicate email registration returns a conflict response without exposing account data.
- New accounts are active but start with `emailVerified: false`; verified-email workflows are not yet implemented.

## Token model

| Credential | Format | Default lifetime | Storage |
| --- | --- | --- | --- |
| Access token | HS256 JWT | 15 minutes | Returned in JSON; client should keep it in memory |
| Refresh token | 48 random bytes, base64url | 30 days | HttpOnly cookie; SHA-256 hash stored in MongoDB |

The access-token secret is configured with `AUTH_ACCESS_TOKEN_SECRET`. Production rejects the development fallback secret. Access tokens carry a user subject and session identifier, and are checked against an active MongoDB session on protected requests.

## Refresh rotation and reuse response

Every successful refresh:
1. Hashes the presented refresh token and locates its session.
2. Creates a replacement session in the same token family.
3. Atomically marks the previous session as revoked and links it to the replacement.
4. Issues a new access token and refresh cookie.

If a previously revoked refresh token is presented again, the remaining active sessions in that token family are revoked. This is a defensive reuse response. Expired sessions are removed eventually by a MongoDB TTL index.

## Cookie and browser controls

- Cookie name: `circutrace_refresh`.
- Flags: `HttpOnly`, `SameSite=Strict`, and `Secure` in production.
- Path: `/api/v1/auth`.
- Auth routes reject browser requests whose Origin differs from configured `CORS_ORIGIN`.
- API CORS is configured for one explicit frontend origin with credentials enabled.
- Auth endpoints have a dedicated IP-based rate limit in addition to the API-wide limit.

The web client should not persist bearer access tokens in localStorage or sessionStorage. The refresh cookie is not readable by JavaScript.

## Session endpoints

- `GET /api/v1/auth/sessions` lists active sessions for the authenticated user.
- `DELETE /api/v1/auth/sessions/:sessionId` revokes only a session owned by the authenticated user.
- `POST /api/v1/auth/logout` revokes the refresh session represented by the cookie and clears it.

Protected requests check session revocation as well as JWT signature and expiry. This adds a database read to protected requests, intentionally favoring immediate revocation over fully stateless access-token validation.

## Verification

The CI workflow starts a MongoDB 8.0 service and runs integration coverage for account registration, stored password hashing, authenticated identity retrieval, refresh rotation, immediate old-session invalidation, logout revocation, refresh-token reuse family revocation, and per-user session listing/revocation. Unit tests cover password hashing and access/refresh token primitives. This verification does not replace an external security review.

## Deferred controls

The following remain future work: email verification, password reset and recovery, MFA, SSO/OIDC, suspicious-login notifications, device trust, tenant memberships, organization roles, and independent penetration testing. Do not interpret the current foundation as a complete production identity governance system.
