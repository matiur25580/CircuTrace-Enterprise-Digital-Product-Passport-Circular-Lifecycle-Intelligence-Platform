# Milestone 7 — Product and Material Registry Foundation

## Scope delivered

- Organization-scoped product catalogue with tenant-local SKU uniqueness, draft/active/archived lifecycle status, category, description, and optional brand partner.
- Product variant persistence model with tenant/product-scoped SKU uniqueness, optional GTIN validation, and bounded key/value attributes.
- Product component records with product parentage, quantity/unit, and optional supplier partner.
- Component material records with controlled material categories, mass and unit, recycled-content percentage, country of origin, and optional supplier partner.
- Tenant membership and role checks on every product, component, and material endpoint. Owners/admins manage catalogue data; members/viewers read it.
- Partner references are validated against active partner records in the same organization.
- Parent-child lookups always include organization and parent identifiers to prevent cross-tenant or cross-product IDOR.
- Integration tests cover end-to-end product composition creation, cross-tenant denial, parent mismatch, SKU uniqueness, and strict input validation.

## API

All endpoints require authentication.

| Method | Path | Permission |
| --- | --- | --- |
| GET/POST | `/api/v1/organizations/:organizationId/products` | `products:read/manage` |
| GET/PATCH | `/api/v1/organizations/:organizationId/products/:productId` | `products:read/manage` |
| GET/POST | `/api/v1/organizations/:organizationId/products/:productId/variants` | `products:read/manage` |
| GET/POST | `/api/v1/organizations/:organizationId/products/:productId/components` | `products:read/manage` |
| GET/POST | `/api/v1/organizations/:organizationId/products/:productId/components/:componentId/materials` | `products:read/manage` |

List endpoints are bounded to 100 products or 200 child records. No arbitrary organization identifier from the body is trusted.

## Deferred

- Product variants API and GTIN registry checksums/verification.
- Lifecycle events, digital product passport snapshots, claims and evidence.
- BOM import/export, mass-balance validation, unit conversion, and composition reconciliation.
- Frontend product catalogue screens and audit-event persistence.

## Frontend delivery

- Added an authenticated organization-scoped product catalogue with search, status filters, and loading, error, and empty states.
- Owners and administrators can register products; members and viewers can browse.
- Product detail view loads components and material composition and provides authorized forms to add component and material records.
- All visible records are loaded from the API; the UI does not use fabricated catalogue data.

## Product variants API

- `GET /api/v1/organizations/:organizationId/products/:productId/variants` lists up to 200 variants for a verified tenant product.
- `POST /api/v1/organizations/:organizationId/products/:productId/variants` creates a variant with a tenant/product-local SKU, optional checksum-validated GTIN, optional display name, and up to 30 bounded string attributes.
- Duplicate variant SKUs and organization GTINs return conflict responses; invalid GTIN check digits return validation errors.
- Variant access uses the same owner/admin manage and member/viewer read permission model as the product catalogue.
