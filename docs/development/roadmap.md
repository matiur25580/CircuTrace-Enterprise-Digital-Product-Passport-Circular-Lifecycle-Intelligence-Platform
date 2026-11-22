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
- **Milestone 2:** Workspace, React/Vite web shell, Express API, shared packages, MongoDB Compose setup, environment examples, and CI workflow are committed on `feat/milestone-2-mern-foundation`. GitHub Actions run [45027098116](https://github.com/matiur25580/CircuTrace-Enterprise-Digital-Product-Passport-Circular-Lifecycle-Intelligence-Platform/actions/runs/45027098116) passed install, lint, typecheck, tests, and build. Draft PR #1 remains open. A generated `pnpm-lock.yaml` is not yet committed; add it before relying on frozen-lockfile installs.
- **Milestone 3:** Complete on `feat/milestone-3-enterprise-auth` (draft PR #2). Delivered registration/login, bcrypt password hashing, short-lived signed access JWTs, opaque refresh-token rotation with hashed persistence and family reuse detection, logout, protected `/me`, and per-user session listing/revocation. MongoDB-backed integration tests cover registration, login, refresh rotation, reuse response, logout, and session revocation. GitHub Actions run [45028328840](https://github.com/matiur25580/CircuTrace-Enterprise-Digital-Product-Passport-Circular-Lifecycle-Intelligence-Platform/actions/runs/45028328840) passed MongoDB service startup, install, lint, typecheck, tests, and build.
- **Milestone 4:** Initial implementation delivered on `feat/milestone-4-multi-tenant-organizations` (draft PR #3). Includes organization lifecycle, active membership resolution, organization-scoped roles, membership administration, one-time hashed invitation tokens, and tenant-isolation integration tests. GitHub Actions run [45029997818](https://github.com/matiur25580/CircuTrace-Enterprise-Digital-Product-Passport-Circular-Lifecycle-Intelligence-Platform/actions/runs/45029997818) passed install, lint, typecheck, MongoDB-backed tests, and build after the role-management lint fix. Invitation email delivery, ownership transfer, and durable audit events remain deferred.
- **Milestone 5:** Dashboard shell, design system, secure authentication bootstrap, memory-only access tokens, HttpOnly refresh-cookie restoration, login/registration/logout, organization membership loading, validated active-organization preference, and organization creation are implemented on `feat/milestone-5-enterprise-dashboard` (draft PR #4). Product, partner, lifecycle, and evidence dashboard metrics remain intentionally empty until their domain APIs exist.
- **Milestone 6 (foundation):** Partner record API and tenant-scoped permissions are implemented on `feat/milestone-6-partner-network` (draft PR #5). Supplier/manufacturer/brand/logistics/service-provider/recycler profiles, organization-local external references, status management, and MongoDB integration tests are included. The authenticated frontend directory, create flow, profile details, filters, status controls, and partner invitation management (one-time token issuance, history, and revocation) are connected to the API. The API and authenticated frontend now support tenant-scoped directed partner relationships, including partner-to-partner creation, descriptions/effective dates, endpoint/type/status filters, and lifecycle controls, with endpoint validation, duplicate prevention, API client tests, and MongoDB integration coverage. An interactive node-and-edge visualization, automated email delivery, external partner accounts/federation, and immutable audit events remain deferred pending follow-up work and review.

## Delivery rules

- Keep pull requests focused and reviewable.
- Add tests with each business capability.
- Document security-sensitive decisions in ADRs.
- Never commit secrets or real customer data.
- Mark planned capabilities clearly until implemented.
- Record known limitations and deferred decisions.
- Do not claim regulatory compliance or production readiness without independent verification.
