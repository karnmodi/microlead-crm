"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const leads = useQuery({
    queryKey: ["leads", "count"],
    queryFn: () => api<{ meta: { total: number } }>("/leads?limit=1"),
  });
  const companies = useQuery({
    queryKey: ["companies", "count"],
    queryFn: () => api<{ meta: { total: number } }>("/companies?limit=1"),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Snapshot of your workspace (team-scoped).
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500">Leads</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {leads.isLoading ? "…" : leads.data?.meta.total ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-500">Companies</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {companies.isLoading ? "…" : companies.data?.meta.total ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
