# Security Policy

## Reporting a vulnerability

Do not publish exploit details, credentials, supplier-confidential information, or private product evidence in public issues. Use GitHub's private vulnerability reporting channel when available. Include affected components, impact, safe reproduction steps, and redacted evidence.

## Security expectations

- Enforce organization and tenant isolation at every API and data-access boundary.
- Authorize every read and write server-side; default to deny.
- Treat supplier declarations, uploaded evidence, and integration payloads as untrusted.
- Validate file type, size, content, and access before processing uploads.
- Store evidence privately with explicit access controls, retention, and audit history.
- Keep secrets and personal or commercially sensitive data out of Git and logs.
- Use synthetic fixtures; do not commit real passports, supplier records, or customer documents.
- Record provenance and review state without presenting unverified claims as certified facts.

## Project status

CircuTrace is an architecture/foundation project. This policy describes intended controls; it does not claim that controls are implemented, audited, or that the product establishes regulatory compliance or product certification.
