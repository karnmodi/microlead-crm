"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityTimeline, type ActivityRow } from "@/components/ActivityTimeline";
import { AiResponsePanel, AiSectionTitle } from "@/components/AiResponsePanel";
import { DetailPageSkeleton, TimelineSkeleton } from "@/components/page-skeletons";
import { AttachmentSection } from "@/components/AttachmentSection";
import { api } from "@/lib/api";

type LeadDetail = {
  id: string;
  title: string;
  description: string | null;
  value: string | number | null;
  currency: string;
  probability: number | null;
  source: string | null;
  status: string;
  expectedCloseDate: string | null;
  closedAt: string | null;
  lostReason: string | null;
  tags: unknown;
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
type AttachmentRow = {
  id: string;
  filename: string | null;
  size: number;
  mimeType: string;
  createdAt: string;
};

const priorities = ["LOW", "MEDIUM", "HIGH"] as const;
const statuses = ["OPEN", "WON", "LOST"] as const;
const aiTabs = ["summary", "actions", "draft"] as const;

function tagsToString(tags: unknown): string {
  if (tags == null) return "";
  if (Array.isArray(tags) && tags.every((t) => typeof t === "string")) return tags.join(", ");
  return "";
}

function compactDate(value: string | null) {
  if (!value) return null;
  return value.slice(0, 10);
}

function metaPill(label: string, value: string | null | undefined) {
  if (!value) return null;
  return (
    <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
      {label}: {value}
    </span>
  );
}

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
  const attachments = useQuery({
    queryKey: ["lead", id, "attachments"],
    queryFn: () =>
      api<AttachmentRow[]>(
        `/attachments?parentType=LEAD&parentId=${encodeURIComponent(id)}`,
      ),
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
  const [editDescription, setEditDescription] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editProbability, setEditProbability] = useState("");
  const [editSource, setEditSource] = useState("");
  const [editStatus, setEditStatus] = useState<string>("OPEN");
  const [editExpectedClose, setEditExpectedClose] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editLostReason, setEditLostReason] = useState("");

  function openEdit() {
    if (!lead.data) return;
    const L = lead.data;
    setEditTitle(L.title);
    setEditStageId(L.stageId);
    setEditPriority(L.priority);
    setEditValue(L.value != null ? String(L.value) : "");
    setEditCompanyId(L.companyId ?? "");
    setEditContactId(L.contactId ?? "");
    setEditDescription(L.description ?? "");
    setEditCurrency(L.currency ?? "USD");
    setEditProbability(L.probability != null ? String(L.probability) : "");
    setEditSource(L.source ?? "");
    setEditStatus(L.status ?? "OPEN");
    setEditExpectedClose(L.expectedCloseDate ? L.expectedCloseDate.slice(0, 10) : "");
    setEditTags(tagsToString(L.tags));
    setEditLostReason(L.lostReason ?? "");
    setEditOpen(true);
  }

  const saveLead = useMutation({
    mutationFn: () => {
      const tags = editTags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const prob =
        editProbability.trim() === "" ? null : Math.min(100, Math.max(0, Number(editProbability)));
      return api(`/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle,
          stageId: editStageId,
          priority: editPriority,
          value: editValue.trim() === "" ? null : Number(editValue),
          companyId: editCompanyId || null,
          contactId: editContactId || null,
          description: editDescription.trim() || null,
          currency: editCurrency.trim() || "USD",
          probability: prob,
          source: editSource.trim() || null,
          status: editStatus,
          expectedCloseDate: editExpectedClose ? `${editExpectedClose}T12:00:00.000Z` : null,
          tags,
          lostReason: editStatus === "LOST" ? editLostReason.trim() || null : null,
        }),
      });
    },
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
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
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
  const [aiTab, setAiTab] = useState<(typeof aiTabs)[number]>("summary");
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const lastAutoSummaryKey = useRef<string>("");

  const runAi = useCallback(async (kind: "summary" | "next" | "outreach") => {
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
          ? "AI is not configured (set Azure OpenAI or OPENAI_API_KEY on the API)."
          : err.message,
      );
    } finally {
      setAiLoading(null);
    }
  }, [id, draftChannel]);

  const summaryRefreshKey = useMemo(
    () =>
      JSON.stringify({
        lead: lead.data
          ? {
              title: lead.data.title,
              description: lead.data.description,
              value: lead.data.value,
              currency: lead.data.currency,
              probability: lead.data.probability,
              source: lead.data.source,
              status: lead.data.status,
              priority: lead.data.priority,
              stageId: lead.data.stageId,
              expectedCloseDate: lead.data.expectedCloseDate,
              lostReason: lead.data.lostReason,
              tags: tagsToString(lead.data.tags),
            }
          : null,
        tasks: (tasks.data?.data ?? []).map((t) => [t.id, t.title, t.done, t.dueAt]),
        notes: (notes.data?.data ?? []).map((n) => [n.id, n.body, n.createdAt]),
        activities: (activities.data?.data ?? []).map((a) => [a.id, a.action, a.createdAt]),
        files: (attachments.data ?? []).map((a) => [a.id, a.filename, a.size, a.createdAt]),
      }),
    [lead.data, tasks.data?.data, notes.data?.data, activities.data?.data, attachments.data],
  );

  useEffect(() => {
    if (!id || lead.isLoading || tasks.isLoading || notes.isLoading || activities.isLoading || attachments.isLoading) {
      return;
    }
    if (lead.error || tasks.error || notes.error || activities.error || attachments.error) {
      return;
    }
    if (summaryRefreshKey === lastAutoSummaryKey.current) return;
    lastAutoSummaryKey.current = summaryRefreshKey;
    void runAi("summary");
  }, [
    id,
    lead.isLoading,
    tasks.isLoading,
    notes.isLoading,
    activities.isLoading,
    attachments.isLoading,
    lead.error,
    tasks.error,
    notes.error,
    activities.error,
    attachments.error,
    summaryRefreshKey,
    runAi,
  ]);

  if (lead.isLoading) {
    return <DetailPageSkeleton />;
  }
  if (lead.error || !lead.data) {
    return (
      <p className="text-sm text-red-600">
        {lead.error instanceof Error ? lead.error.message : "Lead not found"}
      </p>
    );
  }

  const L = lead.data;

  const visibleNotes = showAllNotes ? notes.data?.data ?? [] : (notes.data?.data ?? []).slice(0, 3);
  const visibleActivity = showAllActivity
    ? activities.data?.data ?? []
    : (activities.data?.data ?? []).slice(0, 8);

  return (
    <div className="space-y-5">
      <header className="sticky top-3 z-10 rounded-xl border border-zinc-200 bg-white/95 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Lead</p>
            <h1 className="truncate text-2xl font-semibold tracking-tight">{L.title}</h1>
            {L.description && (
              <p className="mt-1 line-clamp-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-300">
                {L.description}
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
              Back
            </Link>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {metaPill("Stage", L.stage.name)}
          {metaPill("Status", L.status)}
          {metaPill("Priority", L.priority)}
          {metaPill(
            "Value",
            L.value != null && L.value !== "" ? `${typeof L.value === "string" ? L.value : L.value} ${L.currency}` : null,
          )}
          {metaPill("Win", L.probability != null ? `${L.probability}%` : null)}
          {metaPill("Source", L.source)}
          {metaPill("Close", compactDate(L.expectedCloseDate))}
          {metaPill("Owner", L.owner ? (L.owner.name ?? L.owner.email) : null)}
        </div>
      </header>

      {editOpen && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold">Edit lead</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Title
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Stage
              <select
                value={editStageId}
                onChange={(e) => setEditStageId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
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
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
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
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Company
              <select
                value={editCompanyId}
                onChange={(e) => setEditCompanyId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
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
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              >
                <option value="">— None —</option>
                {contacts.data?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 sm:col-span-2">
              Description
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Currency
              <input
                value={editCurrency}
                onChange={(e) => setEditCurrency(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm uppercase dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Win probability (0–100)
              <input
                type="number"
                min={0}
                max={100}
                value={editProbability}
                onChange={(e) => setEditProbability(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Source
              <input
                value={editSource}
                onChange={(e) => setEditSource(e.target.value)}
                placeholder="e.g. inbound, referral"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Status
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Expected close
              <input
                type="date"
                value={editExpectedClose}
                onChange={(e) => setEditExpectedClose(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 sm:col-span-2">
              Tags (comma-separated)
              <input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              />
            </label>
            {editStatus === "LOST" && (
              <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 sm:col-span-2">
                Lost reason
                <input
                  value={editLostReason}
                  onChange={(e) => setEditLostReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                />
              </label>
            )}
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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Tasks</h2>
              <span className="text-xs text-zinc-500">{tasks.data?.meta.total ?? 0} total</span>
            </div>
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
                placeholder="Add a next step…"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              />
              <button
                type="submit"
                disabled={addTask.isPending}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Add
              </button>
            </form>
            <ul className="mt-3 space-y-2">
              {tasks.data?.data.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <label className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={(e) => toggleTask.mutate({ taskId: t.id, done: e.target.checked })}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    <span className={`truncate ${t.done ? "text-zinc-400 line-through" : ""}`}>{t.title}</span>
                  </label>
                  {t.dueAt && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {compactDate(t.dueAt)}
                    </span>
                  )}
                </li>
              ))}
              {tasks.data?.data.length === 0 && (
                <li className="text-sm text-zinc-500">No open tasks yet.</li>
              )}
            </ul>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Notes</h2>
              <span className="text-xs text-zinc-500">{notes.data?.meta.total ?? 0} total</span>
            </div>
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
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              />
              <button
                type="submit"
                disabled={addNote.isPending || !noteText.trim()}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {addNote.isPending ? "Saving…" : "Add note"}
              </button>
            </form>
            <ul className="mt-4 space-y-2">
              {visibleNotes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <p className="line-clamp-4 whitespace-pre-wrap">{n.body}</p>
                  <p className="mt-1 text-xs text-zinc-400">{compactDate(n.createdAt)}</p>
                </li>
              ))}
            </ul>
            {(notes.data?.data.length ?? 0) > 3 && (
              <button
                type="button"
                className="mt-3 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                onClick={() => setShowAllNotes((v) => !v)}
              >
                {showAllNotes ? "Show fewer notes" : "Show all notes"}
              </button>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold">Deal context</h2>
            <div className="mt-3 space-y-2 text-sm">
              {L.company ? (
                <Link href={`/app/companies/${L.company.id}`} className="block text-blue-600 hover:underline dark:text-blue-400">
                  Company: {L.company.name}
                </Link>
              ) : (
                <p className="text-zinc-500">No company linked</p>
              )}
              {L.contact ? (
                <Link href={`/app/contacts/${L.contact.id}`} className="block text-blue-600 hover:underline dark:text-blue-400">
                  Contact: {L.contact.firstName} {L.contact.lastName}
                </Link>
              ) : (
                <p className="text-zinc-500">No contact linked</p>
              )}
              {tagsToString(L.tags) && <p className="text-xs text-zinc-500">Tags: {tagsToString(L.tags)}</p>}
              {L.status === "LOST" && L.lostReason && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                  Lost reason: {L.lostReason}
                </p>
              )}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900" aria-busy={!!aiLoading}>
            <AiSectionTitle title="AI assistant" subtitle="Insights and drafts." />
            {aiError && <p className="text-sm text-red-600 dark:text-red-400">{aiError}</p>}
            <div className="flex flex-wrap gap-2">
              {aiTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setAiTab(tab)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    aiTab === tab
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
                  }`}
                >
                  {tab === "summary" ? "Summary" : tab === "actions" ? "Actions" : "Draft"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {aiTab === "draft" && (
                <select
                  value={draftChannel}
                  onChange={(e) => setDraftChannel(e.target.value as "email" | "linkedin")}
                  disabled={!!aiLoading}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              )}
              {aiTab === "summary" ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Auto-refreshes whenever lead data, tasks, notes, activity, or files change.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void runAi(aiTab === "actions" ? "next" : "outreach")}
                  disabled={!!aiLoading}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  {aiLoading ? "Generating…" : `Generate ${aiTab}`}
                </button>
              )}
            </div>
            {aiTab === "summary" && (summary || aiLoading === "summary") && (
              <AiResponsePanel variant="summary" label="Summary" loading={aiLoading === "summary"}>
                {summary ?? ""}
              </AiResponsePanel>
            )}
            {aiTab === "actions" && (
              <AiResponsePanel variant="actions" label="Suggested actions" loading={aiLoading === "next"}>
                {actions ?? ""}
              </AiResponsePanel>
            )}
            {aiTab === "draft" && (
              <AiResponsePanel variant="draft" label="Outreach draft" loading={aiLoading === "outreach"}>
                {draft ?? ""}
              </AiResponsePanel>
            )}
          </section>

          <AttachmentSection parentType="LEAD" parentId={id} queryKey={["lead", id]} />

          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold">Activity</h2>
            {activities.isLoading ? (
              <TimelineSkeleton />
            ) : (
              <div className="mt-3">
                <ActivityTimeline items={visibleActivity} />
              </div>
            )}
            {(activities.data?.data.length ?? 0) > 8 && (
              <button
                type="button"
                className="mt-3 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                onClick={() => setShowAllActivity((v) => !v)}
              >
                {showAllActivity ? "Show less activity" : "Show full activity"}
              </button>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
