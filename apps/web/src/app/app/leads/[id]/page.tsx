"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityTimeline, type ActivityRow } from "@/components/ActivityTimeline";
import { api } from "@/lib/api";

type LeadDetail = {
  id: string;
  title: string;
  value: string | number | null;
  priority: string;
  stageId: string;
  companyId: string | null;
  contactId: string | null;
  stage: { id: string; name: string };
  company: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string; email: string | null } | null;
  owner: { id: string; name: string | null; email: string } | null;
};

type ActivitiesRes = { data: ActivityRow[]; meta: { total: number } };
type NotesRes = {
  data: Array<{ id: string; body: string; createdAt: string }>;
  meta: { total: number };
};
type TasksRes = {
  data: Array<{ id: string; title: string; done: boolean; dueAt: string | null }>;
  meta: { total: number };
};

const priorities = ["LOW", "MEDIUM", "HIGH"] as const;

export default function LeadDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const qc = useQueryClient();

  const lead = useQuery({
    queryKey: ["lead", id],
    queryFn: () => api<LeadDetail>(`/leads/${id}`),
    enabled: !!id,
  });

  const activities = useQuery({
    queryKey: ["activities", "LEAD", id],
    queryFn: () =>
      api<ActivitiesRes>(`/activities?entityType=LEAD&entityId=${encodeURIComponent(id)}&limit=50`),
    enabled: !!id,
  });

  const notes = useQuery({
    queryKey: ["notes", "LEAD", id],
    queryFn: () => api<NotesRes>(`/notes?parentType=LEAD&parentId=${encodeURIComponent(id)}&limit=30`),
    enabled: !!id,
  });

  const tasks = useQuery({
    queryKey: ["tasks", "LEAD", id],
    queryFn: () =>
      api<TasksRes>(`/tasks?parentType=LEAD&parentId=${encodeURIComponent(id)}&limit=50`),
    enabled: !!id,
  });

  const stages = useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: () => api<Array<{ id: string; name: string }>>("/pipeline-stages"),
  });

  const companies = useQuery({
    queryKey: ["companies", "options"],
    queryFn: () => api<{ data: Array<{ id: string; name: string }> }>("/companies?limit=200"),
  });

  const contacts = useQuery({
    queryKey: ["contacts", "options"],
    queryFn: () =>
      api<{ data: Array<{ id: string; firstName: string; lastName: string }> }>(
        "/contacts?limit=200",
      ),
  });

  const [noteText, setNoteText] = useState("");
  const addNote = useMutation({
    mutationFn: () =>
      api("/notes", {
        method: "POST",
        body: JSON.stringify({ parentType: "LEAD", parentId: id, text: noteText }),
      }),
    onSuccess: () => {
      setNoteText("");
      void qc.invalidateQueries({ queryKey: ["notes", "LEAD", id] });
      void qc.invalidateQueries({ queryKey: ["activities", "LEAD", id] });
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editStageId, setEditStageId] = useState("");
  const [editPriority, setEditPriority] = useState<string>("MEDIUM");
  const [editValue, setEditValue] = useState("");
  const [editCompanyId, setEditCompanyId] = useState<string>("");
  const [editContactId, setEditContactId] = useState<string>("");

  function openEdit() {
    if (!lead.data) return;
    setEditTitle(lead.data.title);
    setEditStageId(lead.data.stageId);
    setEditPriority(lead.data.priority);
    setEditValue(lead.data.value != null ? String(lead.data.value) : "");
    setEditCompanyId(lead.data.companyId ?? "");
    setEditContactId(lead.data.contactId ?? "");
    setEditOpen(true);
  }

  const saveLead = useMutation({
    mutationFn: () =>
      api(`/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle,
          stageId: editStageId,
          priority: editPriority,
          value: editValue.trim() === "" ? null : Number(editValue),
          companyId: editCompanyId || null,
          contactId: editContactId || null,
        }),
      }),
    onSuccess: () => {
      setEditOpen(false);
      void qc.invalidateQueries({ queryKey: ["lead", id] });
      void qc.invalidateQueries({ queryKey: ["leads", "kanban"] });
      void qc.invalidateQueries({ queryKey: ["activities", "LEAD", id] });
    },
  });

  const deleteLead = useMutation({
    mutationFn: () => api(`/leads/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leads", "kanban"] });
      router.replace("/app/leads/kanban");
    },
  });

  const toggleTask = useMutation({
    mutationFn: ({ taskId, done }: { taskId: string; done: boolean }) =>
      api(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ done }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks", "LEAD", id] });
      void qc.invalidateQueries({ queryKey: ["activities", "LEAD", id] });
    },
  });

  const addTask = useMutation({
    mutationFn: (title: string) =>
      api("/tasks", {
        method: "POST",
        body: JSON.stringify({ parentType: "LEAD", parentId: id, title }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks", "LEAD", id] });
      void qc.invalidateQueries({ queryKey: ["activities", "LEAD", id] });
    },
  });

  const [newTaskTitle, setNewTaskTitle] = useState("");

  const [summary, setSummary] = useState<string | null>(null);
  const [actions, setActions] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [draftChannel, setDraftChannel] = useState<"email" | "linkedin">("email");
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  async function runAi(kind: "summary" | "next" | "outreach") {
    setAiError(null);
    setAiLoading(kind);
    try {
      if (kind === "summary") {
        const r = await api<{ summary: string }>("/ai/lead-summary", {
          method: "POST",
          body: JSON.stringify({ leadId: id }),
        });
        setSummary(r.summary);
      } else if (kind === "next") {
        const r = await api<{ actions: string }>("/ai/next-actions", {
          method: "POST",
          body: JSON.stringify({ leadId: id }),
        });
        setActions(r.actions);
      } else {
        const r = await api<{ draft: string }>("/ai/outreach-draft", {
          method: "POST",
          body: JSON.stringify({ leadId: id, channel: draftChannel }),
        });
        setDraft(r.draft);
      }
    } catch (e) {
      const err = e as Error & { code?: string };
      setAiError(
        err.code === "AI_NOT_CONFIGURED" || err.message.includes("not configured")
          ? "AI is not configured (set OPENAI_API_KEY on the API)."
          : err.message,
      );
    } finally {
      setAiLoading(null);
    }
  }

  if (lead.isLoading) {
    return <p className="text-sm text-zinc-500">Loading lead…</p>;
  }
  if (lead.error || !lead.data) {
    return (
      <p className="text-sm text-red-600">
        {lead.error instanceof Error ? lead.error.message : "Lead not found"}
      </p>
    );
  }

  const L = lead.data;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Lead</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{L.title}</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Stage: <span className="font-medium text-zinc-900 dark:text-zinc-200">{L.stage.name}</span>
            {" · "}
            Priority: {L.priority}
            {L.value != null && L.value !== "" && (
              <>
                {" · "}
                Value: {typeof L.value === "string" ? L.value : L.value}
              </>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {L.company && (
              <Link
                href={`/app/companies/${L.company.id}`}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Company: {L.company.name}
              </Link>
            )}
            {L.contact && (
              <Link
                href={`/app/contacts/${L.contact.id}`}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Contact: {L.contact.firstName} {L.contact.lastName}
              </Link>
            )}
            {!L.company && !L.contact && (
              <span className="text-zinc-500">No company or contact linked.</span>
            )}
          </div>
          {L.owner && (
            <p className="mt-2 text-xs text-zinc-500">
              Owner: {L.owner.name ?? L.owner.email}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openEdit}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this lead?")) deleteLead.mutate();
            }}
            disabled={deleteLead.isPending}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
          <Link
            href="/app/leads/kanban"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
          >
            Back to pipeline
          </Link>
        </div>
      </div>

      {editOpen && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold">Edit lead</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Title
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Stage
              <select
                value={editStageId}
                onChange={(e) => setEditStageId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              >
                {stages.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Priority
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Value (optional)
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Company
              <select
                value={editCompanyId}
                onChange={(e) => setEditCompanyId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              >
                <option value="">— None —</option>
                {companies.data?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Contact
              <select
                value={editContactId}
                onChange={(e) => setEditContactId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              >
                <option value="">— None —</option>
                {contacts.data?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => saveLead.mutate()}
              disabled={saveLead.isPending || !editTitle.trim()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {saveLead.isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold">AI</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Summary, coaching, and outreach drafts use your CRM context.
        </p>
        {aiError && <p className="mt-2 text-sm text-red-600">{aiError}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runAi("summary")}
            disabled={!!aiLoading}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {aiLoading === "summary" ? "…" : "Summarize lead"}
          </button>
          <button
            type="button"
            onClick={() => void runAi("next")}
            disabled={!!aiLoading}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-600"
          >
            {aiLoading === "next" ? "…" : "Next actions"}
          </button>
          <select
            value={draftChannel}
            onChange={(e) => setDraftChannel(e.target.value as "email" | "linkedin")}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          >
            <option value="email">Email</option>
            <option value="linkedin">LinkedIn</option>
          </select>
          <button
            type="button"
            onClick={() => void runAi("outreach")}
            disabled={!!aiLoading}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-600"
          >
            {aiLoading === "outreach" ? "…" : "Outreach draft"}
          </button>
        </div>
        {summary && (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-sm whitespace-pre-wrap dark:border-zinc-700 dark:bg-zinc-900/50">
            {summary}
          </div>
        )}
        {actions && (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-sm whitespace-pre-wrap dark:border-zinc-700 dark:bg-zinc-900/50">
            {actions}
          </div>
        )}
        {draft && (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-sm whitespace-pre-wrap dark:border-zinc-700 dark:bg-zinc-900/50">
            {draft}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Tasks</h2>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTaskTitle.trim()) return;
            addTask.mutate(newTaskTitle.trim());
            setNewTaskTitle("");
          }}
        >
          <input
            placeholder="New task…"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
          <button
            type="submit"
            disabled={addTask.isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add
          </button>
        </form>
        <ul className="mt-4 space-y-2">
          {tasks.data?.data.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={(e) => toggleTask.mutate({ taskId: t.id, done: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <span className={t.done ? "text-zinc-400 line-through" : ""}>{t.title}</span>
            </li>
          ))}
          {tasks.data?.data.length === 0 && (
            <li className="text-sm text-zinc-500">No open tasks yet.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Notes</h2>
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!noteText.trim()) return;
            addNote.mutate();
          }}
        >
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            placeholder="Add a note…"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
          <button
            type="submit"
            disabled={addNote.isPending || !noteText.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {addNote.isPending ? "Saving…" : "Add note"}
          </button>
        </form>
        <ul className="mt-6 space-y-3">
          {notes.data?.data.map((n) => (
            <li
              key={n.id}
              className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="whitespace-pre-wrap">{n.body}</p>
              <p className="mt-2 text-xs text-zinc-400">{n.createdAt}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Activity</h2>
        {activities.isLoading ? (
          <p className="mt-2 text-sm text-zinc-500">Loading timeline…</p>
        ) : (
          <div className="mt-4">
            <ActivityTimeline items={activities.data?.data ?? []} />
          </div>
        )}
      </section>
    </div>
  );
}
