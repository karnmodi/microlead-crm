# Phase E — Auth and team workspace resolution

## Goal

**JWT or session** auth (per `decisions.md`) with a **single, boring** way to establish `teamId` on each request before any domain service runs.

## Recommended semantics (Relaticle-aligned)

Mirror the *ideas* in `SetApiTeamContext`:

1. Authenticate user.
2. Resolve active team from: **header `X-Team-Id`** and/or **JWT claim** / session default.
3. Verify **membership** (and optionally role).
4. Attach `teamContext` to request; services **require** it.

Avoid silently defaulting to “first team” in production without logging — OK for dev seed only.

## Teams API (minimal)

- Create team, list my teams, invite/members later as stretch.
- Endpoint or user setting to persist **preferred** team for the web app.

## Authorization

- **Role gates** for destructive team operations (owner/admin).
- **Entity-level**: ensure `teamId` on parent when creating tasks/notes/leads.

## Alternative stack note

If you move API to **Hono/Fastify**, reimplement the same **middleware chain** and document the lighter deploy story in `decisions.md`.

## Exit criteria

- [ ] Global guard (or middleware) applied to all `/v1` business routes.
- [ ] Tests: wrong team → 403/404 per policy; missing team → 403.
