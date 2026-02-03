# Phase I — Next.js app (portfolio-quality UX)

## Goal

A **credible SaaS UI** for the vertical: not a generic template dump — intentional layout, typography, and density for **sales workflows**.

## Stack reminders

- Next.js 15, React 19, TypeScript, Tailwind.
- TanStack Query; RHF + Zod; shadcn/ui where it accelerates **accessible** patterns.

## Screens (assignment)

- Login; **team switcher** in shell.
- Dashboard (light metrics OK for MVP).
- Companies, contacts, leads — list + **detail** with tabs/sections.
- **Kanban** board for leads.
- Tasks page.
- **Command / search bar** (global quick finder — expand from lead-only search if needed).

## AI in context

- Lead (and optionally contact) detail: buttons for summary, next steps, outreach — wired to API; loading/error states.

## UX bar

- Dark mode, responsive, skeletons, empty states, focus states, table + form **patterns** reused across entities.

## Guideline

Ship **one** screen to a “wow” level first (lead detail + board), then level the rest.

Canonical ordered steps: **[`development-plan.md`](./development-plan.md) section B** (MVP web).

## Screen checklist (sync with development-plan B)

| Item                                               | Status |
| -------------------------------------------------- | ------ |
| Login / register                                   | Done   |
| App shell + dashboard                              | Done   |
| Companies list                                     | Done   |
| Pipeline kanban                                    | Done   |
| Lead detail + timeline                             | Done   |
| AI actions on lead (and optionally contact) detail | Done   |
| Contacts list + detail                             | Done   |
| CRUD forms (company, contact, lead, task, note)    | Done   |
| Tasks page / surface                               | Done   |
| Command / search bar                               | Done   |
| Team switcher + preferred team                     | Done   |

## Exit criteria

- [x] Demo script runnable **entirely in UI** — lead detail, timeline, core CRUD, search, team switch ([`development-plan.md`](./development-plan.md) B4–B12).
- [x] **Team switch** clears/refetches queries (`TeamSwitcher` + `queryClient.clear()`).
