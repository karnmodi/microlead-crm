# Database design — microlead-crm

**ORM:** Prisma on **PostgreSQL**. All **business tables** are scoped by `teamId` unless noted.

## Entity-relationship (conceptual)

- `User` — authentication identity.
- `Team` — workspace.
- `TeamMember` — `userId` + `teamId` + `role` (enum); unique `(userId, teamId)`.
- `Company` — belongs to `Team`; optional soft delete.
- `Contact` — belongs to `Team`; optional `companyId`.
- `PipelineStage` — belongs to `Team`; `order` for kanban columns.
- `Lead` — belongs to `Team`; `stageId`, optional `companyId`, `contactId`, `ownerId` (User); `title`, optional `value`, `priority` or `score`; soft delete optional.
- `Task` — belongs to `Team`; links to one parent: lead, contact, or company (enforce in app).
- `Note` — same parent pattern as task.
- `Activity` — `teamId`, `actorUserId`, `entityType`, `entityId`, `action`, `metadata` JSONB, `createdAt`; insert-only from app.
- `Attachment` — `teamId`, storage key, mime, size, parent reference.

## Indexing guidelines

- `(teamId, updatedAt DESC)` on high-traffic lists (leads, contacts, companies).
- `(teamId, stageId)` on leads for board queries.
- `(teamId, entityType, entityId, createdAt DESC)` on activities.
- Foreign keys used in filters: `ownerId`, `companyId`, etc.

## Soft delete

Use `deletedAt` on entities where users expect recovery (leads, companies, contacts, tasks, notes). Default lists exclude deleted rows; document restore policy.

## Migrations

Use Prisma migrations; direct DB URL for `migrate` when host requires pooler separation.

## Optional hardening

Row Level Security (RLS) in Postgres can mirror `teamId` for defense in depth — if enabled, document service role vs user role in `decisions.md`.
