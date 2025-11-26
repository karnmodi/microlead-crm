# Phase A — Data stores, connectivity, and `infra/` (guidelines)

## Goal

Run **microlead-crm** with **PostgreSQL** and **Redis** in whatever shape fits your hosting: managed (Supabase, Neon, RDS, Upstash), local daemons, or optional Docker in `infra/` — **without** treating any single vendor as mandatory.

## PostgreSQL

**Typical Prisma setup:**

- `DATABASE_URL` — often **pooled** (PgBouncer transaction mode) for the API/worker under concurrency.
- `DIRECT_URL` — **direct** connection for `prisma migrate` (when your host distinguishes them).

**Hosts (examples, not an exclusive list):**

- Supabase, Neon, Railway, Render Postgres, AWS RDS, local `postgres`.

**Checklist:**

- TLS (`sslmode=require` or host defaults).
- Connection limits vs pool size (avoid exhausting DB max connections).
- Branch DB or staging project for CI migrations.

## Redis (BullMQ)

- **Managed:** Upstash, Redis Cloud, ElastiCache — fine for portfolio and production.
- **Local:** native install or `infra/docker-compose.yml` **only** for Redis if you want zero cloud deps during dev.

## `infra/` folder role

Use `microlead-crm/infra/` for **optional** developer convenience, not as the only path:

- Example `docker-compose.yml`: Redis only, or Postgres + Redis for fully offline dev.
- Example Terraform/Kamal notes — only if you adopt them.

Document the **recommended** path in `README.md` (e.g. “managed Supabase + Upstash” vs “compose up for local services”).

## Environment variables (illustrative)

```bash
DATABASE_URL=
DIRECT_URL=          # optional; same as DATABASE_URL if not using pooler
REDIS_URL=
JWT_SECRET=          # or session secret
# AI
OPENAI_API_KEY=      # and/or Anthropic, etc.
```

## Relaticle context

Relaticle ships **Docker Compose** for the full PHP stack + Postgres + queue. Your product is **narrower** and **TypeScript-first** — compose is optional sugar, not architecture.

## Exit criteria (flexible)

- [ ] README explains how to point Prisma at your chosen Postgres.
- [ ] Worker (when enabled) has a documented `REDIS_URL`.
- [ ] No hidden assumption that “the app only runs in Docker.”
