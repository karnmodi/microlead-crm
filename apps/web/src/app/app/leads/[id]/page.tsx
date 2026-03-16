"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityTimeline, type ActivityRow } from "@/components/ActivityTimeline";
import { AiResponsePanel, AiSectionTitle } from "@/components/AiResponsePanel";
import { DetailPageSkeleton, TimelineSkeleton } from "@/components/page-skeletons";
import { AttachmentSection } from "@/components/AttachmentSection";
import { LeadForm, type LeadFormValues } from "@/components/LeadForm";
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
  data: Array<{
    id: string;
    title: string;
    done: boolean;
    dueAt: string | null;
    updatedAt: string;
  }>;
  meta: { total: number };
};

type AiNextActionsRes = {
  actions: string;
  actionsMarkdown?: string;
  actionItems?: string[];
  actionItemsDetailed?: Array<{ title: string; dueAt?: string | null }>;
  reasoningSummary?: string;
  taskCandidates?: Array<{ title: string; dueAt?: string | null }> | string[];
};
type AiSummaryRes = { summary: string; summaryMarkdown?: string; cached?: boolean };
type AiDraftRes = { draft: string; draftMarkdown?: string; subject?: string; body?: string };
function tagsToString(tags: unknown): string {
  if (tags == null) return "";
  if (Array.isArray(tags) && tags.every((t) => typeof t === "string")) return tags.join(", ");
  return "";
}

function compactDate(value: string | null) {
  if (!value) return null;
  return value.slice(0, 10);
}

function compactDateTime(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildLinkedinComposeUrl(message: string): string {
  return `https://www.linkedin.com/messaging/compose/?body=${encodeURIComponent(message)}`;
}

type AiTaskCandidate = { title: string; dueAt: string | null };

function normalizeTaskCandidates(
  candidates: Array<{ title: string; dueAt?: string | null }> | string[],
): AiTaskCandidate[] {
  const out: AiTaskCandidate[] = [];
  for (const raw of candidates) {
    if (typeof raw === "string") {
      const text = raw.trim().replace(/^\d+\.\s*/, "");
      if (!text) continue;
      out.push({ title: text, dueAt: null });
      continue;
    }
    const title = raw?.title?.trim().replace(/^\d+\.\s*/, "");
    if (!title) continue;
    const dueAt =
      typeof raw.dueAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dueAt.trim())
        ? raw.dueAt.trim()
        : null;
    out.push({ title, dueAt });
  }
  const deduped = new Map<string, AiTaskCandidate>();
  for (const item of out) {
    const key = item.title.toLowerCase();
    if (!deduped.has(key)) deduped.set(key, item);
  }
  return Array.from(deduped.values());
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
    onMutate: () => {
      setNoteText("");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notes", "LEAD", id] });
      void qc.invalidateQueries({ queryKey: ["activities", "LEAD", id] });
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState<LeadFormValues>({
    title: "",
    stageId: "",
    priority: "MEDIUM",
    status: "OPEN",
    value: "",
    currency: "USD",
    companyId: "",
    contactId: "",
    description: "",
    source: "",
    tags: "",
    expectedClose: "",
    lostReason: "",
  });

  function openEdit() {
    if (!lead.data) return;
    const L = lead.data;
    setEditValues({
      title: L.title,
      stageId: L.stageId,
      priority: L.priority,
      status: L.status ?? "OPEN",
      value: L.value != null ? String(L.value) : "",
      currency: L.currency ?? "USD",
      companyId: L.companyId ?? "",
      contactId: L.contactId ?? "",
      description: L.description ?? "",
      source: L.source ?? "",
      tags: tagsToString(L.tags),
      expectedClose: L.expectedCloseDate ? L.expectedCloseDate.slice(0, 10) : "",
      lostReason: L.lostReason ?? "",
    });
    setEditOpen(true);
  }

  const saveLead = useMutation({
    mutationFn: () => {
      const tags = editValues.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return api(`/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editValues.title,
          stageId: editValues.stageId,
          priority: editValues.priority,
          value: editValues.value.trim() === "" ? null : Number(editValues.value),
          companyId: editValues.companyId || null,
          contactId: editValues.contactId || null,
          description: editValues.description.trim() || null,
          currency: editValues.currency.trim() || "USD",
          source: editValues.source.trim() || null,
          status: editValues.status,
          expectedCloseDate: editValues.expectedClose
            ? `${editValues.expectedClose}T12:00:00.000Z`
            : null,
          tags,
          lostReason:
            editValues.status === "LOST" ? editValues.lostReason?.trim() || null : null,
        }),
      });
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["lead", id] });
      const prev = qc.getQueryData<LeadDetail>(["lead", id]);
      qc.setQueryData<LeadDetail>(["lead", id], (old) =>
        old
          ? {
              ...old,
              title: editValues.title,
              stageId: editValues.stageId,
              priority: editValues.priority,
              value: editValues.value.trim() === "" ? null : Number(editValues.value),
              companyId: editValues.companyId || null,
              contactId: editValues.contactId || null,
              description: editValues.description.trim() || null,
              currency: editValues.currency.trim() || "USD",
              source: editValues.source.trim() || null,
              status: editValues.status ?? "OPEN",
              expectedCloseDate: editValues.expectedClose
                ? `${editValues.expectedClose}T12:00:00.000Z`
                : null,
              lostReason:
                editValues.status === "LOST"
                  ? editValues.lostReason?.trim() || null
                  : null,
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["lead", id], ctx.prev);
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
    onMutate: async ({ taskId, done }) => {
      await qc.cancelQueries({ queryKey: ["tasks", "LEAD", id] });
      const prev = qc.getQueryData<TasksRes>(["tasks", "LEAD", id]);
      qc.setQueryData<TasksRes>(["tasks", "LEAD", id], (old) =>
        old
          ? {
              ...old,
              data: old.data.map((t) =>
                t.id === taskId ? { ...t, done, updatedAt: new Date().toISOString() } : t,
              ),
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks", "LEAD", id], ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks", "LEAD", id] });
      void qc.invalidateQueries({ queryKey: ["activities", "LEAD", id] });
    },
  });

  const addTask = useMutation({
    mutationFn: ({ title, dueAt }: { title: string; dueAt: string }) =>
      api("/tasks", {
        method: "POST",
        body: JSON.stringify({
          parentType: "LEAD",
          parentId: id,
          title,
          dueAt: dueAt ? `${dueAt}T12:00:00.000Z` : null,
        }),
      }),
    onMutate: async ({ title, dueAt }) => {
      await qc.cancelQueries({ queryKey: ["tasks", "LEAD", id] });
      const prev = qc.getQueryData<TasksRes>(["tasks", "LEAD", id]);
      const tempId = `temp-${Date.now()}`;
      qc.setQueryData<TasksRes>(["tasks", "LEAD", id], (old) =>
        old
          ? {
              ...old,
              data: [
                {
                  id: tempId,
                  title,
                  done: false,
                  dueAt: dueAt ? `${dueAt}T12:00:00.000Z` : null,
                  updatedAt: new Date().toISOString(),
                },
                ...old.data,
              ],
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks", "LEAD", id], ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks", "LEAD", id] });
      void qc.invalidateQueries({ queryKey: ["activities", "LEAD", id] });
    },
  });

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueAt, setNewTaskDueAt] = useState("");
  const [taskSubmitAttempted, setTaskSubmitAttempted] = useState(false);

  const [summary, setSummary] = useState<string | null>(null);
  const [actionsReasoning, setActionsReasoning] = useState<string | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [linkedinMessage, setLinkedinMessage] = useState("");
  const [actionItems, setActionItems] = useState<AiTaskCandidate[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [draftChannel, setDraftChannel] = useState<"email" | "linkedin">("email");
  const [aiLoading, setAiLoading] = useState<{
    summary: boolean;
    next: boolean;
    outreach: boolean;
  }>({
    summary: false,
    next: false,
    outreach: false,
  });
  const [aiError, setAiError] = useState<string | null>(null);
  const [actionCreateNotice, setActionCreateNotice] = useState<string | null>(null);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showAiInsight, setShowAiInsight] = useState(false);
  const autoSummaryRequestedForId = useRef<string | null>(null);

  const [winProb, setWinProb] = useState<{
    score: number | null;
    reasoning: string;
    loading: boolean;
  }>({ score: null, reasoning: "", loading: false });
  const winProbRequestedForId = useRef<string | null>(null);

  const refreshWinProbability = useCallback(async () => {
    setWinProb((prev) => ({ ...prev, loading: true }));
    try {
      const r = await api<{ score: number | null; reasoning: string }>(
        "/ai/win-probability",
        { method: "POST", body: JSON.stringify({ leadId: id }) },
      );
      setWinProb({ score: r.score, reasoning: r.reasoning, loading: false });
      void qc.invalidateQueries({ queryKey: ["lead", id] });
    } catch {
      setWinProb((prev) => ({ ...prev, loading: false }));
    }
  }, [id, qc]);

  const runAi = useCallback(async (kind: "summary" | "next" | "outreach") => {
    setAiError(null);
    setAiLoading((prev) => ({ ...prev, [kind]: true }));
    try {
      if (kind === "summary") {
        const r = await api<AiSummaryRes>("/ai/lead-summary", {
          method: "POST",
          body: JSON.stringify({ leadId: id }),
        });
        setSummary(r.summaryMarkdown ?? r.summary);
      } else if (kind === "next") {
        const r = await api<AiNextActionsRes>("/ai/next-actions", {
          method: "POST",
          body: JSON.stringify({ leadId: id }),
        });
        const sourceCandidates = r.actionItemsDetailed ?? r.taskCandidates ?? r.actionItems ?? [];
        const parsedItems = normalizeTaskCandidates(sourceCandidates);
        setActionsReasoning(r.reasoningSummary ?? null);
        setActionItems(parsedItems);
        setSelectedActions(parsedItems.map((item) => item.title));
      } else {
        const r = await api<AiDraftRes>("/ai/outreach-draft", {
          method: "POST",
          body: JSON.stringify({ leadId: id, channel: draftChannel }),
        });
        if (draftChannel === "email") {
          setEmailSubject((r.subject ?? "").trim());
          setEmailBody((r.body ?? r.draftMarkdown ?? r.draft).trim());
        } else {
          setLinkedinMessage((r.body ?? r.draftMarkdown ?? r.draft).trim());
        }
      }
    } catch (e) {
      const err = e as Error & { code?: string };
      setAiError(
        err.code === "AI_NOT_CONFIGURED" || err.message.includes("not configured")
          ? "AI is not configured (set Azure OpenAI or OPENAI_API_KEY on the API)."
          : err.message,
      );
    } finally {
      setAiLoading((prev) => ({ ...prev, [kind]: false }));
    }
  }, [id, draftChannel]);

  const createTasksFromActions = useMutation({
    mutationFn: () =>
      api<{
        createdCount: number;
        skippedCount: number;
      }>("/ai/actions-to-tasks", {
        method: "POST",
        body: JSON.stringify({
          leadId: id,
          actionItems: selectedActions,
          actionItemsDetailed: actionItems.filter((item) =>
            selectedActions.includes(item.title),
          ),
        }),
      }),
    onMutate: () => {
      setActionCreateNotice("Creating selected tasks in background...");
    },
    onSuccess: (r) => {
      setActionCreateNotice(`Created ${r.createdCount} task(s), skipped ${r.skippedCount}.`);
      setActionItems([]);
      setSelectedActions([]);
      setActionsReasoning(null);
      void qc.invalidateQueries({ queryKey: ["tasks", "LEAD", id] });
      void qc.invalidateQueries({ queryKey: ["activities", "LEAD", id] });
    },
  });

  const sendDraftEmail = useMutation({
    mutationFn: () =>
      api("/ai/send-draft-email", {
        method: "POST",
        body: JSON.stringify({
          leadId: id,
          subject: emailSubject,
          body: emailBody,
        }),
      }),
    onSuccess: () => {
      void runAi("summary");
      void qc.invalidateQueries({ queryKey: ["activities", "LEAD", id] });
    },
  });

  const logLinkedinIntent = useMutation({
    mutationFn: () =>
      api("/ai/log-linkedin-intent", {
        method: "POST",
        body: JSON.stringify({ leadId: id, message: linkedinMessage }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["activities", "LEAD", id] });
    },
  });

  useEffect(() => {
    if (!id || lead.isLoading || lead.error) {
      return;
    }
    if (autoSummaryRequestedForId.current === id) {
      return;
    }
    autoSummaryRequestedForId.current = id;
    void runAi("summary");
  }, [id, lead.isLoading, lead.error, runAi]);

  useEffect(() => {
    if (!id || lead.isLoading || lead.error) return;
    if (winProbRequestedForId.current === id) return;
    winProbRequestedForId.current = id;
    const stored = lead.data?.probability;
    if (stored != null) {
      setWinProb({ score: stored, reasoning: "", loading: false });
    } else {
      void refreshWinProbability();
    }
  }, [id, lead.isLoading, lead.error, lead.data?.probability, refreshWinProbability]);

  const sortedLeadTasks = useMemo(() => {
    const list = tasks.data?.data ?? [];
    return [...list].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [tasks.data?.data]);

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
  const trimmedNewTaskTitle = newTaskTitle.trim();

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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {metaPill("Stage", L.stage.name)}
          {metaPill("Status", L.status)}
          {metaPill("Priority", L.priority)}
          {metaPill(
            "Value",
            L.value != null && L.value !== "" ? `${typeof L.value === "string" ? L.value : L.value} ${L.currency}` : null,
          )}
          {/* AI Win Probability Ring */}
          <button
            type="button"
            title={winProb.reasoning || "Click to refresh AI win probability"}
            onClick={() => void refreshWinProbability()}
            disabled={winProb.loading}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-wait dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <svg
              viewBox="0 0 28 28"
              className={`h-6 w-6 shrink-0 ${winProb.loading ? "animate-spin opacity-50" : ""}`}
              aria-hidden
            >
              <circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
              {winProb.score != null && (
                <circle
                  cx="14"
                  cy="14"
                  r="11"
                  fill="none"
                  stroke={winProb.score >= 70 ? "#22c55e" : winProb.score >= 40 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="3"
                  strokeDasharray={`${(winProb.score / 100) * 69.12} 69.12`}
                  strokeLinecap="round"
                  transform="rotate(-90 14 14)"
                />
              )}
              <text x="14" y="18" textAnchor="middle" fontSize="8" fill="currentColor" fontWeight="600">
                {winProb.loading ? "…" : winProb.score != null ? `${winProb.score}%` : "AI"}
              </text>
            </svg>
            <span>Win</span>
          </button>
          {metaPill("Source", L.source)}
          {metaPill("Close", compactDate(L.expectedCloseDate))}
          {metaPill("Owner", L.owner ? (L.owner.name ?? L.owner.email) : null)}
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowAiInsight((prev) => !prev)}
            className="group inline-flex items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-expanded={showAiInsight}
            aria-label={showAiInsight ? "Collapse AI powered lead insight" : "Expand AI powered lead insight"}
          >
            <AiSectionTitle title="AI Powered Lead Insight" loading={aiLoading.summary} />
            <span
              className={`text-zinc-500 transition-transform duration-200 dark:text-zinc-400 ${
                showAiInsight ? "rotate-180" : "rotate-0"
              }`}
              aria-hidden
            >
              ▼
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void runAi("summary")}
              disabled={aiLoading.summary}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
            >
              {aiLoading.summary ? "Refreshing..." : "Refresh summary"}
            </button>
          </div>
        </div>
        {aiError && showAiInsight && (
          <p className="text-sm text-red-600 dark:text-red-400">{aiError}</p>
        )}
        {showAiInsight && (
          <AiResponsePanel variant="summary" label="Lead insight" loading={aiLoading.summary} markdown={summary ?? ""}>
            {summary ?? ""}
          </AiResponsePanel>
        )}
      </section>

      {editOpen && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Edit lead</h2>
            <p className="text-xs text-zinc-500">Win % is computed by AI — not editable here.</p>
          </div>
          <LeadForm
            mode="edit"
            values={editValues}
            onChange={(patch) => setEditValues((v) => ({ ...v, ...patch }))}
            stages={stages.data ?? []}
            companies={companies.data?.data ?? []}
            contacts={contacts.data?.data ?? []}
            onSubmit={() => saveLead.mutate()}
            onCancel={() => setEditOpen(false)}
            isPending={saveLead.isPending}
            isError={saveLead.isError}
            errorMessage={
              saveLead.error instanceof Error ? saveLead.error.message : undefined
            }
          />
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Tasks</h2>
              <span className="text-xs text-zinc-500">{tasks.data?.meta.total ?? 0} total</span>
            </div>
            <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50/70 p-3 dark:border-sky-900 dark:bg-sky-950/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-sky-900 dark:text-sky-200">AI Next Actions</p>
                <button
                  type="button"
                  onClick={() => void runAi("next")}
                  disabled={aiLoading.next}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  {aiLoading.next ? "Generating..." : "Generate actions"}
                </button>
              </div>
              {!!actionsReasoning && (
                <div className="mt-2">
                  <AiResponsePanel
                    variant="actions"
                    label="Reasoning"
                    markdown={actionsReasoning}
                  >
                    {actionsReasoning}
                  </AiResponsePanel>
                </div>
              )}
              {!!actionItems.length && (
                <div className="mt-2 space-y-2">
                  {actionItems.map((item) => (
                    <label key={`${item.title}:${item.dueAt ?? "none"}`} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedActions.includes(item.title)}
                        onChange={(e) =>
                          setSelectedActions((prev) =>
                            e.target.checked
                              ? [...prev, item.title]
                              : prev.filter((x) => x !== item.title),
                          )
                        }
                        className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                      />
                      <span>
                        {item.title}
                        {item.dueAt ? (
                          <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                            (Due {item.dueAt})
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                  <button
                    type="button"
                    disabled={!selectedActions.length}
                    onClick={() => createTasksFromActions.mutate()}
                    className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Create selected tasks
                  </button>
                  {actionCreateNotice && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">{actionCreateNotice}</p>
                  )}
                </div>
              )}
            </div>
            <form
              className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                setTaskSubmitAttempted(true);
                if (!trimmedNewTaskTitle) return;
                addTask.mutate({ title: trimmedNewTaskTitle, dueAt: newTaskDueAt });
                setNewTaskTitle("");
                setNewTaskDueAt("");
                setTaskSubmitAttempted(false);
              }}
            >
              <input
                placeholder="Add a next step…"
                value={newTaskTitle}
                onChange={(e) => {
                  setNewTaskTitle(e.target.value);
                  if (taskSubmitAttempted) setTaskSubmitAttempted(false);
                }}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              />
              <label className="w-full text-[11px] text-zinc-500 dark:text-zinc-400">
                Due date (optional)
                <input
                  type="date"
                  value={newTaskDueAt}
                  onChange={(e) => setNewTaskDueAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                />
              </label>
              <button
                type="submit"
                disabled={addTask.isPending || !trimmedNewTaskTitle}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Add
              </button>
            </form>
            {taskSubmitAttempted && !trimmedNewTaskTitle && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Task title is required.
              </p>
            )}
            <ul className="mt-3 space-y-2">
              {sortedLeadTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                >
                  <label className="flex min-w-0 flex-1 items-start gap-2">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={(e) => toggleTask.mutate({ taskId: t.id, done: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                    />
                    <span className={`whitespace-normal break-words ${t.done ? "text-zinc-400 line-through" : ""}`}>{t.title}</span>
                  </label>
                  {t.done ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      Completed on {compactDateTime(t.updatedAt)}
                    </span>
                  ) : t.dueAt ? (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      Expected by {compactDate(t.dueAt)}
                    </span>
                  ) : null}
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

          <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Outreach composer</h2>
              <div className="flex items-center gap-2">
                <select
                  value={draftChannel}
                  onChange={(e) => setDraftChannel(e.target.value as "email" | "linkedin")}
                  disabled={aiLoading.outreach}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
                <button
                  type="button"
                  onClick={() => void runAi("outreach")}
                  disabled={aiLoading.outreach}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  {aiLoading.outreach ? "Generating..." : "Generate draft"}
                </button>
              </div>
            </div>
            {draftChannel === "email" ? (
              <div className="space-y-2">
                <input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                />
                <textarea
                  rows={7}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Write your email..."
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                />
                {!L.contact?.email && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Add a contact email on this lead to send emails.
                  </p>
                )}
                <button
                  type="button"
                  disabled={!emailSubject.trim() || !emailBody.trim() || !L.contact?.email || sendDraftEmail.isPending}
                  onClick={() => sendDraftEmail.mutate()}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {sendDraftEmail.isPending ? "Sending..." : "Send Email"}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={7}
                  value={linkedinMessage}
                  onChange={(e) => setLinkedinMessage(e.target.value)}
                  placeholder="Write your LinkedIn message..."
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  disabled={!linkedinMessage.trim() || logLinkedinIntent.isPending}
                  onClick={() => {
                    logLinkedinIntent.mutate();
                    window.open(buildLinkedinComposeUrl(linkedinMessage), "_blank", "noopener,noreferrer");
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  {logLinkedinIntent.isPending ? "Opening..." : "Open in LinkedIn"}
                </button>
              </div>
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
