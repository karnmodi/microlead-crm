"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  dashboardStatsQuery,
  integrationsStatusQuery,
  type DashboardBriefing,
  type IntegrationStatus,
  type LeadByStage,
  type RecentActivityItem,
  type TopLead,
} from "@/lib/dashboard-stats";

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatCurrency(value: number | string | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  if (num >= 1_000_000) return `${currency} ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${currency} ${(num / 1_000).toFixed(1)}K`;
  return `${currency} ${num.toLocaleString()}`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const STAGE_COLOURS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  LEAD: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M1 10L3.5 7.5L5.5 9.5L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  CONTACT: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1 11c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  COMPANY: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="2" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 5h.01M8 5h.01M4 8h.01M8 8h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700 ${className ?? ""}`}
      aria-hidden
    />
  );
}

// ─── KPI cards ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  subtext,
  accent,
  loading,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: "red" | "amber" | "green" | "violet";
  loading?: boolean;
}) {
  const accentMap = {
    red: "text-red-600 dark:text-red-400",
    amber: "text-amber-600 dark:text-amber-400",
    green: "text-emerald-600 dark:text-emerald-400",
    violet: "text-violet-600 dark:text-violet-400",
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${accent ? accentMap[accent] : "text-zinc-900 dark:text-zinc-50"}`}>
        {loading ? <Skeleton className="h-9 w-24" /> : value}
      </p>
      {subtext && (
        <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
          {loading ? <Skeleton className="h-4 w-28" /> : subtext}
        </p>
      )}
    </div>
  );
}

// ─── AI Briefing card ─────────────────────────────────────────────────────────

function AiBriefingCard() {
  const qc = useQueryClient();
  const [briefing, setBriefing] = useState<DashboardBriefing | null>(null);

  const fetchBriefing = useMutation({
    mutationFn: (force: boolean) =>
      api<DashboardBriefing>("/dashboard/ai-briefing", {
        method: "POST",
        body: JSON.stringify({ force }),
      }),
    onSuccess: (data) => setBriefing(data),
  });

  useEffect(() => {
    fetchBriefing.mutate(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = fetchBriefing.isPending;

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-6 dark:border-violet-800/40 dark:bg-violet-950/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1l1.5 4H13l-3.5 2.5 1 4L7 9l-3.5 2.5 1-4L1 5h4.5z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="ai-title-shimmer text-sm font-semibold">AI Sales Briefing</span>
          {briefing && !loading && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800">
              {relativeTime(briefing.generatedAt)}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchBriefing.mutate(true)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {loading ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border border-violet-400 border-t-transparent" />
              Generating…
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M10 5.5A4.5 4.5 0 1 1 5.5 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M5.5 1 7 3H4L5.5 1Z" fill="currentColor" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      <div className="mt-4 border-l-2 border-violet-300 pl-4 dark:border-violet-700">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : fetchBriefing.isError ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            AI briefing unavailable — check that an AI provider is configured (OPENAI_API_KEY or Azure OpenAI).
          </p>
        ) : briefing ? (
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{briefing.content}</p>
        ) : null}
      </div>
    </div>
  );
}

// ─── Top leads widget ─────────────────────────────────────────────────────────

function TopLeadsWidget({ leads, loading }: { leads: TopLead[]; loading: boolean }) {
  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Top Leads</h3>
        <Link
          href="/app/leads/kanban"
          className="text-xs text-violet-600 hover:underline dark:text-violet-400"
        >
          View pipeline →
        </Link>
      </div>
      <ul className="flex-1 divide-y divide-zinc-50 dark:divide-zinc-800/60">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center justify-between px-5 py-3.5">
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </li>
            ))
          : leads.length === 0
          ? (
              <li className="px-5 py-8 text-center text-sm text-zinc-400">No open leads yet</li>
            )
          : leads.map((lead, i) => (
              <li key={lead.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="text-xs font-bold text-zinc-300 dark:text-zinc-600 w-4">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/app/leads/${lead.id}`}
                    className="block truncate text-sm font-medium text-zinc-900 hover:text-violet-600 dark:text-zinc-100 dark:hover:text-violet-400"
                  >
                    {lead.title}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {lead.stageName}
                    </span>
                    {lead.company && (
                      <span className="truncate text-[10px] text-zinc-400">{lead.company}</span>
                    )}
                  </div>
                </div>
                {lead.value && (
                  <span className="shrink-0 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {formatCurrency(lead.value, lead.currency)}
                  </span>
                )}
              </li>
            ))}
      </ul>
    </div>
  );
}

// ─── Tasks widget ─────────────────────────────────────────────────────────────

function TasksWidget({ overdue, dueToday, loading }: { overdue: number; dueToday: number; loading: boolean }) {
  const total = overdue + dueToday;
  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Tasks Needing Attention</h3>
        <Link href="/app/tasks" className="text-xs text-violet-600 hover:underline dark:text-violet-400">
          All tasks →
        </Link>
      </div>
      <div className="flex-1 px-5 py-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : total === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-zinc-400">
            All caught up — no tasks due
          </div>
        ) : (
          <div className="space-y-3">
            {overdue > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-3.5 dark:border-red-900/30 dark:bg-red-950/20">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="rgb(239,68,68)" strokeWidth="1.2" />
                    <path d="M7 4v3M7 9.5v.5" stroke="rgb(239,68,68)" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">{overdue} overdue</p>
                  <p className="text-xs text-red-500">Past their due date</p>
                </div>
              </div>
            )}
            {dueToday > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3.5 dark:border-amber-900/30 dark:bg-amber-950/20">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="rgb(217,119,6)" strokeWidth="1.2" />
                    <path d="M7 3v4l2 2" stroke="rgb(217,119,6)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{dueToday} due today</p>
                  <p className="text-xs text-amber-500">Complete before end of day</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Activity feed ────────────────────────────────────────────────────────────

function ActivityFeed({ items, loading }: { items: RecentActivityItem[]; loading: boolean }) {
  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent Activity</h3>
      </div>
      <ul className="flex-1 divide-y divide-zinc-50 dark:divide-zinc-800/60">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-3">
                <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </li>
            ))
          : items.length === 0
          ? (
              <li className="px-5 py-8 text-center text-sm text-zinc-400">No activity yet</li>
            )
          : items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-5 py-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {initials(item.actorName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium">{item.actorName}</span>{" "}
                    <span className="text-zinc-500">{item.action}</span>
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-0.5 text-zinc-400">
                      {ENTITY_ICONS[item.entityType] ?? null}
                      <span className="text-[10px]">{item.entityType.toLowerCase()}</span>
                    </span>
                    <span className="text-[10px] text-zinc-400">·</span>
                    <span className="text-[10px] text-zinc-400">{relativeTime(item.createdAt)}</span>
                  </div>
                </div>
              </li>
            ))}
      </ul>
    </div>
  );
}

// ─── Pipeline by stage chart ──────────────────────────────────────────────────

function PipelineChart({ stages, loading }: { stages: LeadByStage[]; loading: boolean }) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pipeline by Stage</h3>
        <Link
          href="/app/leads/kanban"
          className="text-xs text-violet-600 hover:underline dark:text-violet-400"
        >
          Open kanban →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : stages.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-400">No pipeline stages configured</p>
      ) : (
        <div className="space-y-4">
          {stages.map((stage, i) => (
            <div key={stage.stageId}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{stage.stageName}</span>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="tabular-nums">{stage.count} lead{stage.count !== 1 ? "s" : ""}</span>
                  {stage.totalValue > 0 && (
                    <>
                      <span>·</span>
                      <span className="tabular-nums">{formatCurrency(stage.totalValue)}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${STAGE_COLOURS[i % STAGE_COLOURS.length]}`}
                  style={{ width: `${Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 4 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Integration strip ────────────────────────────────────────────────────────

function IntegrationStrip({
  integrations,
  loading,
}: {
  integrations: IntegrationStatus[];
  loading: boolean;
}) {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState<string | null>(null);

  async function triggerSync(integration: string) {
    setSyncing(integration);
    try {
      await api(`/integrations/${integration.replace("_", "-")}/sync`, { method: "POST" });
      await qc.invalidateQueries({ queryKey: ["integrations", "status"] });
    } finally {
      setSyncing(null);
    }
  }

  const statusConfig = {
    idle: { label: "Not run", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
    running: { label: "Syncing…", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 animate-pulse" },
    success: { label: "Synced", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
    error: { label: "Error", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  } as const;

  const LABELS: Record<string, string> = {
    companies_house: "Companies House",
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Data Integrations</h3>
          <p className="mt-0.5 text-xs text-zinc-400">Auto-enriches company records every 24h</p>
        </div>
        <Link
          href="/app/integrations"
          className="text-xs text-violet-600 hover:underline dark:text-violet-400"
        >
          Configure →
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {loading
          ? Array.from({ length: 1 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-56 rounded-xl" />
            ))
          : integrations.map((item) => {
              const cfg = statusConfig[item.status as keyof typeof statusConfig] ?? statusConfig.idle;
              const isSyncing = syncing === item.integration;
              return (
                <div
                  key={item.integration}
                  className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/50"
                >
                  <div>
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {LABELS[item.integration] ?? item.integration}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                      {item.lastRunAt && (
                        <span className="text-[10px] text-zinc-400">{relativeTime(item.lastRunAt)}</span>
                      )}
                      {item.recordsUpdated > 0 && (
                        <span className="text-[10px] text-zinc-400">· {item.recordsUpdated} records</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => triggerSync(item.integration)}
                    disabled={isSyncing || item.status === "running" || !item.configured}
                    title={!item.configured ? "Set COMPANIES_HOUSE_API_KEY in server environment" : "Sync now"}
                    className="ml-auto flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                  >
                    {isSyncing ? (
                      <span className="h-3 w-3 animate-spin rounded-full border border-violet-400 border-t-transparent" />
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M9 5A4 4 0 1 1 5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        <path d="M5 1 6.5 3H3.5L5 1Z" fill="currentColor" />
                      </svg>
                    )}
                    Sync
                  </button>
                </div>
              );
            })}
      </div>
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const stats = useQuery(dashboardStatsQuery);
  const integrations = useQuery(integrationsStatusQuery);

  const busy = !mounted || stats.isPending;
  const intBusy = !mounted || integrations.isPending;

  const data = stats.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Your pipeline intelligence hub — refreshed on every load.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open Leads"
          value={data?.leads.total ?? "—"}
          subtext={data ? `${data.leads.closingSoon} closing in 7 days` : undefined}
          loading={busy}
        />
        <KpiCard
          label="Pipeline Value"
          value={data ? formatCurrency(data.leads.openValue, data.topLeads[0]?.currency ?? "USD") : "—"}
          subtext={data ? `Across ${data.leads.total} open deals` : undefined}
          accent="violet"
          loading={busy}
        />
        <KpiCard
          label="Contacts"
          value={data?.contacts.total ?? "—"}
          subtext={data ? `${data.companies.total} companies` : undefined}
          loading={busy}
        />
        <KpiCard
          label="Overdue Tasks"
          value={data?.tasks.overdue ?? "—"}
          subtext={data ? `+${data.tasks.dueToday} due today` : undefined}
          accent={data && data.tasks.overdue > 0 ? "red" : undefined}
          loading={busy}
        />
      </div>

      {/* AI Briefing */}
      <AiBriefingCard />

      {/* 3-column content row */}
      <div className="grid gap-5 lg:grid-cols-3">
        <TopLeadsWidget leads={data?.topLeads ?? []} loading={busy} />
        <TasksWidget
          overdue={data?.tasks.overdue ?? 0}
          dueToday={data?.tasks.dueToday ?? 0}
          loading={busy}
        />
        <ActivityFeed items={data?.recentActivity ?? []} loading={busy} />
      </div>

      {/* Pipeline chart */}
      <PipelineChart stages={data?.leadsByStage ?? []} loading={busy} />

      {/* Integration strip */}
      <IntegrationStrip integrations={integrations.data ?? []} loading={intBusy} />
    </div>
  );
}
