"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityTimeline, type ActivityRow } from "@/components/ActivityTimeline";
import { AiResponsePanel, AiSectionTitle } from "@/components/AiResponsePanel";
import { DetailPageSkeleton } from "@/components/page-skeletons";
import { AttachmentSection } from "@/components/AttachmentSection";
import { ContactForm, type ContactFormValues } from "@/components/ContactForm";
import { api } from "@/lib/api";

type ContactDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  companyId: string | null;
  company: { id: string; name: string } | null;
};

type ActivitiesRes = { data: ActivityRow[] };
type NotesRes = {
  data: Array<{ id: string; body: string; createdAt: string }>;
};
type TasksRes = {
  data: Array<{ id: string; title: string; done: boolean }>;
};

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

  const companies = useQuery({
    queryKey: ["companies", "options"],
    queryFn: () => api<{ data: Array<{ id: string; name: string }> }>("/companies?limit=200"),
  });

  const [noteText, setNoteText] = useState("");
  const addNote = useMutation({
    mutationFn: () =>
      api("/notes", {
        method: "POST",
        body: JSON.stringify({ parentType: "CONTACT", parentId: id, text: noteText }),
      }),
    onMutate: () => {
      setNoteText("");
    },
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
        old
          ? { ...old, data: old.data.map((t) => (t.id === taskId ? { ...t, done } : t)) }
          : old,
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
    onMutate: async (title) => {
      await qc.cancelQueries({ queryKey: ["tasks", "CONTACT", id] });
      const prev = qc.getQueryData<TasksRes>(["tasks", "CONTACT", id]);
      const tempId = `temp-${Date.now()}`;
      qc.setQueryData<TasksRes>(["tasks", "CONTACT", id], (old) =>
        old
          ? { ...old, data: [{ id: tempId, title, done: false }, ...old.data] }
          : old,
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

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Contact</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {C.firstName} {C.lastName}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {[C.email, C.phone].filter(Boolean).join(" · ") || "No email or phone"}
          </p>
          {C.jobTitle && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{C.jobTitle}</p>
          )}
          {C.linkedinUrl && (
            <a
              href={C.linkedinUrl.startsWith("http") ? C.linkedinUrl : `https://${C.linkedinUrl}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              LinkedIn profile
            </a>
          )}
          {C.company && (
            <p className="mt-2 text-sm">
              <Link
                href={`/app/companies/${C.company.id}`}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {C.company.name}
              </Link>
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
              if (confirm("Delete this contact?")) remove.mutate();
            }}
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
      </div>

      {editOpen && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold">Edit contact</h2>
          <ContactForm
            mode="edit"
            values={editValues}
            onChange={(patch) => setEditValues((v) => ({ ...v, ...patch }))}
            companies={companies.data?.data ?? []}
            onSubmit={() => save.mutate()}
            onCancel={() => setEditOpen(false)}
            isPending={save.isPending}
            isError={save.isError}
            errorMessage={save.error instanceof Error ? save.error.message : undefined}
          />
        </div>
      )}

      <AttachmentSection
        parentType="CONTACT"
        parentId={id}
        queryKey={["contact", id]}
      />

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
          {aiLoading ? "Generating…" : "Next actions"}
        </button>
        {(actions || aiLoading) && (
          <AiResponsePanel variant="actions" label="Suggested actions" loading={aiLoading}>
            {actions ?? ""}
          </AiResponsePanel>
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
        <ul className="mt-4 space-y-2">
          {tasks.data?.data.map((t) => (
            <li
              key={t.id}
              className="flex items-start gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={(e) => toggleTask.mutate({ taskId: t.id, done: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300"
              />
              <span className={`whitespace-normal break-words ${t.done ? "text-zinc-400 line-through" : ""}`}>
                {t.title}
              </span>
            </li>
          ))}
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
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={addNote.isPending || !noteText.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add note
          </button>
        </form>
        <ul className="mt-6 space-y-3">
          {notes.data?.data.map((n) => (
            <li
              key={n.id}
              className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="whitespace-pre-wrap">{n.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Activity</h2>
        <div className="mt-4">
          <ActivityTimeline items={activities.data?.data ?? []} />
        </div>
      </section>
    </div>
  );
}
