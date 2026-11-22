# Verifiable product-passport evidence ledger

CircuTrace records organization-submitted evidence against a product and, optionally, a specific lifecycle event. Evidence records are append-only at the application/schema layer and are linked in a per-product SHA-256 hash chain.

## API

All endpoints are nested under:

`/api/v1/organizations/:organizationId/products/:productId/lifecycle`

- `POST /evidence` — add a claim and evidence reference (requires `products:manage`).
- `GET /evidence` — list evidence records (requires `products:read`).
- `GET /evidence/verify` — recompute the per-product chain (requires `products:read`).
- `GET /passport` — export product data and its evidence ledger.

### Submission fields

`claimType` is one of `recycled_content`, `recovered_output`, `material_composition`, `repair`, `origin`, or `other`. The submission includes a concise claim description, HTTPS evidence URI, SHA-256 digest of the referenced evidence file, issuer label, and issue timestamp. An optional lifecycle event ID must belong to the same organization and product.

Evidence URIs must use HTTPS. The API records the digest supplied by the submitter. It does not fetch the URI or inspect file bytes, so it cannot independently establish that the digest matches the referenced file. Issuer identity, certificate authority, and digital signatures are not validated.

## Hash-chain design

Each record contains a per-product sequence, predecessor hash, and server-generated SHA-256 record hash. The hash covers a canonical fixed-position serialization of organization, product, lifecycle event, sequence, claim, evidence URI and digest, issuer, issue time, recording user, and predecessor hash. A product-level head hash and sequence are updated in the same MongoDB transaction as the evidence insert. This prevents concurrent writers from silently creating competing chain heads.

The evidence write therefore requires MongoDB transaction support (replica-set or sharded deployment). The application schema marks ledger fields immutable; database administrators with direct database write access can still alter records. For stronger guarantees, periodically anchor the latest product ledger heads in an independently controlled, write-once system.

## Verification semantics

The verify endpoint checks:
- contiguous sequence numbers starting at one;
- predecessor-hash linkage;
- each record's recomputed hash;
- the final sequence and hash against the product's separately stored ledger head, detecting deletion of trailing records as well as gaps in the middle.

A valid result means the retrieved ledger metadata is internally consistent with its hash chain. It does **not** mean the external document exists, its bytes match the submitted digest, the issuer is authentic, or the sustainability claim is certified. All records retain `digest_recorded_unverified` status until a separate trusted file-ingestion and issuer-signature verification capability is implemented.

The passport export includes the evidence records and a ledger integrity result. It does not expose the internal recording-user identifier.

## Security and operations

Organization and product scope come from the authenticated product lookup; clients cannot select another tenant. Lifecycle event links are checked against the same product. Evidence listing and passport exports remain private and non-cacheable. The verifier caps its work at 1,000 records; a truncated chain is never reported as valid.
