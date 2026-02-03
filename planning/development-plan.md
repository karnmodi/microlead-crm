# Development plan — microlead-crm

**Purpose:** Single ordered checklist tying **PRD** ([`docs/PRD.md`](../docs/PRD.md)) to **code**. Status is **Done**, **Partial**, or **Not started**. Update this file when scope ships.

**Related:** [`docs/roadmap.md`](../docs/roadmap.md) (phases), playbooks `phase-*.md`.

---

## Legend

| Status          | Meaning                                                   |
| --------------- | --------------------------------------------------------- |
| **Done**        | Implemented and usable in repo (may be API-only).         |
| **Partial**     | Some layers done (e.g. API without UI, or scaffold only). |
| **Not started** | No meaningful implementation.                             |

---

## A. Foundation (docs, repo, backend core)

| Step | PRD ref  | Status   | Notes                                                                                                                                         |
| ---- | -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| A1   | §8, §6.5 | **Done** | Monorepo, Nest `apps/api`, global prefix `/v1` ([`main.ts`](../apps/api/src/main.ts)).                                                        |
| A2   | §6.1     | **Done** | JWT auth, teams, `TeamGuard`, `X-Team-Id` ([`auth/`](../apps/api/src/auth/), [`team.guard.ts`](../apps/api/src/common/guards/team.guard.ts)). |
| A3   | §6.2     | **Done** | CRUD: companies, contacts, leads, pipeline stages, tasks, notes (controllers under [`apps/api/src`](../apps/api/src/)).                       |
| A4   | §6.2     | **Done** | Activities **append** on mutations + read API ([`activities.service.ts`](../apps/api/src/activities/activities.service.ts), domain services). |
| A5   | §6.3     | **Done** | Search API ([`search.controller.ts`](../apps/api/src/search/search.controller.ts)).                                                           |
| A6   | §6.4     | **Done** | Attachments upload/download/delete ([`attachments/`](../apps/api/src/attachments/)).                                                          |
| A7   | §7.2–7.4 | **Done** | Three AI POST routes, `packages/ai` prompts, OpenAI in [`ai.service.ts`](../apps/api/src/ai/ai.service.ts).                                   |
| A8   | §10.1a   | **Done** | `docs/api-design.md`, CI + API e2e smoke ([`app.e2e-spec.ts`](../apps/api/test/app.e2e-spec.ts)).                                             |

---

## B. MVP web app (PRD §5.2, §10.1b)

Execute roughly **in this order** (vertical slice first).

| Step | PRD ref      | Status   | Notes                                                                                                                                                                   |
| ---- | ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1   | §5.2         | **Done** | Login/register, app shell, dashboard counts ([`apps/web/src/app`](../apps/web/src/app/)).                                                                               |
| B2   | §5.2         | **Done** | Companies **list** (read-only) ([`app/companies/page.tsx`](../apps/web/src/app/app/companies/page.tsx)).                                                                |
| B3   | §5.2         | **Done** | Pipeline kanban + stage move ([`app/leads/kanban/page.tsx`](../apps/web/src/app/app/leads/kanban/page.tsx)).                                                            |
| B4   | §5.2, §10.1b | **Done** | **Lead detail** [`/app/leads/[id]`](../apps/web/src/app/app/leads/[id]/page.tsx): header, links, edit/delete.                                                           |
| B5   | §5.2, §10.1b | **Done** | **Activity timeline** on lead detail (`GET /v1/activities?entityType=LEAD&entityId=…`).                                                                                 |
| B6   | §5.2, §7.2   | **Done** | **AI panel** on lead detail + next-actions on contact detail (`POST /v1/ai/*`).                                                                                         |
| B7   | §5.2, §10.1b | **Done** | **Contacts** nav, list, detail, timeline, notes ([`contacts/`](../apps/web/src/app/app/contacts/)).                                                                     |
| B8   | §5.2, §10.1b | **Done** | **CRUD** companies: [`new`](../apps/web/src/app/app/companies/new/page.tsx), [`[id]`](../apps/web/src/app/app/companies/[id]/page.tsx).                                 |
| B9   | §5.2, §10.1b | **Done** | **CRUD** contacts, leads ([`leads/new`](../apps/web/src/app/app/leads/new/page.tsx)), tasks ([`tasks`](../apps/web/src/app/app/tasks/page.tsx)), notes on detail pages. |
| B10  | §5.2, §10.1b | **Done** | **Tasks** [`/app/tasks`](../apps/web/src/app/app/tasks/page.tsx); tasks on lead/contact detail.                                                                         |
| B11  | §5.2, §10.1b | **Done** | **Command bar** [`CommandBar.tsx`](../apps/web/src/components/CommandBar.tsx) → `/v1/search` (⌘K).                                                                      |
| B12  | §6.1, §10.1b | **Done** | **Team switcher** [`TeamSwitcher.tsx`](../apps/web/src/components/TeamSwitcher.tsx) + `PATCH /v1/users/me/preferred-team` + query cache clear.                          |

---

## C. Backend polish (optional before public MVP)

| Step | PRD ref | Status          | Notes                                                          |
| ---- | ------- | --------------- | -------------------------------------------------------------- |
| C1   | §7.6    | **Not started** | Dedicated rate limits on `/v1/ai/*` and auth routes.           |
| C2   | §7.6    | **Not started** | Structured logging metadata for AI calls (no raw PII in logs). |

---

## D. Phase 7 — Worker (PRD §7.7.5, roadmap Phase 7)

| Step | PRD ref    | Status          | Notes                                                                                               |
| ---- | ---------- | --------------- | --------------------------------------------------------------------------------------------------- |
| D1   | §8, §7.7.5 | **Partial**     | `apps/worker` package exists; [`main.ts`](../apps/worker/src/main.ts) is scaffold only (no BullMQ). |
| D2   | §7.7.5     | **Not started** | Redis + BullMQ worker process; job types in `packages/shared`.                                      |
| D3   | §7.7.5     | **Not started** | First consumer (placeholder refresh job, import chunk, or heartbeat).                               |

---

## E. Post-MVP advanced AI (PRD §7.7.1–7.7.3, roadmap Phase 8)

| Step | PRD ref       | Status          | Notes                                                                                          |
| ---- | ------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| E1   | §7.7.1, §10.2 | **Not started** | Prisma model + API for polymorphic cached `AiSummary`; regenerate; token fields.               |
| E2   | §7.7.1        | **Not started** | UI: show cached summary on company, contact, lead.                                             |
| E3   | §7.7.2        | **Not started** | Extract **record context builder** (company / contact / lead caps); reuse in AI + future jobs. |
| E4   | §7.7.3        | **Not started** | Provider interface; env-based provider selection; second OpenAI-compatible backend.            |
| E5   | §7.7.3        | **Not started** | Admin/ops **health check** for configured provider.                                            |

---

## F. Agent protocol (PRD §7.7.4, roadmap Phase 9)

| Step | PRD ref | Status          | Notes                                                                  |
| ---- | ------- | --------------- | ---------------------------------------------------------------------- |
| F1   | §7.7.4  | **Not started** | MCP or MCP-lite HTTP surface; team-scoped auth.                        |
| F2   | §7.7.4  | **Not started** | Tools: list/get (and later write) for CRM entities; pagination/filter. |
| F3   | §7.7.4  | **Not started** | Resources: CRM JSON summary, entity schemas; prompts (e.g. overview).  |
| F4   | §7.7.4  | **Not started** | Scoped tokens (read vs read-write); agent route throttling.            |
| F5   | §7.7.4  | **Not started** | `creation_source` or equivalent on records created via agents.         |

---

## G. Search intelligence and governance (PRD §7.7.5–7.7.6, roadmap Phase 10)

| Step | PRD ref | Status          | Notes                                                         |
| ---- | ------- | --------------- | ------------------------------------------------------------- |
| G1   | §7.7.5  | **Not started** | Embeddings pipeline (worker); storage (pgvector or external). |
| G2   | §7.7.5  | **Not started** | Semantic / hybrid search on notes in search API.              |
| G3   | §7.7.5  | **Not started** | Optional RAG retrieval before LLM for Q&A on a lead.          |
| G4   | §7.7.6  | **Not started** | Per-team token/request budgets; residency documentation.      |
| G5   | §7.7.6  | **Not started** | Summary retention + delete on record erasure / GDPR flow.     |

---

## H. Stretch (roadmap Stretch)

| Step | PRD / scope   | Status          | Notes                    |
| ---- | ------------- | --------------- | ------------------------ |
| H1   | Product scope | **Not started** | CSV import/export.       |
| H2   | Product scope | **Not started** | Company logo generation. |

---

## Execution order (summary)

1. **Finish B4–B12** to close PRD §10.1b (credible product MVP in the browser).
2. **D2–D3** (worker) to unlock background summaries, imports, embeddings.
3. **E\*** then **F\*** then **G\*** per product priority.
4. **H\*** as separate initiatives.

---

_Last reviewed against repo: April 2026._
