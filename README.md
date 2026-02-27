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

| Area       | Included                                                 |
| ---------- | -------------------------------------------------------- |
| Workspaces | Teams, membership, team-scoped data                      |
| CRM        | Companies, contacts, leads, pipeline stages              |
| Work       | Tasks, notes, attachments                                |
| History    | Activity timeline (append-only)                          |
| UX         | Dashboard, lists, detail, kanban, command bar, dark mode |
| API        | Versioned REST (`/v1`)                                   |
| AI         | Lead summary, next actions, outreach draft               |

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

| Variable       | Role                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL` | Primary connection for the API and worker. On hosts that offer a **pooler** (Supabase, Neon, Railway, etc.), use the **pooled** URL for runtime under concurrency. |
| `DIRECT_URL`   | **Direct** connection for `prisma migrate`, `db push`, and introspection. Omit or set equal to `DATABASE_URL` if your host does not distinguish pooler vs direct.  |

Use **TLS** for managed databases (`sslmode=require` or the parameters your provider documents). Size Prisma’s pool (and replica count) so you stay under the database **max connections**.

Staging or CI should use a **branch database** or disposable project when running migrations, not production.

### Redis and the worker

**`REDIS_URL`** is read by the BullMQ worker for queues and scheduled work. If you are not running the worker locally, you can leave it unset until you need it; when the worker is enabled, document the URL the same way as the database (managed Upstash / Redis Cloud, native `redis-server`, or **`infra/docker-compose.yml`**).

#### Worker runbook (BullMQ)

1. Ensure Redis is reachable (`REDIS_URL` in `.env`, same as API host if using Compose).
2. Start the worker: `pnpm --filter @microlead-crm/worker dev` (or `build` + `node dist/main.js` in production).
3. Enqueue a smoke job (shared queue name `microlead-crm`, job type `heartbeat`):

   ```bash
   pnpm --filter @microlead-crm/worker run enqueue:heartbeat
   ```

   You should see a log line from the worker such as `[microlead-crm] heartbeat ok at <ISO time>`.

### Optional local stack

See **`infra/README.md`**. `infra/docker-compose.yml` can start Postgres and Redis on `localhost` for offline development. The app runs equally well against **managed** services — Compose is optional sugar, not architecture.

## Setup

1. Install **Node** 22+ (LTS) and **pnpm** (`corepack enable` or `npm i -g pnpm`).
2. Copy `.env.example` to `.env`. Set `DATABASE_URL`, `DIRECT_URL` (if applicable), `REDIS_URL` when using the worker, `JWT_SECRET` for auth, and AI keys as needed. For `pnpm --filter @microlead-crm/api exec prisma validate`, any placeholder Postgres URL is enough.
3. `pnpm install`
4. `pnpm build` — Turborepo builds all apps and packages.
5. `pnpm dev` — runs all `dev` scripts (API default **port 3001**, web **3000**). Use `pnpm --filter @microlead-crm/api dev` (or `web`, `worker`) for a single app.
6. `pnpm lint` / `pnpm format:check` — repo-wide quality gates (Husky runs **lint-staged** on commit).

**Database (Prisma):**

- Apply migrations (production / CI / first deploy on a real DB):

  ```bash
  pnpm --filter @microlead-crm/api run db:migrate:deploy
  ```

- Create or iterate migrations locally (generates SQL from schema changes):

  ```bash
  pnpm --filter @microlead-crm/api run db:migrate
  ```

- Seed demo data (idempotent if demo user exists):

  ```bash
  pnpm --filter @microlead-crm/api run db:seed
  ```

Do **not** put shell comments on the same line as `pnpm run …` — anything after the script name is passed through to the command (e.g. Prisma would see extra bogus arguments).

**Database (Supabase CLI)** — optional; applies SQL under `supabase/migrations/` to your linked project:

1. Install/use CLI: `npx supabase@latest` (or install the [Supabase CLI](https://supabase.com/docs/guides/cli) globally).
2. Authenticate: `npx supabase@latest login` (or set `SUPABASE_ACCESS_TOKEN`).
3. Link this repo to your project (ref = hostname `db.<ref>.supabase.co`):

   ```bash
   pnpm db:supabase:link
   ```

4. New migration (empty file to edit):

   ```bash
   pnpm supabase migration new my_change_name
   ```

5. Push all pending migrations to the remote DB:

   ```bash
   pnpm db:supabase:push
   ```

The initial CRM schema is in `supabase/migrations/20260111120000_microlead_crm_init.sql` (same as Prisma’s first migration). If you apply it **only** via `db push`, mark Prisma’s history so `prisma migrate deploy` does not re-run the same SQL:

```bash
pnpm --filter @microlead-crm/api exec dotenv -e ../../.env -- prisma migrate resolve --applied 20260111120000_init
```

**Supabase / managed Postgres:** If you see `P1001: Can't reach database server`, check: project is not paused; **Database → Network** restrictions allow your IP (or “allow all” for dev); connection string uses `?sslmode=require`; special characters in the password are URL-encoded in `DATABASE_URL` / `DIRECT_URL`. You can also try the **Session mode** pooler URI from the Supabase dashboard if direct `5432` is blocked on your network.

## Screenshots

Place captures under `docs/screenshots/` when you have them (not committed by default). Suggested views:

- Dashboard — overview + quick actions
- Pipeline — kanban board
- Lead detail — fields + AI + attachments

**E2E:** API Jest e2e lives in `apps/api/test/`. Browser E2E (e.g. Playwright) is optional; add a project under `apps/web` when you want full UI regression coverage.

## Documentation

| Doc                                                          | Description                      |
| ------------------------------------------------------------ | -------------------------------- |
| [docs/relaticle-analysis.md](./docs/relaticle-analysis.md)   | Reference analysis               |
| [docs/product-scope.md](./docs/product-scope.md)             | ICP, MVP, nice-to-haves          |
| [docs/architecture.md](./docs/architecture.md)               | System design                    |
| [docs/database-design.md](./docs/database-design.md)         | Data model                       |
| [docs/api-design.md](./docs/api-design.md)                   | REST conventions                 |
| [docs/roadmap.md](./docs/roadmap.md)                         | Phased delivery                  |
| [docs/demo-script.md](./docs/demo-script.md)                 | Demo walkthrough                 |
| [docs/decisions.md](./docs/decisions.md)                     | ADRs                             |
| [docs/requirements-matrix.md](./docs/requirements-matrix.md) | Relaticle traceability (Phase B) |

## Planning playbooks

Folder: **`planning/`** in this repo — phased guidelines (not hard limits) for implementation. See **`planning/README.md`** for the index.

## License

_TODO: SPDX identifier after you choose a license._
