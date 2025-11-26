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

## Stretch (guideline)

- **MCP-lite**: thin HTTP surface that exposes the same use-cases as structured “tools” for demos — only if time allows; document security (auth, rate limits).

## Exit criteria

- [ ] All three endpoints demoable with real keys.
- [ ] Prompts editable without touching Nest controllers.
- [ ] Worker runs with `REDIS_URL` when jobs exist.
