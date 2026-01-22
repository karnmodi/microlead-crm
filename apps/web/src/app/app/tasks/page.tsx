"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";

type TaskRow = {
  id: string;
  title: string;
  done: boolean;
  parentType: "LEAD" | "CONTACT" | "COMPANY";
  parentId: string;
  dueAt: string | null;
};

type ListRes = { data: TaskRow[]; meta: { total: number } };

const parentTypes = ["LEAD", "CONTACT", "COMPANY"] as const;

function parentHref(t: TaskRow) {
  if (t.parentType === "LEAD") return `/app/leads/${t.parentId}`;
  if (t.parentType === "CONTACT") return `/app/contacts/${t.parentId}`;
  return `/app/companies/${t.parentId}`;
}

export default function TasksPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks", "all"],
    queryFn: () => api<ListRes>("/tasks?limit=100"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ done }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const [parentType, setParentType] = useState<(typeof parentTypes)[number]>("LEAD");
  const [parentId, setParentId] = useState("");
  const [title, setTitle] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api("/tasks", {
        method: "POST",
        body: JSON.stringify({
          parentType,
          parentId: parentId.trim(),
          title: title.trim(),
        }),
      }),
    onSuccess: () => {
      setTitle("");
      setParentId("");
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  if (isLoading) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (error) {
    return (
      <p className="text-sm text-red-600">
        {error instanceof Error ? error.message : "Error"}
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {data?.meta.total ?? 0} tasks in this workspace
        </p>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold">Add task</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Paste a record UUID from the address bar (lead, contact, or company detail).
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !parentId.trim()) return;
            create.mutate();
          }}
        >
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Parent type
            <select
              value={parentType}
              onChange={(e) => setParentType(e.target.value as (typeof parentTypes)[number])}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              {parentTypes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Parent ID
            <input
              required
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              placeholder="uuid"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 sm:col-span-2">
            Title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
          {create.isError && (
            <p className="text-sm text-red-600 sm:col-span-2">
              {create.error instanceof Error ? create.error.message : "Failed"}
            </p>
          )}
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white sm:col-span-2 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {create.isPending ? "Adding…" : "Add task"}
          </button>
        </form>
      </section>

      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {data?.data.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <input
              type="checkbox"
              checked={t.done}
              onChange={(e) =>
                toggle.mutate({ id: t.id, done: e.target.checked })
              }
              className="h-4 w-4 rounded border-zinc-300"
            />
            <span className={`flex-1 ${t.done ? "text-zinc-400 line-through" : ""}`}>
              {t.title}
            </span>
            <Link
              href={parentHref(t)}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              {t.parentType} · open
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
