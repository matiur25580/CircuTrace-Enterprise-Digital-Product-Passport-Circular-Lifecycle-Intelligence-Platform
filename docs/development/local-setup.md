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
# Replace AUTH_ACCESS_TOKEN_SECRET in apps/api/.env with a unique secret (32+ characters).
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

The readiness endpoint returns 503 until MongoDB is connected. Start MongoDB before using registration, login, refresh, or session-management endpoints.

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

Authentication routes are implemented in the API, but organization membership, tenant resolution, and role-based authorization are not yet implemented. The web page remains a foundation preview rather than the authenticated enterprise workspace. Configure a unique production `AUTH_ACCESS_TOKEN_SECRET`; production startup must also have `MONGODB_URI`.
