# Phase H — AI module and BullMQ worker

## Goal

**Three real endpoints** (no lorem ipsum fallbacks), prompts isolated in **`packages/ai`**, provider behind an **interface** implemented in `apps/api`.

## Routes (under `/v1/ai/` or `/v1/...` — pick and document)

- `POST .../lead-summary` — body `{ leadId }`
- `POST .../next-actions` — `{ leadId }` and/or `{ contactId }`
- `POST .../outreach-draft` — `{ leadId, channel?: 'email' | 'linkedin' }`

## Rules

- Build **context** in API service (Prisma fetches, redact as needed).
- Pass structured context into prompt builders in `packages/ai`.
- On missing API key: **503/501** with machine-readable `code`.
- **Team scope** every parent entity load.

## Worker (`apps/worker`)

- BullMQ + Redis: optional jobs — e.g. refresh cached summary, future email, import chunk processing.
- Share job payload types via `packages/shared`.

**Status:** Worker wiring is tracked in **[`development-plan.md`](./development-plan.md) section D** and [`docs/roadmap.md`](../docs/roadmap.md) **Phase 7** (not started; `apps/worker` is still a scaffold).

## Stretch (guideline)

- **MCP-lite**: thin HTTP surface that exposes the same use-cases as structured “tools” for demos — only if time allows; document security (auth, rate limits).

## Exit criteria

- [x] All three endpoints demoable with real keys (`POST /v1/ai/lead-summary`, `next-actions`, `outreach-draft`).
- [x] Prompts editable without touching Nest controllers (`packages/ai` builders consumed by `AiService`).
- [ ] Worker runs with `REDIS_URL` when jobs exist — see **Phase 7** / [`development-plan.md`](./development-plan.md) section D.
