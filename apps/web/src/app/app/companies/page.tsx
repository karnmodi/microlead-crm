"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ListPageSkeleton } from "@/components/page-skeletons";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
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

  if (isLoading) return <ListPageSkeleton title="Loading companies" />;
  if (error) {
    return (
      <p className="text-sm text-red-600">
        {error instanceof Error ? error.message : "Error"}
      </p>
    );
  }

  return (
    <div>
      <PageHeader
        title="Companies"
        description={`${data?.meta.total ?? 0} records`}
        actions={
          <Link href="/app/companies/new">
            <Button variant="primary" size="md">
              New company
            </Button>
          </Link>
        }
      />
      {(data?.meta.total ?? 0) === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No companies yet"
            description="Create a company to link contacts and leads."
            actionHref="/app/companies/new"
            actionLabel="New company"
          />
        </div>
      ) : (
      <ul className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {data?.data.map((c) => (
          <li key={c.id}>
            <Link
              href={`/app/companies/${c.id}`}
              className="flex flex-col gap-0.5 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/80 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="font-medium">{c.name}</span>
              {c.website && (
                <span className="text-sm text-zinc-500">{c.website}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
