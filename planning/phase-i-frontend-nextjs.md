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

## Exit criteria

- [ ] Demo script runnable entirely in UI.
- [ ] No console errors on happy path; team switch clears/refetches queries.
