# Domain Model Baseline

## Modeling principles

1. Every tenant-owned aggregate includes `tenantId`.
2. Tenant-owned queries and unique constraints are tenant-scoped.
3. Store stable references between aggregates; avoid unbounded embedded arrays.
4. Embed bounded value objects that are read and changed with their parent.
5. Record actor, timestamp, source, and provenance for consequential lifecycle changes.
6. Use explicit schema versions for externally exchanged payloads.
7. Define retention and deletion behavior for every sensitive data class.

## Initial domain concepts

| Concept | Key relationships | Notes |
| --- | --- | --- |
| User | Memberships | A person may belong to multiple organizations |
| Organization | Memberships, partners | Tenant boundary and configuration owner |
| Membership | User, organization, role grants | Status and invitation lifecycle |
| PartnerRelationship | Organization, partner organization | Direction, scope, approval state |
| Product | Organization, variants, composition | Tenant-owned catalog aggregate |
| ProductVariant | Product, identifiers | Sellable/configurable product form |
| Component | Product composition, supplier | Reusable component reference |
| Material | Component, material declaration | Classification and provenance |
| Passport | Product/variant, disclosures, claims | Versioned publication snapshot |
| LifecycleEvent | Product, actor, location | Append-oriented event history |
| Evidence | Organization, claims, reviews | Metadata plus protected binary object |
| Claim | Product/passport, evidence | Status, scope, reviewer and validity |
| CircularCase | Product, partner, lifecycle event | Repair/reuse/recovery workflow |
| AuditEvent | Actor, tenant, target | Security and business accountability |

## Tenant model

Tenant-owned records use an immutable tenant identifier. The tenant context is resolved from the authenticated principal and validated membership—not trusted from arbitrary request body fields. Repository APIs should require tenant context for tenant-owned operations.

Platform-level records (for example, global material taxonomies) must be explicitly designated as global and read-only or governed through separate platform permissions.

## Indexing direction

Expected compound index patterns include:
- `{ tenantId: 1, createdAt: -1 }` for tenant activity lists.
- `{ tenantId: 1, status: 1, updatedAt: -1 }` for filtered work queues.
- `{ tenantId: 1, normalizedCode: 1 }` unique for tenant-local identifiers.
- `{ tenantId: 1, productId: 1, occurredAt: -1 }` for product event history.

Final indexes must be derived from measured query patterns and validated with explain plans.

## Consistency and lifecycle

Use explicit state transitions for invitations, claims, evidence reviews, passport publication, and circular cases. Reject invalid transitions in the domain/application layer. For multi-document writes, use MongoDB transactions where deployment topology and use case require them; otherwise design compensating behavior explicitly.

## Data classification

Classify data before implementation: public passport fields, tenant-confidential business data, personal data, security credentials, and evidence documents may require different access, retention, and disclosure controls.
