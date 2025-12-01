# Product scope — microlead-crm

## Elevator pitch

**microlead-crm** is a modern, **AI-assisted CRM** for **micro-SaaS founders**, **agencies**, and **small sales teams** who want team-isolated pipelines, fast capture of companies and contacts, and **actionable AI** on leads — without enterprise bloat.

## ICP (ideal customer profile)

- 1–20 person teams selling B2B services or software.
- Need **shared visibility** on pipeline and tasks, not complex CPQ or territory management.
- Comfortable with **self-serve** SaaS; privacy-conscious (clear data boundaries per team).

## Core entities

Teams, users, companies, contacts, leads, pipeline stages, tasks, notes, activities, attachments.

## User journeys (MVP)

1. **Onboard:** sign up → create or join workspace → land on dashboard.
2. **Capture:** add company + contact → create lead in stage → assign owner.
3. **Work pipeline:** move cards on kanban; timeline shows stage changes.
4. **Follow up:** tasks + notes on lead/contact/company; command bar to jump to records.
5. **AI assist:** generate lead summary, suggested next steps, outreach draft from record context.

See **[requirements-matrix.md](./requirements-matrix.md)** for Relaticle → microlead mapping, Nest module expectations, and performance habits (Phase B traceability).

## Must-have (release criteria for “credible MVP”)

- Auth + **team-scoped** workspaces.
- Full CRUD: companies, contacts, leads, tasks, notes (soft delete where it helps).
- Kanban for leads; stage transitions; owner + priority/score.
- Activity **timeline** on lead, contact, and company detail.
- **Search and filtering** on lists; **command/search bar** for quick navigation.
- Versioned **REST API** (`/v1`).
- **Three AI endpoints** with real provider integration (no fake text).

## Nice-to-have (prioritized suggestion)

1. **MCP-lite or JSON “tool” endpoints** — demo agent integration without full 30-tool server.
2. **CSV import/export** — high value for agencies importing lists.
3. **Semantic search on notes** — embeddings + worker jobs; after core stable.
4. **Company logo / image generation** — delight; cost and rate limits required.

## Explicit non-goals (default)

- Parity with Relaticle custom fields, full MCP catalog, or Filament-scale admin.
- Multi-currency enterprise quoting, call center, or marketing automation.

## Success metrics (portfolio / product)

- **Demoability:** 5–10 minute script with no dead ends.
- **Architecture clarity:** new contributor finds `auth`, `leads`, `ai` modules in minutes.
- **Trust:** team isolation proven by tests; AI failures are honest (clear errors).
