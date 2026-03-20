"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { ActivityTimeline, type ActivityRow } from "@/components/ActivityTimeline";
import { AiResponsePanel, AiSectionTitle } from "@/components/AiResponsePanel";
import { DetailPageSkeleton } from "@/components/page-skeletons";
import { AttachmentSection } from "@/components/AttachmentSection";
import { ContactForm, type ContactFormValues } from "@/components/ContactForm";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type CompanyLink = {
  id: string;
  companyId: string;
  role: string | null;
  isPrimary: boolean;
  company: { id: string; name: string; companyNumber: string | null };
};

type ContactDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  companyId: string | null;
  company: { id: string; name: string; companyNumber: string | null } | null;
  companyLinks: CompanyLink[];
};

type ActivitiesRes = { data: ActivityRow[] };
type NotesRes = { data: Array<{ id: string; body: string; createdAt: string }> };
type TasksRes = { data: Array<{ id: string; title: string; done: boolean }> };
type CompanyOption = { id: string; name: string };

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: "bg-violet-500", text: "text-white" },
  { bg: "bg-sky-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-indigo-500", text: "text-white" },
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

// ─── Link Company Modal ───────────────────────────────────────────────────────

function LinkCompanyModal({
  companies,
  existingIds,
  onLink,
  onClose,
  isPending,
  error,
}: {
  companies: CompanyOption[];
  existingIds: Set<string>;
  onLink: (companyId: string, role: string) => void;
  onClose: () => void;
  isPending: boolean;
  error: string | null;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string>("");
  const [role, setRole] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return companies.filter(
      (c) => !existingIds.has(c.id) && c.name.toLowerCase().includes(q),
    );
  }, [companies, search, existingIds]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Link a company</h3>
        <p className="mt-1 text-xs text-zinc-500">Choose a company and optionally add their role there.</p>

        <div className="mt-4 space-y-3">
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies…"
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="max-h-44 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            {filtered.length === 0 ? (
              <p className="p-3 text-xs text-zinc-400">
                {search ? `No companies match "${search}"` : "All companies are already linked"}
              </p>
            ) : (
              <ul>
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(c.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm transition ${
                        selected === c.id
                          ? "bg-violet-50 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
                          : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-100 text-xs font-medium text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                      {c.name}
                      {selected === c.id && (
                        <svg className="ml-auto h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Role at this company <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Director, Consultant, Advisor…"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected || isPending}
            onClick={() => onLink(selected, role)}
            className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-40"
          >
            {isPending ? "Linking…" : "Link company"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Companies Section ────────────────────────────────────────────────────────

function CompaniesSection({
  links,
  contactId,
  onRefresh,
}: {
  links: CompanyLink[];
  contactId: string;
  onRefresh: () => void;
}) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const allCompanies = useQuery({
    queryKey: ["companies", "options"],
    queryFn: () => api<{ data: CompanyOption[] }>("/companies?limit=200"),
    enabled: showModal,
  });

  const existingIds = useMemo(() => new Set(links.map((l) => l.companyId)), [links]);

  const linkMutation = useMutation({
    mutationFn: ({ companyId, role }: { companyId: string; role: string }) =>
      api(`/contacts/${contactId}/companies`, {
        method: "POST",
        body: JSON.stringify({ companyId, role: role || undefined }),
      }),
    onSuccess: () => {
      setShowModal(false);
      onRefresh();
      void qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (companyId: string) =>
      api(`/contacts/${contactId}/companies/${companyId}`, { method: "DELETE" }),
    onSuccess: () => {
      onRefresh();
      void qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (companyId: string) =>
      api(`/contacts/${contactId}/companies/primary`, {
        method: "PATCH",
        body: JSON.stringify({ companyId }),
      }),
    onSuccess: () => {
      onRefresh();
    },
  });

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Companies</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {links.length === 0
              ? "Not linked to any company yet."
              : `Linked to ${links.length} compan${links.length === 1 ? "y" : "ies"}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Link company
        </button>
      </div>

      {links.length === 0 ? (
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 py-6 text-sm text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-600"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0H5m14 0h2m-2 0h-2M5 21H3m2 0h2" />
          </svg>
          Link to a company
        </button>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                link.isPrimary
                  ? "border-violet-200 bg-violet-50 dark:border-violet-900/40 dark:bg-violet-900/10"
                  : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/40"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-zinc-900">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-zinc-500">
                  <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0H5m14 0h2m-2 0h-2M5 21H3m2 0h2M9 7h1m-1 4h1m4-4h1m-1 4h1" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/app/companies/${link.companyId}`}
                    className="truncate font-medium text-sm text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {link.company.name}
                  </Link>
                  {link.isPrimary && (
                    <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                      Primary
                    </span>
                  )}
                </div>
                {link.role && (
                  <p className="mt-0.5 truncate text-xs text-zinc-500">{link.role}</p>
                )}
                {link.company.companyNumber && (
                  <p className="truncate text-xs text-zinc-400 font-mono">{link.company.companyNumber}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!link.isPrimary && (
                  <button
                    type="button"
                    title="Set as primary company"
                    onClick={() => setPrimaryMutation.mutate(link.companyId)}
                    disabled={setPrimaryMutation.isPending}
                    className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-200 hover:text-violet-600 disabled:opacity-40 dark:hover:bg-zinc-700"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  title="Unlink from this company"
                  onClick={() => {
                    if (confirm(`Unlink from ${link.company.name}?`)) {
                      unlinkMutation.mutate(link.companyId);
                    }
                  }}
                  disabled={unlinkMutation.isPending}
                  className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <LinkCompanyModal
          companies={allCompanies.data?.data ?? []}
          existingIds={existingIds}
          onLink={(companyId, role) => linkMutation.mutate({ companyId, role })}
          onClose={() => setShowModal(false)}
          isPending={linkMutation.isPending}
          error={linkMutation.isError ? (linkMutation.error instanceof Error ? linkMutation.error.message : "Failed to link") : null}
        />
      )}
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContactDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const qc = useQueryClient();

  const contact = useQuery({
    queryKey: ["contact", id],
    queryFn: () => api<ContactDetail>(`/contacts/${id}`),
    enabled: !!id,
  });

  const activities = useQuery({
    queryKey: ["activities", "CONTACT", id],
    queryFn: () =>
      api<ActivitiesRes>(`/activities?entityType=CONTACT&entityId=${encodeURIComponent(id)}&limit=50`),
    enabled: !!id,
  });

  const notes = useQuery({
    queryKey: ["notes", "CONTACT", id],
    queryFn: () =>
      api<NotesRes>(`/notes?parentType=CONTACT&parentId=${encodeURIComponent(id)}&limit=30`),
    enabled: !!id,
  });

  const tasks = useQuery({
    queryKey: ["tasks", "CONTACT", id],
    queryFn: () =>
      api<TasksRes>(`/tasks?parentType=CONTACT&parentId=${encodeURIComponent(id)}&limit=50`),
    enabled: !!id,
  });

  const allCompanies = useQuery({
    queryKey: ["companies", "options"],
    queryFn: () => api<{ data: CompanyOption[] }>("/companies?limit=200"),
    enabled: false, // loaded on demand in modals
  });

  const [noteText, setNoteText] = useState("");
  const addNote = useMutation({
    mutationFn: () =>
      api("/notes", {
        method: "POST",
        body: JSON.stringify({ parentType: "CONTACT", parentId: id, text: noteText }),
      }),
    onMutate: () => setNoteText(""),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notes", "CONTACT", id] });
      void qc.invalidateQueries({ queryKey: ["activities", "CONTACT", id] });
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editValues, setEditValues] = useState<ContactFormValues>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyId: "",
    jobTitle: "",
    linkedinUrl: "",
  });

  function openEdit() {
    if (!contact.data) return;
    setEditValues({
      firstName: contact.data.firstName,
      lastName: contact.data.lastName,
      email: contact.data.email ?? "",
      phone: contact.data.phone ?? "",
      companyId: contact.data.companyId ?? "",
      jobTitle: contact.data.jobTitle ?? "",
      linkedinUrl: contact.data.linkedinUrl ?? "",
    });
    setEditOpen(true);
  }

  const save = useMutation({
    mutationFn: () =>
      api(`/contacts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: editValues.firstName.trim(),
          lastName: editValues.lastName.trim(),
          email: editValues.email.trim() || undefined,
          phone: editValues.phone.trim() || undefined,
          companyId: editValues.companyId || null,
          jobTitle: editValues.jobTitle.trim() || undefined,
          linkedinUrl: editValues.linkedinUrl.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      setEditOpen(false);
      void qc.invalidateQueries({ queryKey: ["contact", id] });
      void qc.invalidateQueries({ queryKey: ["contacts"] });
      void qc.invalidateQueries({ queryKey: ["activities", "CONTACT", id] });
    },
  });

  const remove = useMutation({
    mutationFn: () => api(`/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["contacts"] });
      router.replace("/app/contacts");
    },
  });

  const toggleTask = useMutation({
    mutationFn: ({ taskId, done }: { taskId: string; done: boolean }) =>
      api(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ done }) }),
    onMutate: async ({ taskId, done }) => {
      await qc.cancelQueries({ queryKey: ["tasks", "CONTACT", id] });
      const prev = qc.getQueryData<TasksRes>(["tasks", "CONTACT", id]);
      qc.setQueryData<TasksRes>(["tasks", "CONTACT", id], (old) =>
        old ? { ...old, data: old.data.map((t) => (t.id === taskId ? { ...t, done } : t)) } : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks", "CONTACT", id], ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks", "CONTACT", id] });
      void qc.invalidateQueries({ queryKey: ["activities", "CONTACT", id] });
    },
  });

  const addTask = useMutation({
    mutationFn: (title: string) =>
      api("/tasks", {
        method: "POST",
        body: JSON.stringify({ parentType: "CONTACT", parentId: id, title }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks", "CONTACT", id] });
    },
  });

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [actions, setActions] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function runNextActions() {
    setAiError(null);
    setAiLoading(true);
    try {
      const r = await api<{ actions: string }>("/ai/next-actions", {
        method: "POST",
        body: JSON.stringify({ contactId: id }),
      });
      setActions(r.actions);
    } catch (e) {
      const err = e as Error & { code?: string };
      setAiError(
        err.code === "AI_NOT_CONFIGURED" || err.message.includes("not configured")
          ? "AI is not configured (set Azure OpenAI or OPENAI_API_KEY on the API)."
          : err.message,
      );
    } finally {
      setAiLoading(false);
    }
  }

  if (contact.isLoading) return <DetailPageSkeleton />;
  if (contact.error || !contact.data) {
    return (
      <p className="text-sm text-red-600">
        {contact.error instanceof Error ? contact.error.message : "Not found"}
      </p>
    );
  }

  const C = contact.data;
  const fullName = `${C.firstName} ${C.lastName}`;
  const color = avatarColor(fullName);
  const primaryLink = C.companyLinks.find((l) => l.isPrimary) ?? C.companyLinks[0] ?? null;
  const doneTasks = tasks.data?.data.filter((t) => t.done).length ?? 0;
  const totalTasks = tasks.data?.data.length ?? 0;

  return (
    <div className="space-y-8">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* Top accent stripe */}
        <div className="h-2 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500" />

        <div className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            {/* Avatar + Identity */}
            <div className="flex items-start gap-5">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold shadow-sm ${color.bg} ${color.text}`}
              >
                {initials(C.firstName, C.lastName)}
              </div>

              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {fullName}
                </h1>

                {/* Job title + primary company */}
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-zinc-500">
                  {C.jobTitle && <span>{C.jobTitle}</span>}
                  {C.jobTitle && primaryLink && (
                    <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  )}
                  {primaryLink && (
                    <Link
                      href={`/app/companies/${primaryLink.companyId}`}
                      className="font-medium text-violet-600 hover:underline dark:text-violet-400"
                    >
                      {primaryLink.company.name}
                    </Link>
                  )}
                  {C.companyLinks.length > 1 && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                      +{C.companyLinks.length - 1} more
                    </span>
                  )}
                </div>

                {/* Contact details row */}
                <div className="mt-3 flex flex-wrap gap-3">
                  {C.email && (
                    <a
                      href={`mailto:${C.email}`}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      {C.email}
                    </a>
                  )}
                  {C.phone && (
                    <a
                      href={`tel:${C.phone}`}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.83a16 16 0 0 0 6.29 6.29l.95-.93a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.18z" />
                      </svg>
                      {C.phone}
                    </a>
                  )}
                  {C.linkedinUrl && (
                    <a
                      href={C.linkedinUrl.startsWith("http") ? C.linkedinUrl : `https://${C.linkedinUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z" />
                        <circle cx="4" cy="4" r="2" />
                      </svg>
                      LinkedIn
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Quick stats + actions */}
            <div className="flex flex-col items-end gap-3">
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
                  onClick={() => { if (confirm("Delete this contact?")) remove.mutate(); }}
                  disabled={remove.isPending}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
                >
                  Delete
                </button>
                <Link
                  href="/app/contacts"
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-600"
                >
                  All contacts
                </Link>
              </div>

              {/* Task progress chip */}
              {totalTasks > 0 && (
                <div className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {doneTasks}/{totalTasks} tasks done
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Panel ── */}
      {editOpen && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold">Edit contact</h2>
          <ContactForm
            mode="edit"
            values={editValues}
            onChange={(patch) => setEditValues((v) => ({ ...v, ...patch }))}
            companies={allCompanies.data?.data ?? []}
            onSubmit={() => save.mutate()}
            onCancel={() => setEditOpen(false)}
            isPending={save.isPending}
            isError={save.isError}
            errorMessage={save.error instanceof Error ? save.error.message : undefined}
          />
        </div>
      )}

      {/* ── Companies ── */}
      <CompaniesSection
        links={C.companyLinks}
        contactId={id}
        onRefresh={() => void qc.invalidateQueries({ queryKey: ["contact", id] })}
      />

      {/* ── Attachments ── */}
      <AttachmentSection parentType="CONTACT" parentId={id} queryKey={["contact", id]} />

      {/* ── AI ── */}
      <section className="space-y-4" aria-busy={aiLoading}>
        <AiSectionTitle
          title="AI assistant"
          subtitle="Suggested next steps based on this contact."
          loading={aiLoading}
        />
        {aiError && <p className="text-sm text-red-600 dark:text-red-400">{aiError}</p>}
        <button
          type="button"
          onClick={() => void runNextActions()}
          disabled={aiLoading}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {aiLoading ? "Generating…" : "Suggest next actions"}
        </button>
        {(actions || aiLoading) && (
          <AiResponsePanel variant="actions" label="Suggested actions" loading={aiLoading}>
            {actions ?? ""}
          </AiResponsePanel>
        )}
      </section>

      {/* ── Tasks ── */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">Tasks</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTaskTitle.trim()) return;
            addTask.mutate(newTaskTitle.trim());
            setNewTaskTitle("");
          }}
        >
          <input
            placeholder="Add a task…"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          />
          <button
            type="submit"
            disabled={addTask.isPending || !newTaskTitle.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add
          </button>
        </form>

        {tasks.data?.data && tasks.data.data.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {tasks.data.data.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-100 px-3 py-2.5 dark:border-zinc-800"
              >
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => toggleTask.mutate({ taskId: t.id, done: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 accent-violet-600"
                />
                <span className={`text-sm ${t.done ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-200"}`}>
                  {t.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Notes ── */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">Notes</h2>
        <form
          className="space-y-2"
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
            placeholder="Add a note about this contact…"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-200"
          />
          <button
            type="submit"
            disabled={addNote.isPending || !noteText.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add note
          </button>
        </form>
        {notes.data?.data && notes.data.data.length > 0 && (
          <ul className="mt-5 space-y-3">
            {notes.data.data.map((n) => (
              <li
                key={n.id}
                className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">{n.body}</p>
                {"createdAt" in n && (
                  <p className="mt-1 text-xs text-zinc-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Activity ── */}
      <section>
        <h2 className="text-lg font-semibold">Activity</h2>
        <div className="mt-4">
          <ActivityTimeline items={activities.data?.data ?? []} />
        </div>
      </section>
    </div>
  );
}
