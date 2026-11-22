# CircuTrace

**Enterprise Digital Product Passport & Circular Lifecycle Intelligence Platform**

> Make product identity, material provenance and circular lifecycle evidence easier to trace, verify and govern.

## 1. Product vision

CircuTrace is an enterprise-oriented platform concept for managing product information across design, sourcing, manufacturing, distribution, use, repair, refurbishment, reuse and end-of-life recovery. It is designed around evidence-linked claims, persistent product identity and accountable collaboration between organizations.

## 2. Project status and responsible claims

**Status: early MERN application foundation with business capabilities under active development.** Confirm implementation on the selected branch before describing a feature as delivered. Dashboard illustrations are design concepts, not screenshots of a running deployment.

CircuTrace does not independently certify products, guarantee supplier declarations or establish legal compliance. Regulatory applicability and required evidence must be assessed by qualified domain and legal stakeholders.

## 3. Core product domains

- **Digital product passport:** product identity, attributes, ownership and approved disclosures.
- **Bill of materials:** components, material declarations, origin and composition.
- **Supplier network:** supplier onboarding, organization relationships and declarations.
- **Lifecycle traceability:** sourcing, production, custody, distribution and service events.
- **Evidence vault:** versioned documents, attestations, provenance and review state.
- **Compliance workspace:** configurable requirements, controls, assessments and audit trails.
- **Circularity workflows:** repair, maintenance, refurbishment, reuse, resale and recovery.
- **Intelligence:** explainable data-quality, completeness and risk indicators.
- **Integrations:** authenticated APIs, webhooks and enterprise data exchange.

## 4. Technology stack and architecture

The project follows a **MERN-oriented TypeScript architecture**:

- Web: React, TypeScript, Vite and Tailwind CSS.
- API: Node.js, Express and TypeScript.
- Data: MongoDB and Mongoose.
- Client state and data fetching: TanStack Query; Zustand where shared local state is justified.
- Quality: unit/integration tests, API tests, static analysis and browser E2E coverage as implemented.
- Delivery: Docker and GitHub Actions.

The intended architecture is a modular monolith with explicit domain boundaries. Add asynchronous workers, queues or realtime infrastructure only when supported by a concrete workload and operational requirement.

## 5. Architecture principles

1. Enforce tenant isolation in API services and data-access queries.
2. Use deny-by-default authorization for protected records and actions.
3. Link material, supplier and sustainability claims to evidence and provenance.
4. Preserve lifecycle event history and attributable actors.
5. Treat derived sustainability and risk scores as explainable indicators, not certifications.
6. Validate and authenticate external integrations; bound retries and payload sizes.
7. Design for data portability, auditability and privacy-aware retention.

## 6. Repository structure

The workspace is organized around web and API applications, shared contracts/validation, infrastructure and documentation. Consult the checked-out branch for the exact current folder layout and package scripts.

## 7. Local development

1. Install the Node.js and package-manager versions specified by the workspace.
2. Review application `.env.example` files and configure local MongoDB and other documented dependencies.
3. Install dependencies using the committed lockfile.
4. Start local infrastructure using the repository's documented Compose or setup instructions.
5. Run the root and app-level scripts declared in `package.json`.
6. Run type checking, tests and production builds before opening a pull request.

See [local setup](docs/development/local-setup.md) when present. Never commit secrets or real supplier/customer data.

## 8. Security and quality strategy

- Test tenant isolation and cross-organization access boundaries.
- Validate evidence ownership, file type, size and integrity.
- Track evidence freshness and claim review status.
- Protect webhooks with authentication, replay protection and idempotency.
- Scan dependencies and source code in CI; keep lockfiles reproducible.
- Use synthetic product and supplier data in demos.

## 9. Illustrative dashboard gallery

The following 12 SVGs are **illustrative dashboard concepts**, not captured application screenshots. Values and records are synthetic. They are intentionally presented in one vertical column.

### 01 — Digital product passport
A product-level view of identity, ownership, composition and lifecycle summary.
![CircuTrace digital product passport](docs/assets/dashboard/01-product-passport-overview.svg)

### 02 — Bill of materials explorer
A component hierarchy concept showing material declarations and provenance coverage.
![CircuTrace bill of materials explorer](docs/assets/dashboard/02-bill-of-materials-explorer.svg)

### 03 — Supplier network intelligence
A supplier collaboration view for onboarding, risk signals and declaration status.
![CircuTrace supplier network intelligence](docs/assets/dashboard/03-supplier-network-intelligence.svg)

### 04 — Lifecycle traceability
A chronological view of sourcing, manufacturing, custody and distribution events.
![CircuTrace lifecycle traceability](docs/assets/dashboard/04-lifecycle-traceability.svg)

### 05 — Evidence vault
A document governance concept for versioned certificates, declarations and review states.
![CircuTrace evidence vault](docs/assets/dashboard/05-evidence-vault.svg)

### 06 — Compliance control center
A workspace for configurable requirements, evidence mapping and assessment workflows.
![CircuTrace compliance control center](docs/assets/dashboard/06-compliance-control-center.svg)

### 07 — Circularity performance
A view of repair, reuse, refurbishment and recovery indicators.
![CircuTrace circularity performance](docs/assets/dashboard/07-circularity-performance.svg)

### 08 — Product verification portal
A consumer-facing concept for approved passport information and product verification.
![CircuTrace product verification portal](docs/assets/dashboard/08-product-verification-portal.svg)

### 09 — Material provenance map
A concept connecting material origin signals, suppliers and traceability evidence.
![CircuTrace material provenance map](docs/assets/dashboard/09-material-provenance-map.svg)

### 10 — Repair and refurbishment workspace
A service workflow for repairs, replaced parts and next-life readiness.
![CircuTrace repair and refurbishment workspace](docs/assets/dashboard/10-repair-refurbishment-workspace.svg)

### 11 — Passport data quality
A quality monitor for completeness, freshness, evidence coverage and validation exceptions.
![CircuTrace passport data quality](docs/assets/dashboard/11-data-quality-assurance.svg)

### 12 — Claims and audit governance
A view of sustainability claim evidence, approvals and accountable decisions.
![CircuTrace claims and audit governance](docs/assets/dashboard/12-audit-and-claims-governance.svg)

## 10. Documentation and contribution

Explore `docs/architecture`, `docs/api`, `docs/database`, `docs/security` and `docs/development` for the material available on the selected branch. Read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting changes and use [SECURITY.md](SECURITY.md) for responsible vulnerability reporting.

## 11. Roadmap themes

- Mature product, component and material domain contracts.
- Add evidence integrity, versioning and review workflows.
- Expand supplier collaboration and tenant-boundary tests.
- Introduce circular lifecycle workflows with auditable state transitions.
- Improve accessibility, observability, data export and operational runbooks.

## 12. License

No open-source license is applied unless a license file is present. All rights are otherwise reserved.
