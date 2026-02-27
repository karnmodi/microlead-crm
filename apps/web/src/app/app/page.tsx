"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { dashboardStatsQuery } from "@/lib/dashboard-stats";

const quickLinks = [
  { href: "/app/leads/new", label: "New lead", desc: "Add a deal" },
  { href: "/app/companies/new", label: "New company", desc: "Add an account" },
  { href: "/app/contacts/new", label: "New contact", desc: "Add a person" },
  { href: "/app/tasks", label: "Tasks", desc: "View and add tasks" },
  { href: "/app/leads/kanban", label: "Pipeline", desc: "Kanban board" },
  { href: "/app/contacts", label: "Contacts", desc: "All contacts" },
] as const;

function StatSkeleton({ label }: { label: string }) {
  return (
    <>
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">
        <span
          className="inline-block h-9 w-20 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700"
          aria-hidden
        />
      </p>
    </>
  );
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = useQuery(dashboardStatsQuery);

  const leadsBusy = !mounted || stats.isPending;
  const companiesBusy = !mounted || stats.isPending;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Snapshot of your workspace. Use quick actions to create records or open core areas."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {leadsBusy ? (
            <StatSkeleton label="Leads" />
          ) : stats.isError ? (
            <>
              <p className="text-sm font-medium text-zinc-500">Leads</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                <span className="text-base font-normal text-red-600 dark:text-red-400">
                  Couldn’t load (check API / login)
                </span>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-500">Leads</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{stats.data?.leads.meta.total ?? "—"}</p>
            </>
          )}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {companiesBusy ? (
            <StatSkeleton label="Companies" />
          ) : stats.isError ? (
            <>
              <p className="text-sm font-medium text-zinc-500">Companies</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                <span className="text-base font-normal text-red-600 dark:text-red-400">
                  Couldn’t load (check API / login)
                </span>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-zinc-500">Companies</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{stats.data?.companies.meta.total ?? "—"}</p>
            </>
          )}
        </div>
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-zinc-500">Quick actions</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((q) => (
          <li key={q.href}>
            <Link
              href={q.href}
              className="flex h-full min-h-[7.5rem] flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/80"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{q.label}</span>
              <span className="mt-1 flex-1 text-sm text-zinc-500">{q.desc}</span>
              <span className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 text-sm font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                Open
                <span aria-hidden className="text-zinc-400">
                  →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
