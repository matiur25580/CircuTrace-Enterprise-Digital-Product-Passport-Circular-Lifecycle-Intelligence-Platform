# Tenant Isolation & Security Baseline

## Security objective

A user operating in one organization must not read, modify, enumerate, export, or infer another organization's tenant-owned data unless an explicitly authorized cross-tenant platform workflow permits it.

## Trust boundaries

- Browser/client: untrusted; all submitted identifiers and role claims require server validation.
- API: policy enforcement point; authenticate, resolve tenant, authorize, validate.
- Database: persistence boundary; tenant filters are mandatory for tenant-owned data.
- Object storage: private by default; access mediated by server-issued authorization.
- Integrations: external trust boundary; authenticate and validate every inbound/outbound message.

## Required controls

1. Resolve active organization from verified membership.
2. Never accept tenant identity solely from request payload or client state.
3. Require tenant context in tenant repository interfaces.
4. Include tenant scope in every find, update, delete, aggregate, and bulk operation.
5. Scope unique indexes to tenant where identifiers are tenant-local.
6. Check both action permission and resource relationship.
7. Deny by default when policy evaluation fails.
8. Audit sensitive actions and cross-tenant administrative access.
9. Test IDOR, enumeration, privilege escalation, and cross-tenant query paths.
10. Keep secrets in a managed secret store or protected environment configuration.

## Authorization model

Use role-based permissions as a baseline, with resource and relationship checks for contextual decisions. Roles are organization-scoped; a user's role in one organization must not implicitly grant privileges in another.

Permission checks should answer:
- Who is the authenticated principal?
- Which organization context is active?
- What action is being requested?
- Which resource is targeted?
- Is the principal authorized for that action on that resource in this tenant?

## Authentication direction

Use short-lived access credentials and a secure refresh/session lifecycle. If refresh tokens are used, store only a cryptographic hash server-side, rotate on use, detect reuse, and support revocation. Passwords must use a modern adaptive password hash. Exact provider and cookie/token transport decisions remain open pending implementation.

## Audit expectations

Record actor, tenant, action, target type/id, timestamp, outcome, and correlation ID for security-relevant actions. Avoid storing credentials, raw tokens, or unnecessary personal data in audit payloads. Audit records should be append-oriented and access-controlled.

## Verification checklist

- [ ] Cross-tenant read is denied.
- [ ] Cross-tenant update/delete is denied.
- [ ] Aggregation pipelines cannot omit tenant scope.
- [ ] Exports and background jobs preserve tenant scope.
- [ ] Object downloads verify tenant and resource authorization.
- [ ] Membership removal revokes effective access.
- [ ] Role changes are audited and take effect predictably.
- [ ] Platform support access is explicit, time-bounded where possible, and audited.

This document is a design baseline, not a completed security audit or certification.
