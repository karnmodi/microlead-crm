"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { api } from "@/lib/api";
import { integrationsStatusQuery, type IntegrationStatus } from "@/lib/dashboard-stats";

type ChPrefs = {
  fields: string[];
  allKeys: string[];
  labels: Record<string, string>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const STATUS_CONFIG = {
  idle: { label: "Not run", cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  running: { label: "Syncing…", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 animate-pulse" },
  success: { label: "Connected & synced", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  error: { label: "Sync error", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
} as const;

// ─── Companies House field preferences (team admin) ───────────────────────────

function CompaniesHouseFieldPreferences({ configured }: { configured: boolean }) {
  const qc = useQueryClient();
  const prefs = useQuery({
    queryKey: ["integrations", "companies-house-preferences"],
    queryFn: () => api<ChPrefs>("/integrations/companies-house/preferences"),
    enabled: configured,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (prefs.data?.fields) setSelected(new Set(prefs.data.fields));
  }, [prefs.data?.fields]);

  const save = useMutation({
    mutationFn: () =>
      api<ChPrefs>("/integrations/companies-house/preferences", {
        method: "PATCH",
        body: JSON.stringify({ fields: [...selected] }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["integrations", "companies-house-preferences"] });
    },
  });

  if (!configured) return null;

  return (
    <div className="border-t border-zinc-100 pt-5 dark:border-zinc-800">
      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Data to sync</h4>
      <p className="mt-1 text-xs text-zinc-500">
        Choose which Companies House groups are stored when you run a team sync or per-company fetch. Workspace admins
        only can save.
      </p>
      {prefs.isLoading ? (
        <p className="mt-3 text-sm text-zinc-400">Loading…</p>
      ) : prefs.error ? (
        <p className="mt-3 text-sm text-red-600">
          {prefs.error instanceof Error ? prefs.error.message : "Could not load preferences"}
        </p>
      ) : (
        <ul className="mt-4 max-h-56 space-y-2 overflow-y-auto">
          {(prefs.data?.allKeys ?? []).map((key) => {
            const label = prefs.data?.labels[key] ?? key;
            const checked = selected.has(key);
            return (
              <li key={key}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      });
                    }}
                    className="mt-0.5 rounded border-zinc-300"
                  />
                  <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      {save.isError && (
        <p className="mt-2 text-xs text-red-600">
          {save.error instanceof Error ? save.error.message : "Save failed (admin role required?)"}
        </p>
      )}
      <button
        type="button"
        disabled={save.isPending || selected.size === 0 || prefs.isLoading}
        onClick={() => save.mutate()}
        className="mt-4 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {save.isPending ? "Saving…" : "Save preferences"}
      </button>
    </div>
  );
}

// ─── Companies House card ─────────────────────────────────────────────────────

function CompaniesHouseCard({ status }: { status: IntegrationStatus | undefined }) {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ recordsUpdated: number; errors: number } | null>(null);

  const cfg = status
    ? STATUS_CONFIG[status.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.idle
    : STATUS_CONFIG.idle;

  async function runSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await api<{ recordsUpdated: number; errors: number }>(
        "/integrations/companies-house/sync",
        { method: "POST" },
      );
      setSyncResult(res);
      await qc.invalidateQueries({ queryKey: ["integrations", "status"] });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-zinc-100 p-6 dark:border-zinc-800">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="14" rx="2" className="fill-blue-100 dark:fill-blue-900/40" />
            <path d="M3 10h18" className="stroke-blue-400" strokeWidth="1.3" />
            <circle cx="7" cy="15" r="1.5" className="fill-blue-500" />
            <path d="M11 14.5h6M11 16h4" className="stroke-blue-400" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Companies House</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}>
              {cfg.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Automatically enriches your company records with official UK Companies House data —
            registration status, SIC codes, filing dates, and registered addresses.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-800">
        {[
          { label: "Last synced", value: relativeTime(status?.lastRunAt ?? null) },
          { label: "Records updated", value: status?.recordsUpdated ?? 0 },
          { label: "Status", value: status?.configured ? "API key set" : "Not configured" },
        ].map(({ label, value }) => (
          <div key={label} className="px-5 py-4">
            <p className="text-xs text-zinc-400">{label}</p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{String(value)}</p>
          </div>
        ))}
      </div>

      {/* Config + actions */}
      <div className="border-t border-zinc-100 p-6 dark:border-zinc-800">
        {!status?.configured ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">API key not configured</p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Add{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px] dark:bg-amber-900/40">
                COMPANIES_HOUSE_API_KEY
              </code>{" "}
              to your server environment. Get a free key at{" "}
              <a
                href="https://developer.company-information.service.gov.uk/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                developer.company-information.service.gov.uk
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Connected</p>
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
              Syncs automatically at 2 AM daily. Add a company number to any Company record to enable enrichment.
            </p>
          </div>
        )}

        {status?.lastError && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
            <p className="text-xs text-red-600 dark:text-red-400">
              <span className="font-medium">Last error:</span> {status.lastError}
            </p>
          </div>
        )}

        {syncResult && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Sync complete — {syncResult.recordsUpdated} record{syncResult.recordsUpdated !== 1 ? "s" : ""} updated
              {syncResult.errors > 0 ? `, ${syncResult.errors} failed` : ""}.
            </p>
          </div>
        )}

        <CompaniesHouseFieldPreferences configured={!!status?.configured} />

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={runSync}
            disabled={syncing || status?.status === "running" || !status?.configured}
            className="flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {syncing ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent dark:border-zinc-900 dark:border-t-transparent" />
                Syncing…
              </>
            ) : (
              "Sync now"
            )}
          </button>
          <a
            href="https://developer.company-information.service.gov.uk/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-300"
          >
            API docs →
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Coming soon card ─────────────────────────────────────────────────────────

function ComingSoonCard({
  name,
  description,
  icon,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="absolute right-3 top-3 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        Coming soon
      </div>
      <div className="flex items-start gap-4 p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 opacity-50">
          {icon}
        </div>
        <div className="pr-16">
          <h3 className="font-semibold text-zinc-400 dark:text-zinc-500">{name}</h3>
          <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">{description}</p>
        </div>
      </div>
      <div className="border-t border-zinc-100 px-6 py-3 dark:border-zinc-800">
        <p className="text-xs text-zinc-400">Available in a future release</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data } = useQuery(integrationsStatusQuery);

  const chStatus = data?.find((s) => s.integration === "companies_house");

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect external data sources to automatically enrich your CRM records. Data syncs every 24 hours."
      />

      <div className="mt-8 space-y-5">
        {/* Live integration */}
        {mounted && <CompaniesHouseCard status={chStatus} />}

        {/* Coming soon section */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Coming soon
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ComingSoonCard
              name="Apollo.io"
              description="Enrich contacts and companies with firmographic data, email addresses, and direct dials from Apollo's B2B database."
              icon={
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="9" className="fill-indigo-100 dark:fill-indigo-900/40" />
                  <path d="M11 5l1.5 4H17l-3.5 2.5 1 4L11 13l-3.5 2.5 1-4L5 9h4.5z" className="stroke-indigo-400" strokeWidth="1.1" strokeLinejoin="round" />
                </svg>
              }
            />
            <ComingSoonCard
              name="Hunter.io"
              description="Find verified professional email addresses for any domain. Automatically populate contact emails as you build your pipeline."
              icon={
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="2" y="5" width="18" height="12" rx="2" className="fill-orange-100 dark:fill-orange-900/40" />
                  <path d="M2 8l9 5 9-5" className="stroke-orange-400" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              }
            />
            <ComingSoonCard
              name="LinkedIn"
              description="Pull company headcount, industry updates, and recent news directly from LinkedIn into your company and contact profiles."
              icon={
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="2" y="2" width="18" height="18" rx="3" className="fill-blue-100 dark:fill-blue-900/40" />
                  <path d="M6 9.5v7M6 7v.5M10 16.5v-4a2 2 0 0 1 4 0v4M10 9.5v7" className="stroke-blue-400" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
