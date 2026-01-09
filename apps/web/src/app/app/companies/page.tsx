"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type List = {
  data: Array<{ id: string; name: string; website: string | null }>;
  meta: { total: number };
};

export default function CompaniesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["companies"],
    queryFn: () => api<List>("/companies?limit=50"),
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
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Companies</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {data?.meta.total ?? 0} records
      </p>
      <ul className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {data?.data.map((c) => (
          <li key={c.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium">{c.name}</span>
            {c.website && (
              <a
                href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                target="_blank"
                rel="noreferrer"
              >
                {c.website}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
