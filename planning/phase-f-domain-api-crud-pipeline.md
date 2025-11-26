# Phase F — Domain API: companies, contacts, leads, pipeline

## Goal

**REST `/v1`** resources with list + CRUD + **lead stage transitions**, consistent validation and errors, and **activity** hooks on meaningful changes.

## Endpoints (baseline)

For each of companies, contacts, leads (and pipeline stages as sub-resource or dedicated resource):

- `GET` list (pagination, sort whitelist, filters).
- `GET :id`
- `POST`
- `PATCH :id`
- `DELETE :id` (soft delete when model uses `deletedAt`)

**Leads additionally:**

- `PATCH .../stage` or `PATCH` with `stageId` — document one approach.
- Filters: stage, owner, text search, date range (as MVP allows).

## Implementation pattern

- Controller → DTO validation → Service (transaction) → Prisma → optional `ActivityLogService.append`.
- Return shapes stable for TanStack Query keys.

## Frontend contract

- Kanban needs either **grouped by stage** endpoint or client-side group of `GET /leads?stageId=` — prefer **one round-trip** for board if performance matters.

## Guideline

Prefer **one** nested vs flat routing style across resources (document in `api-design.md`).

## Exit criteria

- [ ] OpenAPI or markdown route table updated.
- [ ] Isolation tests per entity.
- [ ] Stage move produces activity metadata (`fromStageId`, `toStageId`).
