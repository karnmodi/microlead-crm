# Phase C — Docs, monorepo scaffold, and `microlead-crm/` layout

## Goal

Establish **canonical documentation** in the repo and a **Turborepo** workspace that matches the assignment: modular, navigable, portfolio-grade.

## Target tree (authoritative shape)

```text
microlead-crm/
  apps/
    web/                 # Next.js 15, React 19, TS, Tailwind, TanStack Query, RHF+Zod
    api/                 # NestJS (or document switch to Hono/Fastify in decisions.md)
    worker/              # BullMQ processors; shares types/env with api
  packages/
    ui/                  # Shared primitives (shadcn-backed where helpful)
    shared/              # Zod schemas, API types, shared constants
    config/              # eslint, tsconfig presets
    ai/                  # Prompt builders + provider-agnostic interfaces (no raw HTTP here)
  docs/                  # Product & technical docs (see list below)
  infra/                 # Optional compose, deploy notes — not required for every dev
  package.json
  pnpm-workspace.yaml
  turbo.json
```

## Documentation set (`docs/`)

| File | Role |
|------|------|
| `relaticle-analysis.md` | Phase 1 deliverable — repo tour, borrow/omit, stack mapping |
| `product-scope.md` | ICP, journeys, MVP vs later, vertical framing |
| `architecture.md` | Diagrams, request flow, modules, worker, file storage |
| `database-design.md` | Models, indexes, soft delete, activity shape |
| `api-design.md` | `/v1`, auth, team header, errors, pagination |
| `roadmap.md` | Phased delivery; ties to planning playbooks |
| `demo-script.md` | Short walkthrough for recordings / interviews |
| `decisions.md` | ADRs: Nest vs lighter framework, auth mode, hosting |

Root **`README.md`**: pitch, stack, setup, screenshot TODOs, roadmap pointer, feature list.

## Tooling

- **pnpm** workspaces + **Turborepo** pipelines: `build`, `lint`, `test`, `dev`.
- **ESLint + Prettier**; **Husky + lint-staged** on changed files.
- **`.env.example`** at root (and pointers in apps if split).

## CI basics

- Install, lint, typecheck, `prisma validate`.
- Tests when present; optional migrate against a disposable DB using secrets.

## Guideline

Scaffold **thin** packages first; grow `packages/ui` only when duplication hurts. Prefer **real** API contracts over stub mountains.

## Exit criteria

- [ ] `pnpm install` + `turbo run build` (may be minimal) succeeds.
- [ ] All docs files exist (can be iterated; avoid empty placeholders without intent).
- [ ] `infra/` explains optional local stack without implying it is mandatory.
