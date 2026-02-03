# Roadmap — microlead-crm

Aligned with [`planning/development-plan.md`](../planning/development-plan.md) (step-by-step status) and [`docs/PRD.md`](PRD.md) §10. **Guideline:** reorder if a vertical slice ships faster.

## Phase 1 — Analysis (done when doc exists)

- [x] `docs/relaticle-analysis.md` — structure, borrow/omit, mapping.

## Phase 2 — Architecture docs (this folder)

- [x] `product-scope.md`, `architecture.md`, `database-design.md`, `api-design.md`, `roadmap.md`
- [x] `demo-script.md`, `decisions.md`

## Phase B — Requirements traceability

- [x] `docs/requirements-matrix.md` — mapping, MVP vs nice-to-have, module/perf bar (see `planning/phase-b-relaticle-requirements-matrix.md`).

## Phase 3 — Scaffold

- [x] pnpm + Turborepo; `apps/web`, `apps/api`, `apps/worker`
- [x] `packages/shared`, `packages/ai`, `packages/config`, `packages/ui`
- [x] Prisma schema + initial migration + seed (`pnpm --filter @microlead-crm/api run db:migrate:deploy` / `db:seed`)
- [x] ESLint, Prettier, Husky, CI workflow
- [x] `infra/` optional compose for Redis/Postgres (see `infra/README.md`)

## Phase 4 — Backend core

- [x] Auth + teams + team guard (`/v1/auth`, `X-Team-Id`, JWT)
- [x] Companies, contacts, leads, pipeline, tasks, notes — **full REST CRUD**
- [x] Activities **append** on domain mutations + **read** API for timelines (`activities` module)
- [x] Search API (`/v1/search`)
- [x] Attachments + local storage (`STORAGE_PATH`, multipart upload)
- [x] AI endpoints + OpenAI wiring (`POST /v1/ai/*`, `packages/ai` prompts)

## Phase 5 — Frontend core

- [x] Shell, auth, dashboard (`/app`, TanStack Query)
- [x] Companies **list** (read-only list view)
- [x] Kanban board / pipeline (`/app/leads/kanban`, stage move via select + `PATCH /leads/:id`)
- [x] Contacts: nav + list + detail
- [x] Leads: **detail** view (not only kanban cards)
- [x] Full **CRUD forms** (create/edit) for companies, contacts, leads, tasks, notes
- [x] **Activity timeline** on lead/contact (and optionally company) detail
- [x] **Tasks** page or embedded task management in UI
- [x] **Command bar** / global search UI (`/v1/search` exists)
- [x] **AI actions** in UI (wire `POST /v1/ai/*`)
- [x] **Team switcher** (preferred team API + UI switcher)

## Phase 6 — Quality

- [x] API health e2e + CI (`test:e2e`); expand isolation + Playwright next
- [ ] README polish, screenshot placeholders

## Phase 7 — Worker and async jobs (PRD §7.7.5 partial)

- [ ] BullMQ + Redis consumers in `apps/worker` (replace scaffold `main.ts`)
- [ ] Shared job payload types in `packages/shared`
- [ ] First real job (e.g. no-op heartbeat, placeholder “refresh summary”, or import chunk) + `REDIS_URL` runbook

## Phase 8 — Advanced AI core (PRD §7.7.1–7.7.3)

- [ ] Polymorphic **cached summaries** (`AiSummary` or equivalent) + regenerate + token metadata
- [ ] **Record context builder** shared across summary / coaching / draft (caps per entity type)
- [ ] **LLM provider abstraction** + second backend (e.g. OpenAI-compatible local base URL)
- [ ] Optional: provider **health** / connectivity check endpoint

## Phase 9 — Agent protocol (PRD §7.7.4)

- [ ] MCP server or **MCP-lite** HTTP JSON tools
- [ ] Read tools + **CRM summary** resource; write tools behind **scoped** tokens
- [ ] Throttle namespace for agent traffic; **`creation_source`** (or equivalent) on agent-created rows
- [ ] Schema resources / prompts for agent grounding (as in PRD)

## Phase 10 — Search intelligence and governance (PRD §7.7.5–7.7.6)

- [ ] Embeddings + **semantic note search** (or hybrid search API)
- [ ] Optional **RAG** step for “ask this lead” flows
- [ ] Cost/token **budgets**, data residency notes, summary retention on erasure

## Stretch (product differentiators — not in Phases 8–10 scope above)

- [ ] CSV import/export
- [ ] Company logo generation

---

**After each phase:** update checkboxes, summarize in README or changelog, note next increment.
