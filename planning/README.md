# microlead-crm — planning guidelines (not a ceiling)

This folder is a **reference playbook** for building **microlead-crm**: a portfolio-quality, AI-assisted CRM for **micro-SaaS founders, agencies, and small sales teams**. It sits beside the read-only [Relaticle](https://github.com/Relaticle/relaticle) reference at `../relaticle/`.

## How to treat these documents

- **Guidelines, not limitations.** If a better tradeoff appears during implementation, update `microlead-crm/docs/decisions.md` and move on. Nothing here blocks scope that still fits the product thesis.
- **Relaticle is inspiration, not a spec.** Borrow architectural *ideas* (team context, API discipline, AI surface, quality bar). Do **not** mirror Laravel/Filament structure or replicate custom-fields / 30-tool MCP unless you deliberately choose to.
- **Phases are a default sequencing.** Parallelize (e.g. frontend against mocked API) when it speeds delivery without sacrificing team-scoping invariants.

## Product anchor

| Dimension | Choice |
|-----------|--------|
| **Name** | `microlead-crm` |
| **Who** | Micro-SaaS founders, agencies, lean sales teams |
| **Promise** | Fast, modern, team-isolated CRM with real AI assistance — demoable and shippable |
| **Stack direction** | pnpm + Turborepo, Next.js 15, NestJS, Prisma, PostgreSQL, Redis + BullMQ, strict TypeScript |

## Meta-phases (execution order)

These align with the assignment; detailed playbooks are the `phase-*.md` files.

| Meta-phase | What | Planning files |
|------------|------|----------------|
| **1 — Analyze Relaticle** | Structure, strengths, simplifications; write `docs/relaticle-analysis.md` | *Deliverable in repo:* `microlead-crm/docs/relaticle-analysis.md` |
| **2 — Architecture & product docs** | Scope, ERD-level DB design, API contracts, roadmap | `product-scope`, `architecture`, `database-design`, `api-design`, `roadmap` in `microlead-crm/docs/` |
| **3 — Scaffold** | Monorepo, packages, `infra/`, CI, env patterns | [phase-c](./phase-c-documentation-and-monorepo.md), [phase-a](./phase-a-environment-supabase.md) (connectivity) |
| **4 — MVP + polish** | Backend domains, web app, AI, tests, demo script | [phase-d](./phase-d-prisma-and-migrations.md) → [phase-j](./phase-j-testing-ci-hardening.md) |

## Deep-dive index (playbooks)

| File | Topics |
|------|--------|
| [phase-a-environment-supabase.md](./phase-a-environment-supabase.md) | Postgres hosting (Supabase, Neon, RDS, local), pooler vs direct, Redis, optional Docker |
| [phase-b-relaticle-requirements-matrix.md](./phase-b-relaticle-requirements-matrix.md) | Concept mapping, **must-have vs nice-to-have**, suggested priorities, performance habits |
| [phase-c-documentation-and-monorepo.md](./phase-c-documentation-and-monorepo.md) | `microlead-crm/` tree, docs set, Turborepo, CI skeleton |
| [phase-d-prisma-and-migrations.md](./phase-d-prisma-and-migrations.md) | Schema, indexes, migrations, seed |
| [phase-e-auth-teams-request-context.md](./phase-e-auth-teams-request-context.md) | Auth, team resolution, guards |
| [phase-f-domain-api-crud-pipeline.md](./phase-f-domain-api-crud-pipeline.md) | Companies, contacts, leads, pipeline |
| [phase-g-tasks-notes-activities.md](./phase-g-tasks-notes-activities.md) | Tasks, notes, attachments, activity log |
| [phase-h-ai-and-background-jobs.md](./phase-h-ai-and-background-jobs.md) | AI module, Vercel AI SDK / provider abstraction, BullMQ |
| [phase-i-frontend-nextjs.md](./phase-i-frontend-nextjs.md) | Web UX, kanban, command bar, polish |
| [phase-j-testing-ci-hardening.md](./phase-j-testing-ci-hardening.md) | Isolation tests, E2E, hardening |

## After each major milestone (habit)

1. **Summarize** what shipped (bullets + links to PRs/commits if applicable).
2. **List** remaining gaps vs `docs/roadmap.md`.
3. **Propose** the next increment (one vertical slice or one risk area).

## Suggested priority stack (staff engineer view)

**Ship first (credibility + demo):** team-scoped auth, core CRUD, pipeline + kanban, activity timeline, three AI endpoints with real provider wiring, one polished “hero” detail screen (lead).

**Next (depth):** search/command bar, attachments with S3-ready storage port, filters/sorts on lists, worker-backed AI refresh or emails.

**Then (differentiation / wow):** MCP-lite or JSON tool endpoints, CSV import/export, semantic note search, company logo generation — each as its own decision in `decisions.md`.

---

*Legacy Cursor plan (optional):* `~/.cursor/plans/microlead-crm_build_plan_a2d923d6.plan.md`
