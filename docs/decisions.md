# Architecture decisions — microlead-crm

Record **dated** decisions as the project evolves. Initial defaults below are **starting points**, not immutable.

## ADR template

```
### ADR-NNN: Title
- **Date:** YYYY-MM-DD
- **Status:** proposed | accepted | superseded
- **Context:**
- **Decision:**
- **Consequences:**
```

---

### Stack: NestJS for API (default)

- **Status:** proposed
- **Context:** Need modular guards, DI, and testability for many domain modules.
- **Decision:** Use **NestJS** for `apps/api`.
- **Consequences:** Larger runtime than Hono/Fastify; faster structure for CRM-sized domains.
- **Alternative:** Hono/Fastify + manual composition — document if chosen (smaller deploy, more glue code).

### Auth: JWT vs session

- **Status:** proposed
- **Context:** Web app + future API clients.
- **Decision:** _TBD_ — JWT with refresh **or** session cookies for same-site web.
- **Consequences:** Affects CSRF, mobile clients, token storage.

### Tenancy enforcement

- **Status:** accepted (concept)
- **Context:** Relaticle uses global `TeamScope`; Prisma has no identical primitive.
- **Decision:** **Application-layer** `teamId` on every query; prove with tests. Optional Postgres RLS later.
- **Consequences:** Discipline required in services/repositories.

### AI provider

- **Status:** proposed
- **Context:** Portfolio needs real responses.
- **Decision:** **Vercel AI SDK** or thin wrapper over OpenAI/Anthropic; prompts in `packages/ai`.
- **Consequences:** Single provider first; multi-provider as interface evolution.

### File storage

- **Status:** accepted (concept)
- **Decision:** **Local disk adapter** in dev; **S3-compatible** adapter interface for prod.
- **Consequences:** Signed URLs or authenticated download route required for security.

### Redis and worker

- **Status:** accepted (concept)
- **Decision:** **BullMQ** in `apps/worker` for async jobs; Redis URL from env.
- **Consequences:** Need Redis in every environment that runs workers.

### CRM schema enrichment (leads, companies, contacts)

- **Date:** 2026-04-12
- **Status:** accepted
- **Context:** Minimal CRM fields limited forecasting, AI grounding, and list/kanban richness.
- **Decision:** Add nullable B2B-oriented columns on **Lead** (description, currency, probability, source, status, expected close, closed/lost metadata, tags JSON), **Company** (industry, description, employee count), and **Contact** (job title, LinkedIn URL), with Prisma migrations and API DTOs. AI prompts consume the expanded record context from `packages/ai`.
- **Consequences:** Larger payloads and migration discipline; indexes added as filters appear in queries.

### Cross-team isolation tests (quality gate)

- **Status:** accepted
- **Context:** Phase B playbook requires proving tenancy before a large CRUD surface lands; we avoid Relaticle-style implicit ORM scoping.
- **Decision:** Land at least **one automated cross-team negative test** per sensitive resource (e.g. lead, company) in the auth/teams phase (**Phase E**) before merging bulk domain CRUD (**Phase F**). Expand coverage as modules ship.
- **Consequences:** Slightly slower Phase F start; higher confidence in `teamId` enforcement.

### Team membership, invites, and destructive roles

- **Date:** 2026-04-12
- **Status:** accepted
- **Context:** Every signup creates a personal workspace; teams need shared access without manual SQL.
- **Decision:** **Direct add** by email for existing users (`POST /v1/teams/:teamId/members`, caller must be OWNER or ADMIN). **Token invites** (`TeamInvite` + `POST /v1/teams/:teamId/invites`, `POST /v1/invites/accept`) with optional **Resend** email when `RESEND_API_KEY` is set. **DELETE** on CRM entities requires **ADMIN** or **OWNER** (`TeamMinimumRoleGuard`).
- **Consequences:** Members cannot hard-delete records; invite acceptance requires signing in as the invited email.
