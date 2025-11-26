# Relaticle — reference analysis for microlead-crm

**Source:** local read-only copy at `../relaticle/` ([upstream](https://github.com/Relaticle/relaticle)).  
**Purpose:** extract architectural strengths and product patterns for a **smaller, TypeScript-native** CRM — **not** to clone stack or scope.

---

## 1. Repository structure (summary)

Relaticle is a **Laravel 12 monolith** with a **Filament 5** app panel, **REST API** under a versioned prefix, a parallel **MCP (Model Context Protocol) server**, and **first-party Composer packages** under `packages/`.

| Area | Location | Role |
|------|----------|------|
| HTTP entry & middleware wiring | `bootstrap/app.php` | Registers `web` routes, `api` group (optional API domain), global middleware (e.g. subdomain handling); JSON errors for API. |
| REST API | `routes/api.php` | `v1` routes: Sanctum, throttling, token abilities, **`SetApiTeamContext`**, `apiResource` for companies, people, opportunities, tasks, notes; custom-fields index. |
| Agent / MCP HTTP | `routes/ai.php` | Registers MCP server (`RelaticleServer`) with auth + team context + MCP throttle; path `/mcp` or MCP subdomain via config. |
| Domain logic | `app/Actions/{Entity}/` | Create/update/delete/list style **Actions** per aggregate — controllers stay thin. |
| HTTP layer | `app/Http/Controllers/Api/V1/`, `Requests/`, `Resources/` | Validation, serialization, thin controllers. |
| CRM models | `app/Models/` | Eloquent models; **`HasTeam`** concern; **`TeamScope`** global scope for tenant isolation. |
| Team context | `app/Http/Middleware/SetApiTeamContext.php` | Resolves team from token / `X-Team-Id` / current team; verifies membership; aligns guard for policies. |
| Policies | `app/Policies/` | Authorization per entity type. |
| AI | `app/Services/AI/` (e.g. record summary, context builder) | Prism-based provider integration; cached summaries via model concerns. |
| MCP implementation | `app/Mcp/Servers/RelaticleServer.php`, `Tools/`, `Resources/`, `Prompts/` | One server class aggregates tools + schema resources + prompts — **clear agent surface**. |
| Internal packages | `packages/SystemAdmin`, `Documentation`, `ImportWizard`, `OnboardSeed` | Domain-sized boundaries **inside** the monolith. |
| Vendor CRM extensions | `relaticle/custom-fields`, `relaticle/flowforge` (composer) | Deep customization and pipeline UX — **high complexity**. |
| Tests | `tests/Feature/` (Api, Mcp, Filament, Teams, …), `tests/Arch/` | Strong habit of **feature tests** by surface. |

---

## 2. Architectural strengths worth reusing (ideas)

1. **Explicit team context on API and agent traffic** — same middleware concept for REST and MCP reduces “wrong tenant” bugs.
2. **Thin controllers + dedicated write/read units** — Laravel Actions map cleanly to **Nest services** or use-case classes.
3. **Validated boundaries** — Form Requests → **DTOs / Zod** at the edge.
4. **Stable JSON contracts** — API Resources → **response DTOs** or serializers.
5. **First-class agent surface** — MCP server groups **tools**, **schema resources**, and **prompts** in one place; good mental model for **MCP-lite** or tool JSON later.
6. **AI layering** — context assembly separate from provider calls; optional caching of summaries.
7. **Tests grouped by product area** — Api, Mcp, Teams mirror how microlead-crm should split test folders.

---

## 3. Features to borrow (behavior, not implementation)

| Idea | Relaticle manifestation | microlead-crm adaptation |
|------|-------------------------|---------------------------|
| Multi-team workspaces | Jetstream teams + `TeamScope` | `Team`, `TeamMember`, every query scoped by `teamId` |
| REST CRUD for core CRM | `routes/api.php` resources | Nest modules: companies, contacts, leads, tasks, notes |
| Team resolution | `SetApiTeamContext` | Guard: JWT/session + `X-Team-Id` + membership check |
| Pipeline / opportunities | Opportunities + Flowforge | Fixed `PipelineStage` + `Lead` — no vendor pipeline package in MVP |
| Activity / audit | Observers + domain events | Explicit `ActivityLogService` after mutations |
| AI on records | Record summary + Prism | `packages/ai` prompts + provider adapter in API |
| Documentation culture | `packages/Documentation` | `microlead-crm/docs/*` + README |

---

## 4. Features to omit or defer by default (scope control)

These are **valuable in Relaticle** but **not required** for a sharp portfolio CRM unless you explicitly expand:

- **22 custom field types** and dynamic schema (`relaticle/custom-fields`).
- **Full Flowforge** pipeline package behavior.
- **30 MCP tools** and full schema resource parity — optional **MCP-lite** later.
- **Filament** admin UX — replace with **Next.js** app.
- **Import wizard** complexity — optional CSV phase.
- **System admin** package — out of scope for microlead-crm MVP.
- **Laravel Horizon / mailcoach / multi-subdomain** production matrix — simplify to your chosen host.

**Guideline:** anything cut here can return if it serves the **micro-SaaS / agency** vertical — document in `decisions.md`.

---

## 5. Adaptation decisions (Relaticle → modern TS monorepo)

| Concern | Relaticle | microlead-crm |
|---------|-----------|----------------|
| Runtime | PHP 8.4 + Laravel | Node + **NestJS** (or lighter TS server — ADR if changed) |
| UI | Filament + Vite | **Next.js 15**, React 19, Tailwind, TanStack Query |
| ORM | Eloquent + global scopes | **Prisma** — **explicit** `teamId` filters (no hidden global state) |
| Auth | Fortify/Jetstream/Sanctum | **JWT or session** + team membership tables |
| Queue | Redis + Horizon | **BullMQ** + `apps/worker` |
| AI | Prism | **Vercel AI SDK** or thin provider interface |
| Tenancy | `TeamScope` on models | Repository/service discipline + tests |
| Agent API | Laravel MCP | REST AI first; **optional** MCP-lite / tool routes |

---

## 6. Concept mapping (modules)

| Relaticle | microlead-crm module / model |
|-----------|------------------------------|
| Team, User, membership | `teams`, `auth` (user identity), membership in `teams` |
| Company | `companies` |
| People | `contacts` |
| Opportunity | `leads` + `pipeline` (stages) |
| Task | `tasks` |
| Note | `notes` |
| (Various) activity | `activities` |
| File / media (if used) | `attachments` + storage port |

---

## 7. Files to spot-read during implementation

- `relaticle/routes/api.php` — route layout and middleware stack.
- `relaticle/app/Http/Middleware/SetApiTeamContext.php` — team resolution and membership.
- `relaticle/app/Models/Scopes/TeamScope.php` — invariant to reimplement explicitly.
- `relaticle/app/Http/Controllers/Api/V1/CompaniesController.php` — thin controller pattern.
- `relaticle/app/Actions/Company/CreateCompany.php` (and siblings) — use-case shape.
- `relaticle/app/Mcp/Servers/RelaticleServer.php` — how tools/resources are registered.
- `relaticle/tests/Feature/Api/` — API and scoping test mindset.

---

## 8. Conclusion

Relaticle demonstrates **production-grade CRM concerns**: tenant isolation, disciplined HTTP API, rich AI and agent integration, and test coverage by domain. **microlead-crm** should match the **quality bar** and **core CRM + AI workflows** while staying **narrow**, **TypeScript-native**, and **honest in scope** — adding breadth only when it strengthens the product story for micro-SaaS founders and agencies.
