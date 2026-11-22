# Contributing to CircuTrace

Thank you for helping improve CircuTrace. This repository is being built incrementally; the roadmap and architecture documents define the current direction.

## Before contributing

1. Read the [README](README.md) and relevant architecture documentation.
2. Check the roadmap and existing issues to avoid duplicating work.
3. For material architectural changes, propose an ADR before implementation.
4. Do not introduce credentials, personal data, customer records, or proprietary evidence into the repository.

## Engineering expectations

- Use TypeScript for application code.
- Keep modules cohesive and respect documented dependency boundaries.
- Validate all untrusted input at system boundaries.
- Enforce authorization and tenant scope on the server.
- Prefer accessible semantic HTML and keyboard-operable interactions.
- Add unit, integration, or end-to-end tests appropriate to the change.
- Keep errors safe and logs free of secrets and sensitive payloads.
- Document configuration and operational implications.

## Change workflow

1. Create a focused branch from the current default branch.
2. Make a small, logically grouped change.
3. Run formatting, linting, type checks, and relevant tests.
4. Update documentation when behavior or contracts change.
5. Open a pull request describing motivation, implementation, verification, security impact, and known limitations.

## Commit messages

Use clear imperative messages, for example:
- `feat(passports): add versioned passport draft`
- `fix(tenancy): scope product lookup by organization`
- `docs(architecture): record eventing decision`

## Security issues

Do not publish exploitable vulnerability details in public issues. Report security concerns privately to the repository maintainers through GitHub's available private vulnerability reporting channel, if enabled.
