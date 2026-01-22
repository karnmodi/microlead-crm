"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityTimeline, type ActivityRow } from "@/components/ActivityTimeline";
import { api } from "@/lib/api";

type ContactDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
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
    onSuccess: () => {
      setNoteText("");
      void qc.invalidateQueries({ queryKey: ["notes", "CONTACT", id] });
      void qc.invalidateQueries({ queryKey: ["activities", "CONTACT", id] });
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [fn, setFn] = useState("");
  const [ln, setLn] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyId, setCompanyId] = useState("");

  function openEdit() {
    if (!contact.data) return;
    setFn(contact.data.firstName);
    setLn(contact.data.lastName);
    setEmail(contact.data.email ?? "");
    setPhone(contact.data.phone ?? "");
    setCompanyId(contact.data.companyId ?? "");
    setEditOpen(true);
  }

  const save = useMutation({
    mutationFn: () =>
      api(`/contacts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          firstName: fn.trim(),
          lastName: ln.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          companyId: companyId || null,
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
          ? "AI is not configured (set OPENAI_API_KEY on the API)."
          : err.message,
      );
    } finally {
      setAiLoading(false);
    }
  }

  if (contact.isLoading) return <p className="text-sm text-zinc-500">Loading…</p>;
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
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold">Edit contact</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              First name
              <input
                value={fn}
                onChange={(e) => setFn(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Last name
              <input
                value={ln}
                onChange={(e) => setLn(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Phone
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 sm:col-span-2">
              Company
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
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
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {save.isPending ? "Saving…" : "Save"}
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
        {aiError && <p className="mt-2 text-sm text-red-600">{aiError}</p>}
        <button
          type="button"
          onClick={() => void runNextActions()}
          disabled={aiLoading}
          className="mt-3 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {aiLoading ? "…" : "Next actions"}
        </button>
        {actions && (
          <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-sm whitespace-pre-wrap dark:border-zinc-700 dark:bg-zinc-900/50">
            {actions}
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
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
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
