# Phase B — Relaticle mapping, feature priorities, and quality bar

## Purpose

This matrix helps you **stay aligned** with proven CRM patterns (from Relaticle) while building a **smaller, sharper** product. It is a **guideline**: extend or cut features when the product thesis demands it — record the call in `docs/decisions.md`.

## Product entities (microlead-crm)

| Entity | Notes |
|--------|--------|
| Teams | Workspaces; all business data hangs off `teamId`. |
| Users | Auth identity; many-to-many with teams via membership. |
| Companies | Accounts / organizations. |
| Contacts | People; optional link to company. |
| Leads | Opportunities/deals; `stageId`, owner, score/priority. |
| Pipeline stages | Per-team ordered stages. |
| Tasks | Linked to lead/contact/company (enforce “one parent” in service layer). |
| Notes | Same parent model as tasks. |
| Activities | Append-only audit trail for key mutations. |
| Attachments | Files; local adapter first, S3-compatible abstraction. |

## Concept mapping (Relaticle → microlead-crm)

| Relaticle | microlead-crm | Note |
|-----------|-----------------|------|
| People | Contacts | Same CRM role. |
| Opportunity | Leads | Pipeline + board. |
| Company, Task, Note | Same | |
| Team / Jetstream | Teams + members | Simplify invites if needed for MVP. |
| `SetApiTeamContext` | Nest guards + `X-Team-Id` / JWT active team | Same **invariant**: resolved team + membership before domain logic. |
| `TeamScope` / `HasTeam` | Explicit `where: { teamId }` (and soft-delete rules) | No global ORM scope magic — use repositories or disciplined services. |
| Actions in `app/Actions/*` | `*.service.ts` methods | Thin controllers, fat validated boundary. |
| API Resources | Response DTOs / serializers | Stable JSON for web and future clients. |
| `RecordSummaryService` + Prism | `packages/ai` prompts + provider implementation in API | Vercel AI SDK or thin adapter interface. |
| MCP server (30 tools) | **Nice-to-have:** MCP-lite or `/ai/tools`-style JSON | Full parity is explicitly out of default scope. |
| custom-fields + flowforge | **Default omit** | Fixed Prisma columns + enums unless you expand scope on purpose. |

## Must-have (assignment + portfolio bar)

- Auth + **team-scoped** workspaces.
- Full CRUD: companies, contacts, leads, tasks, notes (soft delete where it improves UX).
- Kanban for leads; stage transitions + activity entries.
- Activity **read** API; timeline on lead / contact / company detail.
- Search + filtering on lists (at least leads; expand to global command bar when ready).
- Versioned **REST** API (e.g. `/v1/...`).
- AI: **lead summary**, **next steps**, **outreach draft** — real provider, no fake text.

## Nice-to-have (ordered suggestion)

1. **MCP-lite or structured AI tool endpoints** — great demo for “agent-ready” story without 30 tools.
2. **CSV import/export** — high utility for agencies; medium effort.
3. **Semantic search on notes** — needs embeddings + background jobs; defer until core is stable.
4. **Company logo / image generation** — delight feature; keep behind feature flag and cost controls.

## API module expectations (per domain)

Each Nest module should tend toward:

- **DTO / validation** — `class-validator` or Zod at boundary.
- **Service** — business rules, transactions, activity emission.
- **Controller** — HTTP mapping only.
- **Persistence** — Prisma in repository or thin data access layer (pick one pattern and repeat).
- **Tests** — at least service-level + one cross-team negative test per sensitive resource.

## Performance habits (cheap wins)

- Index `(teamId, ...)` on filtered/sorted columns.
- Deterministic sort (`updatedAt desc, id desc`).
- Pagination on all list endpoints.

## Relaticle paths worth sampling when implementing

- `relaticle/routes/api.php` — resource layout.
- `relaticle/app/Http/Middleware/SetApiTeamContext.php` — team resolution semantics.
- `relaticle/app/Mcp/Servers/RelaticleServer.php` — how a first-class agent surface is grouped (tools/resources/prompts).
- `relaticle/tests/Feature/Api/` — scoping and API tests mindset.

## Phase B “done enough”

- [ ] Team understands what is **default MVP** vs **deliberate stretch**.
- [ ] `docs/product-scope.md` reflects the vertical (micro-SaaS / agencies / small teams).
- [ ] First cross-team isolation test exists before large CRUD surface ships.
