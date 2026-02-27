"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ListPageSkeleton } from "@/components/page-skeletons";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type List = {
  data: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    company: { id: string; name: string } | null;
  }>;
  meta: { total: number };
};

export default function ContactsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => api<List>("/contacts?limit=100"),
  });

  if (isLoading) return <ListPageSkeleton title="Loading contacts" />;
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
        title="Contacts"
        description={`${data?.meta.total ?? 0} records`}
        actions={
          <Link href="/app/contacts/new">
            <Button variant="primary" size="md">
              New contact
            </Button>
          </Link>
        }
      />
      {(data?.meta.total ?? 0) === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No contacts yet"
            description="Add people you work with and link them to companies."
            actionHref="/app/contacts/new"
            actionLabel="New contact"
          />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {data?.data.map((c) => (
            <li key={c.id}>
              <Link
                href={`/app/contacts/${c.id}`}
                className="flex flex-col gap-0.5 px-4 py-3 transition hover:bg-zinc-50 dark:hover:bg-zinc-800/80 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium">
                  {c.firstName} {c.lastName}
                </span>
                <span className="text-sm text-zinc-500">
                  {[c.email, c.company?.name].filter(Boolean).join(" · ") || "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
