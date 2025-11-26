# Phase D — Prisma, schema, migrations

## Goal

A **relational** model that enforces **team tenancy** at the data layer (constraints + query discipline), supports **soft deletes** where UX needs them, and stays easy to **migrate** across environments.

## Module ↔ table alignment

Roughly one Prisma model group per Nest domain module: `User`, `Team`, `TeamMember`, `Company`, `Contact`, `Lead`, `PipelineStage`, `Task`, `Note`, `Activity`, `Attachment` (+ `Session`/`RefreshToken` if using session auth).

## Invariants (non-negotiable for CRM credibility)

- Every business row carries `teamId` (or belongs to a row that does — document exceptions if any).
- Loads by `:id` for mutations **always** include `teamId` in `where`.
- Activity rows are **insert-only** from application code (no user-facing create endpoint).

## Lead / pipeline fields (assignment)

- `stageId` FK to `PipelineStage` (per team).
- `ownerId` optional → `User`.
- `score` or `priority` (enum or int — pick in `decisions.md`).
- Search/filter indexes: at minimum `title`, `teamId`, `stageId`, `ownerId`, timestamps.

## Attachments

- `storageKey`, `mimeType`, `size`, parent reference, `teamId`.
- Service uses **interface** `StorageAdapter` — `LocalStorageAdapter` default, `S3StorageAdapter` later.

## Migrations

- Use `directUrl` when your host requires it for `migrate`.
- Name migrations for humans (`add_lead_priority`).

## Guideline

If you add RLS in Postgres later, treat it as **defense in depth** — the app must still enforce `teamId` correctly.

## Exit criteria

- [ ] Schema matches `docs/database-design.md`.
- [ ] Seed script for demo tenant + sample pipeline.
- [ ] `prisma migrate` story documented in README.
