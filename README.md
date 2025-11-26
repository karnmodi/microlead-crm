# microlead-crm

A **modern, AI-assisted CRM** for **micro-SaaS founders**, **agencies**, and **small sales teams**. It is inspired by the architectural strengths of [Relaticle](https://github.com/Relaticle/relaticle) (team isolation, disciplined REST, first-class AI/agent thinking) but built as a **narrower, TypeScript-native** product — **not a clone**.

## Why it exists

- **Portfolio-quality** full-stack sample: monorepo, NestJS, Prisma, Next.js, real AI integration.
- **Honest scope:** core CRM + pipeline + activity + three AI endpoints first; optional stretch features documented in `docs/product-scope.md`.

## Architecture (high level)

- **Monorepo:** pnpm + Turborepo  
- **Web:** Next.js 15, React 19, Tailwind, TanStack Query, React Hook Form + Zod  
- **API:** NestJS, Prisma, PostgreSQL  
- **Worker:** BullMQ + Redis  
- **AI:** Prompts in `packages/ai`; provider wiring in API  

See **`docs/architecture.md`** for diagrams and module boundaries.

## Features

| Area | Included |
|------|----------|
| Workspaces | Teams, membership, team-scoped data |
| CRM | Companies, contacts, leads, pipeline stages |
| Work | Tasks, notes, attachments |
| History | Activity timeline (append-only) |
| UX | Dashboard, lists, detail, kanban, command bar, dark mode |
| API | Versioned REST (`/v1`) |
| AI | Lead summary, next actions, outreach draft |

Nice-to-haves: MCP-lite, CSV import/export, semantic search, logo generation — see `docs/roadmap.md`.

## Repository layout

```
microlead-crm/
  apps/web
  apps/api
  apps/worker
  packages/ui
  packages/shared
  packages/config
  packages/ai
  docs/
  infra/
```

## Setup

> **Status:** Scaffold phase — commands below are the **intended** workflow once `package.json` exists.

1. Install **Node** (LTS) and **pnpm**.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `REDIS_URL`, and AI keys as needed.
3. `pnpm install`
4. `pnpm exec prisma migrate dev` (from API package path once scaffolded)
5. `pnpm dev` (or per-app dev scripts)

**Database:** any managed or local PostgreSQL. **Redis:** required for worker/queues when enabled. Optional **`infra/docker-compose.yml`** for local services — not mandatory.

## Screenshots

- `TODO` — dashboard  
- `TODO` — lead kanban  
- `TODO` — lead detail + AI actions  

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/relaticle-analysis.md](./docs/relaticle-analysis.md) | Reference analysis |
| [docs/product-scope.md](./docs/product-scope.md) | ICP, MVP, nice-to-haves |
| [docs/architecture.md](./docs/architecture.md) | System design |
| [docs/database-design.md](./docs/database-design.md) | Data model |
| [docs/api-design.md](./docs/api-design.md) | REST conventions |
| [docs/roadmap.md](./docs/roadmap.md) | Phased delivery |
| [docs/demo-script.md](./docs/demo-script.md) | Demo walkthrough |
| [docs/decisions.md](./docs/decisions.md) | ADRs |

## Planning playbooks

Folder **`planning/`** in this repository — phased guidelines (not hard limits) for implementation.

## License

_TODO: SPDX identifier after you choose a license._
