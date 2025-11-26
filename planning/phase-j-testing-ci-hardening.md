# Phase J — Tests, CI, hardening

## Goal

Prove **team isolation** and core flows; keep CI **fast and honest**; avoid fake test doubles that hide integration bugs.

## Backend

- **Jest** (Nest default) or **Vitest** if unified — pick in `decisions.md`.
- Per-module service tests + API e2e with test DB.
- **Must:** cross-team access denied tests for leads/companies.

## Frontend

- **Vitest** for pure utilities / hooks.
- **Playwright:** login → create company → create lead → move card (minimal one path).

## CI

- Lint, typecheck, `prisma validate`, unit/integration tests.
- E2E optional job (on main or nightly) if flaky without staging.

## Hardening

- Rate limits on auth; security headers; CORS allowlist for prod.
- Health check including DB ping.

## After this phase

Summarize coverage gaps, update `roadmap.md`, propose next nice-to-have from Phase B ordering.

## Exit criteria

- [ ] CI green with meaningful tests (not empty suites).
- [ ] README “Testing” section accurate.
