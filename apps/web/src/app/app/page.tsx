"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  dashboardStatsQuery,
  integrationsStatusQuery,
  type DashboardBriefing,
  type DashboardSignal,
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

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const STAGE_COLOURS = [
  { bar: "bg-violet-500", text: "text-violet-600 dark:text-violet-400" },
  { bar: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
  { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  { bar: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400" },
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

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={`inline-block animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700 ${className ?? ""}`}
      style={style}
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
  icon,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: "red" | "amber" | "green" | "violet";
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  const accentMap = {
    red: "text-red-600 dark:text-red-400",
    amber: "text-amber-600 dark:text-amber-400",
    green: "text-emerald-600 dark:text-emerald-400",
    violet: "text-violet-600 dark:text-violet-400",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
            {icon}
          </span>
        )}
      </div>
      <p className={`mt-3 text-3xl font-bold tabular-nums ${accent ? accentMap[accent] : "text-zinc-900 dark:text-zinc-50"}`}>
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

// ─── Signal config ────────────────────────────────────────────────────────────

const SIGNAL_CONFIG = {
  risk: {
    border: "border-red-200 dark:border-red-900/40",
    bg: "bg-red-50/60 dark:bg-red-950/20",
    accent: "bg-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    label: "Risk",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="rgb(239,68,68)" strokeWidth="1.3" />
        <path d="M7 4.5v3M7 9.5v.5" stroke="rgb(239,68,68)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  opportunity: {
    border: "border-emerald-200 dark:border-emerald-900/40",
    bg: "bg-emerald-50/60 dark:bg-emerald-950/20",
    accent: "bg-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    label: "Opportunity",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 1l1.5 4H13l-3.5 2.5 1 4L7 9l-3.5 2.5 1-4L1 5h4.5z" stroke="rgb(16,185,129)" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    ),
  },
  nudge: {
    border: "border-amber-200 dark:border-amber-900/40",
    bg: "bg-amber-50/60 dark:bg-amber-950/20",
    accent: "bg-amber-500",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    label: "Nudge",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="rgb(217,119,6)" strokeWidth="1.3" />
        <path d="M7 3.5v3.5l2 2" stroke="rgb(217,119,6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  win: {
    border: "border-violet-200 dark:border-violet-900/40",
    bg: "bg-violet-50/60 dark:bg-violet-950/20",
    accent: "bg-violet-500",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400",
    label: "Win",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 4l2 6h6l2-6" stroke="rgb(139,92,246)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 10v2M5 12h4" stroke="rgb(139,92,246)" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
};

// ─── AI Signal Bar ────────────────────────────────────────────────────────────

function SignalCard({ signal }: { signal: DashboardSignal }) {
  const cfg = SIGNAL_CONFIG[signal.type];
  return (
    <Link
      href={signal.href}
      className={`group flex min-w-0 flex-1 flex-col gap-2 rounded-2xl border p-4 transition hover:shadow-sm ${cfg.border} ${cfg.bg}`}
    >
      <div className="flex items-center gap-2">
        <span className="shrink-0">{cfg.icon}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>
      <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">{signal.title}</p>
      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{signal.body}</p>
      <span className="mt-auto flex items-center gap-1 text-[11px] font-medium text-zinc-400 transition group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
        View
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}

function AISignalBar() {
  const [briefing, setBriefing] = useState<DashboardBriefing | null>(null);

  const fetchSignals = useMutation({
    mutationFn: (force: boolean) =>
      api<DashboardBriefing>("/dashboard/ai-briefing", {
        method: "POST",
        body: JSON.stringify({ force }),
      }),
    onSuccess: (data) => setBriefing(data),
  });

  useEffect(() => {
    fetchSignals.mutate(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = fetchSignals.isPending;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M6.5 1.5C6.5 1.5 7.5 4 9.5 4.5C7.5 5 6.5 7.5 6.5 7.5C6.5 7.5 5.5 5 3.5 4.5C5.5 4 6.5 1.5 6.5 1.5Z"
                fill="white"
                className="dark:fill-zinc-900"
              />
              <path
                d="M10.5 8C10.5 8 11 9.5 12.5 9.5C11 9.5 10.5 11 10.5 11C10.5 11 10 9.5 8.5 9.5C10 9.5 10.5 8 10.5 8Z"
                fill="white"
                className="dark:fill-zinc-900"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">AI Signals</span>
          {briefing && !loading && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800">
              {relativeTime(briefing.generatedAt)}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchSignals.mutate(true)}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {loading ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border border-zinc-400 border-t-transparent" />
              Thinking…
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

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="space-y-2.5">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : fetchSignals.isError ? (
        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
          AI signals unavailable — check that an AI provider is configured.
        </div>
      ) : briefing?.signals?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {briefing.signals.map((signal, i) => (
            <SignalCard key={i} signal={signal} />
          ))}
        </div>
      ) : null}
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
          View board →
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
                <span className="w-4 text-xs font-bold text-zinc-300 dark:text-zinc-600">{i + 1}</span>
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
                <div className="flex-1 space-y-1.5">
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

// ─── Pipeline Funnel (Sankey) ─────────────────────────────────────────────────

const FUNNEL_COLORS = [
  { ribbon: "text-violet-400", bar: "fill-violet-500" },
  { ribbon: "text-blue-400",   bar: "fill-blue-500"   },
  { ribbon: "text-emerald-400",bar: "fill-emerald-500" },
  { ribbon: "text-amber-400",  bar: "fill-amber-500"  },
  { ribbon: "text-rose-400",   bar: "fill-rose-500"   },
  { ribbon: "text-cyan-400",   bar: "fill-cyan-500"   },
];

function PipelineFunnel({ stages, loading }: { stages: LeadByStage[]; loading: boolean }) {
  const router = useRouter();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    stage: LeadByStage;
  } | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  const sorted = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  const n = sorted.length;
  const totalLeads = sorted.reduce((s, x) => s + x.count, 0);
  const totalValue = sorted.reduce((s, x) => s + x.totalValue, 0);

  // ── Layout ────────────────────────────────────────────────────────────────
  const MT = 32, MB = 48, ROW_H = 64, SVG_W = 680;
  const SVG_H = n > 0 ? MT + n * ROW_H + MB : 200;
  const SRC_CX = 78, SRC_R = 36;
  const BAR_X = 370, MAX_BAR_W = 140, BAR_H = 32;
  const MAX_STROKE = 30, MIN_STROKE = 4;

  const srcCY = SVG_H / 2;
  const stageCY = sorted.map((_, i) => MT + i * ROW_H + ROW_H / 2);

  const ribbonStroke = (count: number) =>
    totalLeads > 0 ? Math.max(MIN_STROKE, (count / totalLeads) * MAX_STROKE) : MIN_STROKE;

  const barW = (count: number) =>
    totalLeads > 0 ? Math.max(20, (count / totalLeads) * MAX_BAR_W) : 20;

  const pct = (count: number) =>
    totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;

  const emptyState = n === 0 || totalLeads === 0;

  const clearHover = () => { setHoveredIdx(null); setTooltip(null); };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pipeline Funnel</h3>
          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
            How open leads are distributed across your pipeline
          </p>
        </div>
        <Link href="/app/leads/kanban" className="text-xs text-violet-600 hover:underline dark:text-violet-400">
          Open board →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4 py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6">
              <Skeleton className="h-3 w-20 shrink-0" />
              <Skeleton className="h-8 rounded-lg" style={{ width: `${72 - i * 14}%` }} />
            </div>
          ))}
        </div>
      ) : emptyState ? (
        <p className="py-8 text-center text-sm text-zinc-400">No pipeline stages configured</p>
      ) : (
        <div className="space-y-4">
          {/* Floating tooltip rendered outside SVG for clean styling */}
          {tooltip && (
            <div
              style={{ position: "fixed", left: tooltip.x + 14, top: tooltip.y - 64, zIndex: 50, pointerEvents: "none" }}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
            >
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{tooltip.stage.stageName}</p>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                {tooltip.stage.count.toLocaleString()} {tooltip.stage.count === 1 ? "lead" : "leads"}
                {" · "}
                {pct(tooltip.stage.count)}% of total
              </p>
              {tooltip.stage.totalValue > 0 && (
                <p className="mt-0.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                  {formatCurrency(tooltip.stage.totalValue)}
                </p>
              )}
            </div>
          )}

          <div className="-mx-2 overflow-x-auto px-2 pb-1">
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              width={SVG_W}
              height={SVG_H}
              style={{ minWidth: SVG_W, display: "block", opacity: ready ? 1 : 0, transition: "opacity 0.45s ease" }}
              aria-label="Pipeline funnel diagram"
              role="img"
            >
              {/* ── Source node ─────────────────────────────────────────────── */}
              <circle
                cx={SRC_CX}
                cy={srcCY}
                r={SRC_R}
                className="fill-zinc-100 dark:fill-zinc-800"
                style={{ opacity: hoveredIdx !== null ? 0.5 : 1, transition: "opacity 0.2s" }}
              />
              <circle
                cx={SRC_CX}
                cy={srcCY}
                r={SRC_R}
                fill="none"
                className="stroke-zinc-300 dark:stroke-zinc-600"
                strokeWidth={1.5}
                style={{ opacity: hoveredIdx !== null ? 0.5 : 1, transition: "opacity 0.2s" }}
              />
              <text
                x={SRC_CX}
                y={srcCY - 7}
                textAnchor="middle"
                fontSize={16}
                fontWeight={800}
                className="fill-zinc-900 dark:fill-zinc-50"
                style={{ opacity: hoveredIdx !== null ? 0.5 : 1, transition: "opacity 0.2s" }}
              >
                {totalLeads}
              </text>
              <text
                x={SRC_CX}
                y={srcCY + 9}
                textAnchor="middle"
                fontSize={9}
                className="fill-zinc-500 dark:fill-zinc-400"
                style={{ opacity: hoveredIdx !== null ? 0.5 : 1, transition: "opacity 0.2s" }}
              >
                All Leads
              </text>

              {/* ── Ribbons ─────────────────────────────────────────────────── */}
              {sorted.map((stage, i) => {
                const cy = stageCY[i];
                const x1 = SRC_CX + SRC_R;
                const x2 = BAR_X;
                const cpx = x1 + (x2 - x1) * 0.58;
                const d = `M ${x1} ${srcCY} C ${cpx} ${srcCY}, ${cpx} ${cy}, ${x2} ${cy}`;
                const col = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
                const dimmed = hoveredIdx !== null && hoveredIdx !== i;

                return (
                  <path
                    key={`ribbon-${stage.stageId}`}
                    d={d}
                    fill="none"
                    className={col.ribbon}
                    stroke="currentColor"
                    strokeWidth={ribbonStroke(stage.count)}
                    strokeLinecap="round"
                    style={{
                      opacity: dimmed ? 0.1 : 0.45,
                      transition: "opacity 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { setHoveredIdx(i); setTooltip({ x: e.clientX, y: e.clientY, stage }); }}
                    onMouseMove={(e) => { if (hoveredIdx === i) setTooltip({ x: e.clientX, y: e.clientY, stage }); }}
                    onMouseLeave={clearHover}
                    onClick={() => router.push("/app/leads/kanban")}
                  />
                );
              })}

              {/* ── Stage bars + labels ──────────────────────────────────────── */}
              {sorted.map((stage, i) => {
                const cy = stageCY[i];
                const col = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
                const dimmed = hoveredIdx !== null && hoveredIdx !== i;
                const bw = barW(stage.count);

                return (
                  <g
                    key={`stage-${stage.stageId}`}
                    style={{ opacity: dimmed ? 0.15 : 1, transition: "opacity 0.2s", cursor: "pointer" }}
                    onMouseEnter={(e) => { setHoveredIdx(i); setTooltip({ x: e.clientX, y: e.clientY, stage }); }}
                    onMouseMove={(e) => setTooltip({ x: e.clientX, y: e.clientY, stage })}
                    onMouseLeave={clearHover}
                    onClick={() => router.push("/app/leads/kanban")}
                  >
                    {/* Colour bar */}
                    <rect
                      x={BAR_X}
                      y={cy - BAR_H / 2}
                      width={bw}
                      height={BAR_H}
                      rx={6}
                      className={col.bar}
                    />
                    {/* Stage name */}
                    <text
                      x={BAR_X + bw + 10}
                      y={cy - 4}
                      fontSize={11.5}
                      fontWeight={600}
                      className="fill-zinc-800 dark:fill-zinc-100"
                    >
                      {stage.stageName}
                    </text>
                    {/* Count + % */}
                    <text
                      x={BAR_X + bw + 10}
                      y={cy + 10}
                      fontSize={10.5}
                      className="fill-zinc-500 dark:fill-zinc-400"
                    >
                      {stage.count.toLocaleString()} {stage.count === 1 ? "lead" : "leads"} · {pct(stage.count)}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Summary footer */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total pipeline</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {totalLeads.toLocaleString()} leads
              </span>
              {totalValue > 0 && (
                <span className="text-sm font-bold tabular-nums text-violet-600 dark:text-violet-400">
                  {formatCurrency(totalValue)}
                </span>
              )}
            </div>
          </div>
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
  const greeting = mounted ? timeGreeting() : "Welcome";

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {greeting}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Here&rsquo;s what needs your attention today.
          </p>
        </div>
        <span className="hidden text-xs text-zinc-400 sm:block dark:text-zinc-600">
          {mounted ? new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : ""}
        </span>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open Leads"
          value={data?.leads.total ?? "—"}
          subtext={data ? `${data.leads.closingSoon} closing in 7 days` : undefined}
          loading={busy}
          icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M1 12L4 9L6.5 11.5L13 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <KpiCard
          label="Pipeline Value"
          value={data ? formatCurrency(data.leads.openValue, data.topLeads[0]?.currency ?? "USD") : "—"}
          subtext={data ? `Across ${data.leads.total} open deals` : undefined}
          accent="violet"
          loading={busy}
          icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1.5v12M3.5 5.5c0-2.209 1.791-4 4-4s4 1.791 4 4M3.5 9.5c0 2.209 1.791 4 4 4s4-1.791 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          label="Contacts"
          value={data?.contacts.total ?? "—"}
          subtext={data ? `${data.companies.total} companies` : undefined}
          loading={busy}
          icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" />
              <path d="M1.5 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          }
        />
        <KpiCard
          label="Overdue Tasks"
          value={data?.tasks.overdue ?? "—"}
          subtext={data ? `+${data.tasks.dueToday} due today` : undefined}
          accent={data && data.tasks.overdue > 0 ? "red" : undefined}
          loading={busy}
          icon={
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3" />
              <path d="M7.5 4v4l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </div>

      {/* AI Signal Bar */}
      <AISignalBar />

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

      {/* Pipeline Funnel */}
      <PipelineFunnel stages={data?.leadsByStage ?? []} loading={busy} />

      {/* Integration strip */}
      <IntegrationStrip integrations={integrations.data ?? []} loading={intBusy} />
    </div>
  );
}
