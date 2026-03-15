"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ListPageSkeleton } from "@/components/page-skeletons";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type ContactItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  company: { id: string; name: string } | null;
};

type List = {
  data: ContactItem[];
  meta: { total: number };
};

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

export default function ContactsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => api<List>("/contacts?limit=200"),
  });

  const [search, setSearch] = useState("");

  const contacts = data?.data ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.company?.name.toLowerCase().includes(q) ||
        c.jobTitle?.toLowerCase().includes(q),
    );
  }, [contacts, search]);

  const withEmail = contacts.filter((c) => c.email).length;
  const withCompany = contacts.filter((c) => c.company).length;

  if (isLoading) return <ListPageSkeleton title="Loading contacts" />;
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
        title="Contacts"
        description={`${data?.meta.total ?? 0} people`}
        actions={
          <Link href="/app/contacts/new">
            <Button variant="primary" size="md">
              + New contact
            </Button>
          </Link>
        }
      />

      {/* Stats row */}
      {contacts.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total contacts" value={contacts.length} />
          <StatCard label="With email" value={withEmail} />
          <StatCard label="Linked to company" value={withCompany} />
        </div>
      )}

      {/* Search */}
      {contacts.length > 0 && (
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
            placeholder="Search by name, email, company, role…"
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
      {contacts.length === 0 && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <svg className="h-7 w-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-1a4 4 0 0 0-4-4h-1M9 20H4v-1a4 4 0 0 1 4-4h1m4-4a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold">No contacts yet</h3>
          <p className="mt-1 max-w-xs text-sm text-zinc-500">
            Add people you work with and link them to companies and leads.
          </p>
          <Link href="/app/contacts/new" className="mt-5">
            <Button variant="primary" size="md">
              Add your first contact
            </Button>
          </Link>
        </div>
      )}

      {/* No results */}
      {contacts.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-zinc-500">
          No contacts match &ldquo;{search}&rdquo;.{" "}
          <button type="button" onClick={() => setSearch("")} className="text-blue-600 hover:underline dark:text-blue-400">
            Clear
          </button>
        </p>
      )}

      {/* Card grid */}
      {filtered.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const fullName = `${c.firstName} ${c.lastName}`;
            const color = avatarColor(fullName);
            return (
              <Link
                key={c.id}
                href={`/app/contacts/${c.id}`}
                className="group relative flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${color}`}
                  >
                    {initials(c.firstName, c.lastName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold leading-tight">{fullName}</p>
                    {c.jobTitle && (
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {c.jobTitle}
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

                <div className="space-y-1">
                  {c.email && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
                      </svg>
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.company && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <svg className="h-3.5 w-3.5 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0H5m14 0h2m-2 0h-2M5 21H3m2 0h2M9 7h1m-1 4h1m4-4h1m-1 4h1" />
                      </svg>
                      <span className="truncate rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {c.company.name}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {search && filtered.length > 0 && (
        <p className="text-xs text-zinc-400">
          Showing {filtered.length} of {contacts.length} contacts
        </p>
      )}
    </div>
  );
}
