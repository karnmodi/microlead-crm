"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ListPageSkeleton } from "@/components/page-skeletons";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type CompanyItem = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  employeeCount: number | null;
};

type List = {
  data: CompanyItem[];
  meta: { total: number };
};

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatEmployeeCount(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

export default function CompaniesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["companies"],
    queryFn: () => api<List>("/companies?limit=200"),
  });

  const [search, setSearch] = useState("");

  const companies = useMemo(() => data?.data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return companies;
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.website?.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q),
    );
  }, [companies, search]);

  const topIndustries = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of companies) {
      const key = c.industry?.trim() || "Unknown";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }, [companies]);

  const withWebsite = companies.filter((c) => c.website).length;

  if (isLoading) return <ListPageSkeleton title="Loading companies" />;
  if (error) {
    return (
      <p className="text-sm text-red-600">
        {error instanceof Error ? error.message : "Error"}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description={`${data?.meta.total ?? 0} organizations`}
        actions={
          <Link href="/app/companies/new">
            <Button variant="primary" size="md">
              + New company
            </Button>
          </Link>
        }
      />

      {/* Stats row */}
      {companies.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total companies" value={companies.length} />
          <StatCard label="With website" value={withWebsite} />
          {topIndustries[0] && (
            <StatCard label="Top industry" value={topIndustries[0].name} />
          )}
          {topIndustries.length > 1 && (
            <StatCard label="Industries tracked" value={Object.keys(
              companies.reduce<Record<string, true>>((acc, c) => {
                if (c.industry) acc[c.industry] = true;
                return acc;
              }, {})
            ).length} />
          )}
        </div>
      )}

      {/* Search */}
      {companies.length > 0 && (
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, website, or industry…"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder-zinc-400 transition focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {companies.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <svg className="h-7 w-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0H5m14 0h2m-2 0h-2M5 21H3m2 0h2M9 7h1m-1 4h1m4-4h1m-1 4h1" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold">No companies yet</h3>
          <p className="mt-1 max-w-xs text-sm text-zinc-500">
            Add your prospects, customers, and partners to link contacts and leads.
          </p>
          <Link href="/app/companies/new" className="mt-5">
            <Button variant="primary" size="md">
              Add your first company
            </Button>
          </Link>
        </div>
      )}

      {/* No results */}
      {companies.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-zinc-500">
          No companies match &ldquo;{search}&rdquo;.{" "}
          <button type="button" onClick={() => setSearch("")} className="text-blue-600 hover:underline dark:text-blue-400">
            Clear
          </button>
        </p>
      )}

      {/* Card grid */}
      {filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const color = avatarColor(c.name);
            const domain = c.website
              ? c.website.replace(/^https?:\/\//, "").replace(/\/$/, "")
              : null;
            return (
              <Link
                key={c.id}
                href={`/app/companies/${c.id}`}
                className="group relative flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold ${color}`}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight">{c.name}</p>
                    {domain && (
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {domain}
                      </p>
                    )}
                  </div>
                  <svg
                    className="h-4 w-4 shrink-0 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-zinc-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {c.industry && (
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {c.industry}
                    </span>
                  )}
                  {c.employeeCount != null && (
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                      {formatEmployeeCount(c.employeeCount)} employees
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {search && filtered.length > 0 && (
        <p className="text-xs text-zinc-400">
          Showing {filtered.length} of {companies.length} companies
        </p>
      )}
    </div>
  );
}
