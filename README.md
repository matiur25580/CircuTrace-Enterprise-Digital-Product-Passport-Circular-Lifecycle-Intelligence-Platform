# CircuTrace
### Enterprise Digital Product Passport & Circular Lifecycle Intelligence Platform

**Making every product traceable, verifiable, sustainable, and circular.**

CircuTrace is an enterprise platform concept for managing trusted product information across the full lifecycle: design, sourcing, manufacturing, distribution, use, repair, reuse, refurbishment, and end-of-life recovery.

It is being developed as a production-oriented **MERN** application with a modular architecture, evidence-backed data, tenant isolation, and auditable workflows.

> **Project status:** Architecture and initial MERN application foundation are in place. The web and API applications are scaffolds; business capabilities are still planned and are not yet implemented or certified.

## Why CircuTrace

Product data is fragmented across manufacturers, suppliers, logistics providers, service partners, and recyclers. Sustainability and compliance claims are difficult to verify when evidence is disconnected from the product and its component history.

CircuTrace is designed to provide:
- A persistent digital identity and passport for each product.
- Component, material, supplier, and origin traceability.
- Evidence-linked compliance and sustainability claims.
- Lifecycle event history with accountable actors and timestamps.
- Repair, refurbishment, resale, reuse, and recycling workflows.
- Role-scoped collaboration across organizations.
- A public verification experience for approved passport information.

## Product domains

| Domain | Intended capability |
| --- | --- |
| Product passport | Product identity, attributes, ownership and lifecycle summary |
| Product composition | Bill of materials, components, materials and provenance |
| Supplier network | Supplier onboarding, declarations and collaboration |
| Traceability | Sourcing, production, custody and distribution events |
| Evidence vault | Versioned documents, attestations and claim evidence |
| Compliance | Configurable requirements, controls, reviews and audit trails |
| Circularity | Repair, maintenance, refurbishment, reuse and recovery |
| Intelligence | Explainable indicators, data quality and risk insights |
| Integrations | APIs, webhooks and enterprise data exchange |

## Technology direction

- **Web:** React, TypeScript, Vite, Tailwind CSS
- **API:** Node.js, Express, TypeScript
- **Data:** MongoDB, Mongoose
- **Client data:** TanStack Query; Zustand where local shared state is justified
- **Async processing:** Redis and BullMQ (introduced when required)
- **Realtime:** Socket.IO (introduced when required)
- **Quality:** Jest/Vitest, Supertest, Playwright, static analysis
- **Delivery:** Docker, GitHub Actions, environment-specific deployment configuration

The initial architecture is a **modular monolith**. Modules have explicit boundaries; independent services will be considered only when operational scale or ownership justifies them.

## Architecture principles

1. Tenant isolation is enforced at the API and data-access boundaries.
2. Authorization is deny-by-default and checked server-side.
3. Sensitive actions are validated, authorized, and audit logged.
4. Claims are linked to evidence, provenance, and review state.
5. Derived scores are explainable indicators—not regulatory certifications.
6. External integrations are authenticated, bounded, observable, and retry-safe.
7. Security, accessibility, testability, and operability are built into delivery.

## Repository layout (target)

```text
apps/
  web/                 React + TypeScript application
  api/                 Express + TypeScript API
  worker/              Background jobs (when introduced)
packages/
  shared-types/        Shared domain contracts
  validation/          Shared schemas and validation
  ui/                  Reusable accessible UI primitives
infrastructure/
  docker/
  scripts/
docs/
  architecture/
  api/
  database/
  security/
  development/
```

## Application foundation

The initial workspace scaffold is available on the `feat/milestone-2-mern-foundation` branch. It contains the React/Vite web shell, Express API health endpoints, shared TypeScript and validation packages, pnpm/Turborepo workspace tooling, local MongoDB Compose configuration, and a GitHub Actions verification workflow. This is an early development scaffold; hosted CI and local install/build results must be verified before treating it as release-ready. See [local development setup](docs/development/local-setup.md).

## Documentation

- [Architecture overview](docs/architecture/overview.md)
- [System design](docs/architecture/system-design.md)
- [ADR 0001: Modular monolith](docs/architecture/adr/0001-modular-monolith.md)
- [Domain model](docs/database/domain-model.md)
- [API conventions](docs/api/api-conventions.md)
- [Tenant isolation and security](docs/security/tenant-isolation.md)
- [Development roadmap](docs/development/roadmap.md)
- [Contributing](CONTRIBUTING.md)

## Delivery roadmap

The project will progress through small, verifiable milestones: architecture and tooling; identity and tenancy; organization and supplier collaboration; product and passport domains; traceability and evidence; compliance and circular workflows; intelligence; integrations; and production hardening.

## Development status

No application runtime is shipped in this foundation milestone. Implementation, automated tests, deployment workflows, and operational runbooks will be added and validated in subsequent milestones.

## Responsible product claims

CircuTrace is intended to support evidence management and operational workflows. It does not itself establish legal compliance, independently certify products, or guarantee the truth of supplier-provided information. Regulatory applicability and required evidence must be determined by qualified domain and legal stakeholders.

## License

No open-source license has been applied yet. All rights are reserved unless a license is added by the repository owner.
