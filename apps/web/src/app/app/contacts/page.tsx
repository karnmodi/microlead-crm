"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {data?.meta.total ?? 0} records
          </p>
        </div>
        <Link
          href="/app/contacts/new"
          className="inline-flex w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          New contact
        </Link>
      </div>
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
    </div>
  );
}
