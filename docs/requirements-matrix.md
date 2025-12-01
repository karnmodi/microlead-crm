# Requirements matrix — Relaticle alignment and MVP bar

Canonical traceability for [Phase B](../planning/phase-b-relaticle-requirements-matrix.md) planning. **Guideline:** change scope deliberately and record it in [decisions.md](./decisions.md).

## Product entities (microlead-crm)

| Entity | Notes |
|--------|--------|
| Teams | Workspaces; business data scoped by `teamId`. |
| Users | Auth identity; many-to-many with teams via membership. |
| Companies | Accounts / organizations. |
| Contacts | People; optional link to company. |
| Leads | Opportunities; `stageId`, owner, score/priority. |
| Pipeline stages | Per-team ordered stages. |
| Tasks | Linked to lead, contact, or company (one parent enforced in services). |
| Notes | Same parent model as tasks. |
| Activities | Append-only audit trail for key mutations. |
| Attachments | Local adapter first; S3-compatible abstraction for production. |

## Concept mapping (Relaticle → microlead-crm)

| Relaticle | microlead-crm | Note |
|-----------|----------------|------|
| People | Contacts | Same CRM role. |
| Opportunity | Leads | Pipeline + board. |
| Company, Task, Note | Same names | |
| Team / Jetstream | Teams + members | Simplify invites for MVP if needed. |
| `SetApiTeamContext` | Nest guards + `X-Team-Id` / JWT active team | Same invariant: resolved team + membership before domain logic. |
| `TeamScope` / `HasTeam` | Explicit `where: { teamId }` (+ soft-delete rules) | No global ORM scope magic. |
| `app/Actions/*` | `*.service.ts` methods | Thin controllers; validated boundary. |
| API Resources | Response DTOs / serializers | Stable JSON for web and future clients. |
| Record summary + AI | `packages/ai` + provider in API | Vercel AI SDK or thin adapter. |
| MCP server (30 tools) | Nice-to-have: MCP-lite or `/ai/tools` JSON | Full parity out of default scope. |
| Custom fields + flowforge | Default omit | Fixed Prisma columns unless scope expands on purpose. |

## Must-have (MVP + portfolio bar)

- Auth + **team-scoped** workspaces.
- Full CRUD: companies, contacts, leads, tasks, notes (soft delete where it improves UX).
- Kanban for leads; stage transitions + activity entries.
- Activity **read** API; timeline on lead / contact / company detail.
- Search + filtering on lists (at least leads); global command bar when ready.
- Versioned **REST** (`/v1/...`).
- AI: **lead summary**, **next steps**, **outreach draft** — real provider, no placeholder text.

## Nice-to-have (suggested order)

1. MCP-lite or structured AI tool endpoints.
2. CSV import/export.
3. Semantic search on notes (embeddings + worker).
4. Company logo / image generation (feature flag, cost controls).

## Nest module shape (per domain)

- **DTO / validation** — `class-validator` or Zod at the boundary.
- **Service** — rules, transactions, activity emission.
- **Controller** — HTTP mapping only.
- **Persistence** — Prisma via repository or thin data access (one pattern, repeated).
- **Tests** — service-level coverage + at least one **cross-team negative** test per sensitive resource before broad CRUD ships (see [decisions.md](./decisions.md)).

## Performance habits

- Index `(teamId, ...)` on filtered/sorted columns.
- Deterministic sort (`updatedAt desc, id desc`).
- Pagination on all list endpoints.

## Relaticle paths worth sampling

- `relaticle/routes/api.php` — resource layout.
- `relaticle/app/Http/Middleware/SetApiTeamContext.php` — team resolution.
- `relaticle/app/Mcp/Servers/RelaticleServer.php` — agent surface grouping.
- `relaticle/tests/Feature/Api/` — scoping and API test mindset.
