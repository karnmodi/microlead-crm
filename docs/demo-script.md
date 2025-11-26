# Demo script — microlead-crm (~5–10 minutes)

Use this for portfolio videos, interviews, or stakeholder walkthroughs. Adjust timing if AI calls are slow.

## Setup (before recording)

- Seed or create: one team, two users (optional), sample pipeline stages.
- Configure real AI API key for live demo **or** note you’re showing error handling.

## 1. Intro (30s)

- “microlead-crm is a team-scoped CRM for small sales teams and agencies — pipeline, tasks, notes, and AI on top of real data.”

## 2. Auth and workspace (1 min)

- Log in.
- Show **team switcher** if multiple teams; explain isolation.

## 3. Capture records (2 min)

- Create a **company** (realistic name/domain).
- Add a **contact** linked to the company.
- Create a **lead** in the first stage; set owner or priority.

## 4. Pipeline (2 min)

- Open **kanban**; drag lead to next stage.
- Open lead **detail**; point at **activity timeline** (stage change visible).

## 5. Collaboration (1–2 min)

- Add a **task** and a **note** on the lead.
- Use **command bar** to find the company or contact by name.

## 6. AI (1–2 min)

- From lead detail: run **lead summary**, **next actions**, **outreach draft**.
- If no key: show clear **503** and explain production config.

## 7. Close (30s)

- Mention **REST API** for integrations and optional **worker** for background jobs.

## Backup path

If AI fails live: show the same screens with error toast and logs — demonstrates honest integration.
