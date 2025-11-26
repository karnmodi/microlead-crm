# API design — microlead-crm

## Base URL and versioning

- All business endpoints under **`/v1`** (prefix may include global `/api` if behind gateway — document deployment choice).
- **JSON** request/response; UTF-8.

## Authentication

- **JWT:** `Authorization: Bearer <token>` **or**
- **Session:** HTTP-only cookie (document cookie name and CSRF policy for web).

## Team workspace

- **`X-Team-Id: <uuid>`** — active team for the request (recommended for API clients).
- Server resolves team, verifies membership; **403** if invalid.

## Standard query params (lists)

| Param | Description |
|-------|-------------|
| `page`, `limit` | Offset pagination (or document cursor alternative) |
| `sort` | Whitelist field names, e.g. `-updatedAt` |
| `q` | Optional search string (entity-specific) |
| Filters | e.g. `stageId`, `ownerId`, `companyId` as applicable |

## Error envelope (illustrative)

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [{ "field": "title", "message": "Required" }]
}
```

For AI not configured:

```json
{
  "statusCode": 503,
  "code": "AI_NOT_CONFIGURED",
  "message": "AI provider is not configured."
}
```

## Resource map (MVP)

| Resource | Endpoints |
|----------|-----------|
| Auth | register/login/refresh/me (as implemented) |
| Teams | CRUD minimal + list my teams |
| Companies | REST list/show/create/update/delete |
| Contacts | same |
| Leads | same + stage update; filters for pipeline |
| Pipeline stages | list/create/update/reorder |
| Tasks | REST + parent filters |
| Notes | REST + parent filters |
| Activities | **GET** list by `entityType` + `entityId` |
| Attachments | upload + download + delete |
| AI | `POST /v1/ai/lead-summary`, `.../next-actions`, `.../outreach-draft` |

## OpenAPI

Generate or maintain OpenAPI when stable; until then, keep this file and route comments aligned with code.
