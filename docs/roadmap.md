# Roadmap — microlead-crm

Aligned with `planning/` playbooks (repo root). **Guideline:** reorder if a vertical slice ships faster.

## Phase 1 — Analysis (done when doc exists)

- [x] `docs/relaticle-analysis.md` — structure, borrow/omit, mapping.

## Phase 2 — Architecture docs (this folder)

- [x] `product-scope.md`, `architecture.md`, `database-design.md`, `api-design.md`, `roadmap.md`
- [x] `demo-script.md`, `decisions.md`

## Phase B — Requirements traceability

- [x] `docs/requirements-matrix.md` — Relaticle mapping, MVP vs nice-to-have, module/perf bar (see `planning/phase-b-relaticle-requirements-matrix.md`).

## Phase 3 — Scaffold

- [ ] pnpm + Turborepo; `apps/web`, `apps/api`, `apps/worker`
- [ ] `packages/shared`, `packages/ai`, `packages/config`, `packages/ui`
- [ ] Prisma schema + first migration + seed
- [ ] ESLint, Prettier, Husky, CI workflow
- [x] `infra/` optional compose for Redis/Postgres (see `infra/README.md`)

## Phase 4 — Backend core

- [ ] Auth + teams + team guard
- [ ] Companies, contacts, leads, pipeline, tasks, notes, activities read
- [ ] Attachments + local storage adapter
- [ ] AI endpoints + provider wiring

## Phase 5 — Frontend core

- [ ] Shell, auth, team switcher, dashboard
- [ ] CRUD pages + lead detail timeline
- [ ] Kanban board
- [ ] Command bar search
- [ ] AI actions in UI

## Phase 6 — Quality

- [ ] API isolation tests, Playwright happy path
- [ ] README polish, screenshot placeholders

## Stretch (from product scope)

- [ ] MCP-lite / tool JSON API
- [ ] CSV import/export
- [ ] Semantic note search
- [ ] Company logo generation

---

**After each phase:** update checkboxes, summarize in README or changelog, note next increment.
