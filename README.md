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

## Data stores (PostgreSQL and Redis)

The stack targets **PostgreSQL** (via Prisma) and **Redis** (BullMQ in `apps/worker` when enabled). You are **not** tied to Docker or any single vendor.

### PostgreSQL and Prisma

| Variable | Role |
|----------|------|
| `DATABASE_URL` | Primary connection for the API and worker. On hosts that offer a **pooler** (Supabase, Neon, Railway, etc.), use the **pooled** URL for runtime under concurrency. |
| `DIRECT_URL` | **Direct** connection for `prisma migrate`, `db push`, and introspection. Omit or set equal to `DATABASE_URL` if your host does not distinguish pooler vs direct. |

Use **TLS** for managed databases (`sslmode=require` or the parameters your provider documents). Size Prisma’s pool (and replica count) so you stay under the database **max connections**.

Staging or CI should use a **branch database** or disposable project when running migrations, not production.

### Redis and the worker

**`REDIS_URL`** is read by the BullMQ worker for queues and scheduled work. If you are not running the worker locally, you can leave it unset until you need it; when the worker is enabled, document the URL the same way as the database (managed Upstash / Redis Cloud, native `redis-server`, or **`infra/docker-compose.yml`**).

### Optional local stack

See **`infra/README.md`**. `infra/docker-compose.yml` can start Postgres and Redis on `localhost` for offline development. The app runs equally well against **managed** services — Compose is optional sugar, not architecture.

## Setup

1. Install **Node** 22+ (LTS) and **pnpm** (`corepack enable` or `npm i -g pnpm`).
2. Copy `.env.example` to `.env`. Set `DATABASE_URL`, `DIRECT_URL` (if applicable), `REDIS_URL` when using the worker, `JWT_SECRET` for auth, and AI keys as needed. For `pnpm --filter @microlead-crm/api exec prisma validate`, any placeholder Postgres URL is enough.
3. `pnpm install`
4. `pnpm build` — Turborepo builds all apps and packages.
5. `pnpm dev` — runs all `dev` scripts (API default **port 3001**, web **3000**). Use `pnpm --filter @microlead-crm/api dev` (or `web`, `worker`) for a single app.
6. `pnpm lint` / `pnpm format:check` — repo-wide quality gates (Husky runs **lint-staged** on commit).

**Prisma migrations:** `pnpm --filter @microlead-crm/api exec prisma migrate dev` once models land (Phase D).

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
| [docs/requirements-matrix.md](./docs/requirements-matrix.md) | Relaticle traceability (Phase B) |

## Planning playbooks

Folder: **`planning/`** in this repo — phased guidelines (not hard limits) for implementation. See **`planning/README.md`** for the index.

## License

_TODO: SPDX identifier after you choose a license._
