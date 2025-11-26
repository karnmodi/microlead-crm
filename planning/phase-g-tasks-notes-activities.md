# Phase G — Tasks, notes, activities, attachments

## Goal

Collaboration primitives on top of core CRM records, plus **attachments** with a **storage abstraction**.

## Tasks & notes

- Validated parent reference (lead / contact / company).
- List filters by parent and assignee (tasks).
- Soft delete optional; activity on create/update/delete.

## Activity log

**Write path:** only from domain services (or a small internal API for admin tools — default: none).

**Read path:** `GET /v1/activities?entityType=&entityId=` paginated, `teamId` scoped.

**Row shape:** `entityType`, `entityId`, `action`, `actorUserId`, `teamId`, `metadata` (JSON), `createdAt`.

## Attachments

- Upload endpoint (multipart) → store via `StorageAdapter` → DB row with `teamId` + parent.
- Serve via signed URL or authenticated download route — pick and document.

## Exit criteria

- [ ] Detail pages can render timeline + notes + tasks + attachments.
- [ ] Storage adapter interface in code; local works out of the box.
