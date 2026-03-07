"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { TasksPageSkeleton } from "@/components/page-skeletons";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
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
type LeadOptionRes = {
  data: Array<{
    id: string;
    title?: string;
    name?: string;
    company?: { id: string; name?: string | null } | null;
  }>;
};
type ContactOptionRes = {
  data: Array<{ id: string; firstName?: string; lastName?: string; name?: string }>;
};
type CompanyOptionRes = { data: Array<{ id: string; name?: string; title?: string }> };

const parentTypes = ["LEAD", "CONTACT", "COMPANY"] as const;
const filterTypes = ["OPEN", "COMPLETED", "OVERDUE", "DUE_TODAY"] as const;

function toDateKey(value: string | null) {
  if (!value) return null;
  return value.slice(0, 10);
}

function isOverdue(value: string | null) {
  const dateKey = toDateKey(value);
  if (!dateKey) return false;
  return dateKey < new Date().toISOString().slice(0, 10);
}

function isDueToday(value: string | null) {
  const dateKey = toDateKey(value);
  if (!dateKey) return false;
  return dateKey === new Date().toISOString().slice(0, 10);
}

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
  const leads = useQuery({
    queryKey: ["leads", "options"],
    queryFn: () => api<LeadOptionRes>("/leads?limit=100"),
  });
  const contacts = useQuery({
    queryKey: ["contacts", "options"],
    queryFn: () => api<ContactOptionRes>("/contacts?limit=100"),
  });
  const companies = useQuery({
    queryKey: ["companies", "options"],
    queryFn: () => api<CompanyOptionRes>("/companies?limit=100"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ done }) }),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: ["tasks", "all"] });
      const prev = qc.getQueryData<ListRes>(["tasks", "all"]);
      qc.setQueryData<ListRes>(["tasks", "all"], (old) =>
        old
          ? { ...old, data: old.data.map((t) => (t.id === id ? { ...t, done } : t)) }
          : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks", "all"], ctx.prev);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const [parentType, setParentType] = useState<(typeof parentTypes)[number]>("LEAD");
  const [parentId, setParentId] = useState("");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [taskSubmitAttempted, setTaskSubmitAttempted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<(typeof filterTypes)[number]>("OPEN");
  const trimmedTitle = title.trim();
  const trimmedParentId = parentId.trim();

  const parentOptions = useMemo(() => {
    if (parentType === "LEAD") {
      return (leads.data?.data ?? []).map((lead) => ({
        id: lead.id,
        label: lead.title ?? lead.name ?? lead.id,
      }));
    }
    if (parentType === "CONTACT") {
      return (contacts.data?.data ?? []).map((contact) => ({
        id: contact.id,
        label: `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() || contact.id,
      }));
    }
    return (companies.data?.data ?? []).map((company) => ({
      id: company.id,
      label: company.name ?? company.id,
    }));
  }, [parentType, leads.data?.data, contacts.data?.data, companies.data?.data]);

  const leadMetaById = useMemo(() => {
    return new Map(
      (leads.data?.data ?? []).map((lead) => [
        lead.id,
        {
          title: lead.title ?? lead.name ?? lead.id,
          companyName: lead.company?.name ?? null,
        },
      ]),
    );
  }, [leads.data?.data]);

  useEffect(() => {
    setParentId(parentOptions[0]?.id ?? "");
  }, [parentType, parentOptions]);

  const filteredTasks = useMemo(() => {
    const all = data?.data ?? [];
    const sorted = [...all].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (isOverdue(a.dueAt) !== isOverdue(b.dueAt)) return isOverdue(a.dueAt) ? -1 : 1;
      if (isDueToday(a.dueAt) !== isDueToday(b.dueAt)) return isDueToday(a.dueAt) ? -1 : 1;
      if (!a.dueAt && b.dueAt) return 1;
      if (a.dueAt && !b.dueAt) return -1;
      return (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
    });
    if (activeFilter === "OPEN") return sorted.filter((t) => !t.done);
    if (activeFilter === "COMPLETED") return sorted.filter((t) => t.done);
    if (activeFilter === "OVERDUE") return sorted.filter((t) => !t.done && isOverdue(t.dueAt));
    return sorted.filter((t) => !t.done && isDueToday(t.dueAt));
  }, [data?.data, activeFilter]);

  const insights = useMemo(() => {
    const all = data?.data ?? [];
    return {
      open: all.filter((t) => !t.done).length,
      completed: all.filter((t) => t.done).length,
      overdue: all.filter((t) => !t.done && isOverdue(t.dueAt)).length,
      dueToday: all.filter((t) => !t.done && isDueToday(t.dueAt)).length,
      upcoming: all
        .filter((t) => !t.done && t.dueAt && !isOverdue(t.dueAt))
        .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
        .slice(0, 5),
      recentlyDone: all
        .filter((t) => t.done)
        .sort((a, b) => (b.dueAt ?? "").localeCompare(a.dueAt ?? ""))
        .slice(0, 5),
    };
  }, [data?.data]);

  const create = useMutation({
    mutationFn: ({ title, parentId, dueAt }: { title: string; parentId: string; dueAt: string }) =>
      api("/tasks", {
        method: "POST",
        body: JSON.stringify({
          parentType,
          parentId,
          title,
          dueAt: dueAt ? `${dueAt}T12:00:00.000Z` : null,
        }),
      }),
    onMutate: async ({ title, parentId, dueAt }) => {
      await qc.cancelQueries({ queryKey: ["tasks", "all"] });
      const prev = qc.getQueryData<ListRes>(["tasks", "all"]);
      const tempId = `temp-${Date.now()}`;
      qc.setQueryData<ListRes>(["tasks", "all"], (old) =>
        old
          ? {
              ...old,
              data: [
                {
                  id: tempId,
                  title,
                  done: false,
                  parentType,
                  parentId,
                  dueAt: dueAt ? `${dueAt}T12:00:00.000Z` : null,
                },
                ...old.data,
              ],
            }
          : old,
      );
      setTitle("");
      setDueAt("");
      setTaskSubmitAttempted(false);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks", "all"], ctx.prev);
    },
    onSuccess: () => {
      setTitle("");
      setParentId("");
      setDueAt("");
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  if (isLoading) return <TasksPageSkeleton />;
  if (error) {
    return (
      <p className="text-sm text-red-600">
        {error instanceof Error ? error.message : "Error"}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tasks"
        description={`${data?.meta.total ?? 0} tasks in this workspace`}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1.1fr)]">
        <section className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center gap-2">
              {filterTypes.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    activeFilter === filter
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
                  }`}
                >
                  {filter === "DUE_TODAY" ? "Due Today" : filter[0] + filter.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <form
              className="mt-3 grid gap-2 lg:grid-cols-[160px_minmax(0,1fr)_minmax(0,1.5fr)_160px_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                setTaskSubmitAttempted(true);
                if (!trimmedTitle || !trimmedParentId) return;
                create.mutate({ title: trimmedTitle, parentId: trimmedParentId, dueAt });
              }}
            >
              <select
                value={parentType}
                onChange={(e) => setParentType(e.target.value as (typeof parentTypes)[number])}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              >
                {parentTypes.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                required
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              >
                <option value="" disabled>
                  Select parent
                </option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (taskSubmitAttempted) setTaskSubmitAttempted(false);
                }}
                placeholder="Task title"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
              />
              <label className="w-full text-[11px] text-zinc-500 dark:text-zinc-400">
                Due date (optional)
                <input
                  type="date"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                />
              </label>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={create.isPending || !trimmedTitle || !trimmedParentId}
              >
                {create.isPending ? "Adding…" : "Add"}
              </Button>
            </form>
            {taskSubmitAttempted && !trimmedTitle && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">Task title is required.</p>
            )}
            {create.isError && (
              <p className="mt-2 text-sm text-red-600">
                {create.error instanceof Error ? create.error.message : "Failed"}
              </p>
            )}
          </div>

          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {filteredTasks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-start gap-3 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => toggle.mutate({ id: t.id, done: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <span className={`min-w-0 flex-1 whitespace-normal break-words text-sm ${t.done ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-100"}`}>
                  {t.title}
                </span>
                {t.dueAt && (
                  <span className={`rounded-full px-2 py-0.5 text-xs ${isOverdue(t.dueAt) ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}>
                    {toDateKey(t.dueAt)}
                  </span>
                )}
                <Link
                  href={parentHref(t)}
                  className="min-w-0 text-right text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  {t.parentType === "LEAD" ? (
                    <span className="block leading-tight">
                      <span className="block truncate font-medium">
                        {leadMetaById.get(t.parentId)?.title ?? "Lead"}
                      </span>
                      <span className="block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                        {leadMetaById.get(t.parentId)?.companyName ?? "No company"}
                      </span>
                    </span>
                  ) : (
                    t.parentType
                  )}
                </Link>
              </li>
            ))}
            {filteredTasks.length === 0 && (
              <li className="px-4 py-6 text-sm text-zinc-500">No tasks in this filter.</li>
            )}
          </ul>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold">Task insights</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">Open: {insights.open}</div>
              <div className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">Done: {insights.completed}</div>
              <div className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">Overdue: {insights.overdue}</div>
              <div className="rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">Due today: {insights.dueToday}</div>
            </div>
          </section>
          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold">Upcoming deadlines</h2>
            <ul className="mt-2 space-y-2 text-xs">
              {insights.upcoming.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-2 rounded border border-zinc-200 px-2 py-1.5 dark:border-zinc-700">
                  <span className="truncate">{task.title}</span>
                  <span className="text-zinc-500">{toDateKey(task.dueAt)}</span>
                </li>
              ))}
              {insights.upcoming.length === 0 && <li className="text-zinc-500">No upcoming deadlines.</li>}
            </ul>
          </section>
          <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold">Recently completed</h2>
            <ul className="mt-2 space-y-2 text-xs">
              {insights.recentlyDone.map((task) => (
                <li key={task.id} className="truncate rounded border border-zinc-200 px-2 py-1.5 text-zinc-500 dark:border-zinc-700">
                  {task.title}
                </li>
              ))}
              {insights.recentlyDone.length === 0 && <li className="text-zinc-500">Nothing completed yet.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
