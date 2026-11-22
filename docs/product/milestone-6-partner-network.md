# Milestone 6 — Partner Network Foundation

## Delivered

- Organization-scoped partner records for suppliers, manufacturers, brands, logistics providers, service providers, recyclers, and other partner categories.
- Partner identity, legal name, type, website, country code, primary contact, external reference, notes, and lifecycle status.
- Tenant-scoped list, detail, create, update, and status-transition endpoints.
- Owner/admin can create and manage partner records. Active members and viewers can read partner records.
- Duplicate external references are rejected within an organization; references may be reused by a different organization.
- Partner identifiers are never treated as authorization credentials. Every operation revalidates active organization membership and tenant ownership.
- Integration tests cover tenant isolation, role enforcement, input validation, duplicate references, and status filtering.
- Partner profile editing is available to owners and admins; read-only roles can inspect partner details without management controls.

## Partner onboarding invitations

Partner onboarding invitations are separate from internal CircuTrace organization-membership invitations.

- Owners and admins can create invitations for an active partner with a configured primary contact email, list invitation status, and revoke pending invitations.
- Each invitation uses a cryptographically random, one-time token. Only its SHA-256 hash is persisted; the raw token is returned once to the authorized inviter.
- Invitations are bound to the normalized primary contact email, the partner record, and the owning organization.
- Invitations expire after seven days. Acceptance requires an authenticated CircuTrace account with the matching email address and atomically consumes the token.
- Acceptance records acknowledgement by that user; it does not create an organization membership, partner portal account, or cross-tenant permission.
- No email delivery provider is configured in this milestone. The inviter must securely deliver the one-time token out of band. Never place tokens in logs or support tickets.

## API

All endpoints require a valid access token.

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/v1/organizations/:organizationId/partners` | `partners:read` |
| POST | `/api/v1/organizations/:organizationId/partners` | `partners:manage` |
| GET | `/api/v1/organizations/:organizationId/partners/:partnerId` | `partners:read` |
| PATCH | `/api/v1/organizations/:organizationId/partners/:partnerId` | `partners:manage` |
| PATCH | `/api/v1/organizations/:organizationId/partners/:partnerId/status` | `partners:manage` |
| GET | `/api/v1/organizations/:organizationId/partners/:partnerId/invitations` | `partners:read` |
| POST | `/api/v1/organizations/:organizationId/partners/:partnerId/invitations` | `partners:manage` |
| DELETE | `/api/v1/organizations/:organizationId/partners/:partnerId/invitations/:invitationId` | `partners:manage` |
| POST | `/api/v1/partner-invitations/accept` | Authenticated matching-email user |

Partner list filters: `type`, `status`, and `search`. Results are sorted by name and capped at 100 records.

## Frontend integration

The authenticated workspace renders a partner directory for the currently selected organization. It loads records from the organization-scoped API, supports server-side name search and type/status filters, provides a create form for managers, and shows partner profile details. Owner/admin users can suspend and reactivate records; read-only members and viewers cannot see management controls. The UI reports loading, error, and empty states and never substitutes sample records. Partner profiles with a primary contact email expose invitation creation, invitation history, and revocation to managers. The raw one-time token is displayed only in the inviter's active session so it can be copied and delivered out of band; invitation status shows pending, accepted, revoked, or expired.

## Deferred

- Email delivery and invitation reminder scheduling.
- Partner-side accounts, cross-organization federation, delegated access, and a dedicated partner portal.
- Partner relationship graph, supplier scorecards, certifications, risk, and compliance evidence.
- Immutable audit-event persistence and advanced pagination.

No email is sent and no external organization is automatically granted access by creating a partner record or accepting an onboarding acknowledgement.
