# ADR 0001: Start with a TypeScript Modular Monolith

- **Status:** Accepted
- **Date:** 2026-11-22
- **Decision owners:** CircuTrace maintainers

## Context

CircuTrace spans multiple related domains and will evolve through staged milestones. Starting with distributed services would introduce deployment, networking, observability, and consistency costs before independent scaling or team ownership has been demonstrated.

## Decision

Build the initial product as a TypeScript modular monolith:
- React + TypeScript web client.
- Node.js + Express + TypeScript API.
- MongoDB + Mongoose persistence.
- Explicit domain modules and application boundaries.
- Separate worker process only when asynchronous workloads justify it.

## Consequences

### Positive
- Simpler local development and deployment.
- Easier end-to-end transactions for early workflows.
- Shared validation and types can reduce contract drift.
- Clear module boundaries preserve future extraction options.

### Trade-offs
- Requires discipline to prevent modules becoming tightly coupled.
- API and domain modules may share a deployment lifecycle initially.
- Scaling is primarily vertical or replica-based until workloads justify separation.

## Revisit when

A module has materially different scaling, security, availability, data residency, release cadence, or ownership requirements and extraction benefits exceed distributed-systems costs.
