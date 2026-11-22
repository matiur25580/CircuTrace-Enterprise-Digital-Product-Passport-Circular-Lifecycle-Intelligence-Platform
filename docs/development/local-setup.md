# Local Development Setup

## Prerequisites

- Node.js 22 or newer.
- pnpm 9.15 or newer (Corepack is recommended).
- Docker Engine with Docker Compose.

## Install

```bash
corepack enable
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

## Start MongoDB

```bash
docker compose up -d mongodb
```

MongoDB is exposed on port 27017 and persists data in a named local volume. This Compose configuration is for development, not production.

## Run the applications

```bash
pnpm dev
```

- Web: http://localhost:5173
- API health: http://localhost:4000/api/v1/health
- API readiness placeholder: http://localhost:4000/api/v1/ready

The current readiness endpoint is a scaffold and does not verify database connectivity. Dependency-aware readiness will be implemented with the persistence milestone.

## Quality commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

## Security and limitations

Never commit real environment files, credentials, production URLs, or customer data. Production startup requires `MONGODB_URI`; local development can run the API without a database for the initial health-check scaffold.

Business-domain routes, authentication, tenant resolution, authorization, and persistence-backed readiness are not implemented yet. The web page is a foundation preview rather than the authenticated enterprise workspace. The first hosted CI run must be inspected before describing CI as passing.
