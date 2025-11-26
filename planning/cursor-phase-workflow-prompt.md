# Cursor agent prompt — phased build with dated commit history

Paste the block below into Cursor (Agent mode). Adjust years only if your calendar window differs.

---

## Prompt (copy from here)

You are building **microlead-crm** from `planning/` phase documents. Stack: NestJS + Prisma + Next.js; constraints in `planning/README.md`.

### Non-negotiables

1. **Phase sequence:** Follow `planning/README.md`. Do **Phase A**, keep **Phase B** as reference while implementing, then **C → D → E → F → G → H → I → J** in order. Do **not** skip ahead or reorder phases.
2. **Every commit must contain real changes** (new or edited files). No empty commits, no noise-only reformats unless a phase explicitly requires tooling setup.
3. **Commit messages:** Conventional Commits with scopes: `repo`, `api`, `web`, `worker`, `db`, `docs`, `ai`, `chore`. One logical change per commit (implementation + matching tests in the same commit is OK when tightly coupled).

### Historical date window (author + committer)

Spread git history across **2025-11-26** through **2026-01-19** (inclusive, local timezone unless I specify otherwise).

For **each** `git commit`, set both author and committer dates so they fall inside the window and respect **phase order** (later phases must not have timestamps **before** the earliest timestamp used for an earlier phase).

Use this **phase → date sub-range** map (pick a **random** day and time within each sub-range for each commit in that phase; avoid identical timestamps when possible):

| Phase | File | Start date | End date |
|-------|------|------------|----------|
| A | `planning/phase-a-environment-supabase.md` | 2025-11-26 | 2025-11-30 |
| B | `planning/phase-b-relaticle-requirements-matrix.md` (traceability / notes in repo only) | 2025-12-01 | 2025-12-03 |
| C | `planning/phase-c-documentation-and-monorepo.md` | 2025-12-02 | 2025-12-10 |
| D | `planning/phase-d-prisma-and-migrations.md` | 2025-12-08 | 2025-12-18 |
| E | `planning/phase-e-auth-teams-request-context.md` | 2025-12-16 | 2025-12-26 |
| F | `planning/phase-f-domain-api-crud-pipeline.md` | 2025-12-22 | 2026-01-05 |
| G | `planning/phase-g-tasks-notes-activities.md` | 2025-12-28 | 2026-01-09 |
| H | `planning/phase-h-ai-and-background-jobs.md` | 2026-01-02 | 2026-01-14 |
| I | `planning/phase-i-frontend-nextjs.md` | 2026-01-06 | 2026-01-18 |
| J | `planning/phase-j-testing-ci-hardening.md` | 2026-01-11 | 2026-01-19 |

Sub-ranges **overlap on purpose** so commit times can look naturally uneven; still enforce **monotonic phase boundaries**: the first commit of phase *N+1* must be **≥** the last commit time used for phase *N* (bump forward within that phase’s range if needed).

**Git command pattern** (run from the repo root; use ISO 8601):

```bash
export GIT_AUTHOR_DATE="2025-12-05T18:40:00"
export GIT_COMMITTER_DATE="2025-12-05T18:40:00"
git add <paths>
git commit -m "feat(api): add health module"
```

Alternatively: `git commit --date="2025-12-05T18:40:00" -m "..."` and ensure committer date matches if your git version/config requires it (set `GIT_COMMITTER_DATE` the same as author date for consistency).

### Per-phase workflow

1. Read the phase markdown; list deliverables and acceptance checks.
2. Implement in **slices** (docs, prisma, module, UI, worker, tests — whatever the phase defines).
3. After **each** slice: `git status` → stage only related files → commit with **appropriate message** and **dates** from that phase’s sub-range, respecting monotonicity across phases.
4. Run lint/test/build for touched packages when available; fix in **follow-up commits** with dates still inside the same phase range (and not before prior commits).
5. End of phase: working tree clean; summarize commits (subjects + dates) and state the **next phase file**.

### Start

Infer the current repo state, or ask me which phase to start from if unclear. Then execute **one phase at a time** until I ask to continue — unless I say “run through all phases,” in which case proceed **C through J** (and A/B as needed) in order with the commit rules above.

---

## Notes for you (human)

- **GitHub contributions** use the email on the commit and the default branch; verify your git `user.email` matches a verified GitHub address.
- Backfilled dates are visible in `git log`; reviewers can compare dates to file content. Prefer this workflow when you are **actually** implementing those phases over time, or when backfilling is honest about a migration of existing work.
- If the repo already has commits with real dates, say so in chat so the agent **does not** create impossible ordering (later commits dated before existing `main`).
