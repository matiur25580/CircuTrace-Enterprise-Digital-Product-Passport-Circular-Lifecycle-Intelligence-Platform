# Development Roadmap

Milestones are gated by working code, automated verification, and documentation updates. A milestone is not complete merely because files have been scaffolded.

| Milestone | Scope | Exit evidence |
| --- | --- | --- |
| 1. Architecture foundation | Architecture, ADRs, domain boundaries, security baseline, roadmap | Reviewed docs and initial repository commit |
| 2. Monorepo & tooling | React/API workspaces, TypeScript, lint, formatting, env validation, Docker dev stack | Clean install, build, lint and test commands |
| 3. Identity foundation | Registration/invitation strategy, login, sessions, password security | Auth integration tests and session lifecycle |
| 4. Tenant management | Organizations, memberships, invitations, tenant context | Cross-tenant isolation tests |
| 5. Design system & shell | Accessible application shell, navigation, tokens, dashboard scaffolding | Keyboard and responsive checks |
| 6. Partner network | Supplier onboarding, relationships, collaboration | Permission and workflow tests |
| 7. Product catalog | Products, variants, identifiers and classifications | CRUD, validation and tenant tests |
| 8. Composition | BOM, components, materials and supplier provenance | Composition integrity tests |
| 9. Digital passport | Versioned passport, disclosure controls and publication | Public/private field tests |
| 10. Lifecycle traceability | Events, custody, source attribution and timeline | Event integrity and authorization tests |
| 11. Product relationship graph | Component-to-product and lifecycle relationship traversal | Bounded graph query tests |
| 12. Evidence vault | Protected files, metadata, versioning and review | Storage access and malware-scan strategy |
| 13. Compliance workflows | Requirement profiles, claims, controls and findings | Evidence-linked review lifecycle |
| 14. Data quality intelligence | Completeness, freshness and explainable indicators | Deterministic scoring tests |
| 15. Risk intelligence | Supplier/product risk signals and explainability | Model governance and human review |
| 16. Circularity operations | Repair, refurbishment, reuse, recovery and recycling | State-transition and audit tests |
| 17. Integration platform | API clients, webhooks, imports and exports | Auth, retry, replay and idempotency tests |
| 18. Production hardening | Security, accessibility, performance, observability, backup/restore, deployment | Reproducible CI and operational readiness review |

## Current milestone notes

- **Milestone 1:** Architecture and documentation foundation committed to `main`.
- **Milestone 2:** Workspace and application scaffold committed on `feat/milestone-2-mern-foundation`. Local dependency installation and the first hosted CI run remain to be verified; this milestone is not yet declared complete.

## Delivery rules

- Keep pull requests focused and reviewable.
- Add tests with each business capability.
- Document security-sensitive decisions in ADRs.
- Never commit secrets or real customer data.
- Mark planned capabilities clearly until implemented.
- Record known limitations and deferred decisions.
- Do not claim regulatory compliance or production readiness without independent verification.
