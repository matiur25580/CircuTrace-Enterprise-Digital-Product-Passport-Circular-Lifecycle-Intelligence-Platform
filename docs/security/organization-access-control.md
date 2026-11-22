# Organization Access Control

## Tenant resolution
Organization routes use `/api/v1/organizations/:organizationId`. The identifier is only a selector, never proof of access. Every operation resolves an active organization and an active membership for the authenticated user. Non-members receive the same not-found response as missing organizations to reduce tenant enumeration.

## Roles
- **owner**: organization lifecycle, settings, invitations, membership and role administration.
- **admin**: settings, invitations and member administration, but cannot assign or modify ownership.
- **member**: read organization and member directory.
- **viewer**: read-only organization and member directory.

Roles are resolved from MongoDB on each request and are never trusted from access-token claims. Invitation recipients can only receive admin, member or viewer. Owner membership cannot be removed through the member-removal endpoint; ownership transfer is a separately governed workflow.

## Invitations
Invitation credentials are 256-bit random opaque tokens. Only SHA-256 hashes are persisted. Tokens expire after seven days and are one-time use. Acceptance requires an authenticated account whose normalized email matches the invitation. Raw tokens are returned only at issuance and must be delivered through a trusted out-of-band channel; automated email delivery is not part of this milestone.

## Data model
Organizations have globally unique normalized slugs. Memberships have a unique `(organizationId, userId)` pair. Invitations are scoped to an organization and include expiry, acceptance and revocation timestamps. Membership queries and mutations always include the organization identifier.

## Security boundaries and limitations
This milestone establishes organization-level access control for the organization API. Future tenant-owned domain repositories must require tenant context and include organization filters in every read, write, aggregation and background job. No generic cross-tenant administrative bypass exists. Invitation delivery, ownership transfer, audit-event persistence, MFA/SSO and platform support access are deferred. This implementation is not an independent penetration test or compliance certification.
