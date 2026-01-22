"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityTimeline, type ActivityRow } from "@/components/ActivityTimeline";
import { api } from "@/lib/api";

type CompanyDetail = {
  id: string;
  name: string;
  website: string | null;
};

type ActivitiesRes = { data: ActivityRow[] };
type NotesRes = { data: Array<{ id: string; body: string }> };

export default function CompanyDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const qc = useQueryClient();

  const company = useQuery({
    queryKey: ["company", id],
    queryFn: () => api<CompanyDetail>(`/companies/${id}`),
    enabled: !!id,
  });

  const activities = useQuery({
    queryKey: ["activities", "COMPANY", id],
    queryFn: () =>
      api<ActivitiesRes>(`/activities?entityType=COMPANY&entityId=${encodeURIComponent(id)}&limit=50`),
    enabled: !!id,
  });

  const notes = useQuery({
    queryKey: ["notes", "COMPANY", id],
    queryFn: () =>
      api<NotesRes>(`/notes?parentType=COMPANY&parentId=${encodeURIComponent(id)}&limit=30`),
    enabled: !!id,
  });

  const [noteText, setNoteText] = useState("");
  const addNote = useMutation({
    mutationFn: () =>
      api("/notes", {
        method: "POST",
        body: JSON.stringify({ parentType: "COMPANY", parentId: id, text: noteText }),
      }),
    onSuccess: () => {
      setNoteText("");
      void qc.invalidateQueries({ queryKey: ["notes", "COMPANY", id] });
      void qc.invalidateQueries({ queryKey: ["activities", "COMPANY", id] });
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");

  function openEdit() {
    if (!company.data) return;
    setName(company.data.name);
    setWebsite(company.data.website ?? "");
    setEditOpen(true);
  }

  const save = useMutation({
    mutationFn: () =>
      api(`/companies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          website: website.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      setEditOpen(false);
      void qc.invalidateQueries({ queryKey: ["company", id] });
      void qc.invalidateQueries({ queryKey: ["companies"] });
      void qc.invalidateQueries({ queryKey: ["activities", "COMPANY", id] });
    },
  });

  const remove = useMutation({
    mutationFn: () => api(`/companies/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["companies"] });
      router.replace("/app/companies");
    },
  });

  if (company.isLoading) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (company.error || !company.data) {
    return (
      <p className="text-sm text-red-600">
        {company.error instanceof Error ? company.error.message : "Not found"}
      </p>
    );
  }

  const C = company.data;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Company</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{C.name}</h1>
          {C.website && (
            <a
              href={C.website.startsWith("http") ? C.website : `https://${C.website}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {C.website}
            </a>
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
              if (confirm("Delete this company?")) remove.mutate();
            }}
            disabled={remove.isPending}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
          >
            Delete
          </button>
          <Link
            href="/app/companies"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-600"
          >
            All companies
          </Link>
        </div>
      </div>

      {editOpen && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold">Edit company</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Website
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending || !name.trim()}
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
