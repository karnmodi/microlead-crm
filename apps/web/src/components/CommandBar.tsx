"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import { api } from "@/lib/api";

type SearchRes = {
  leads: Array<{ id: string; title: string }>;
  companies: Array<{ id: string; name: string }>;
  contacts: Array<{ id: string; firstName: string; lastName: string }>;
};

export function CommandBar() {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const search = useQuery({
    queryKey: ["search", "cmd", q],
    queryFn: () => api<SearchRes>(`/search?q=${encodeURIComponent(q.trim())}&limit=10`),
    enabled: open && q.trim().length >= 1,
  });

  function go(path: string) {
    setOpen(false);
    setQ("");
    router.push(path);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-left text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Search…
        <kbd className="ml-2 hidden rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-mono text-zinc-600 md:inline dark:bg-zinc-700 dark:text-zinc-300">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20 md:pt-24"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <p id={titleId} className="sr-only">
              Search workspace records
            </p>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search leads, companies, contacts…"
              aria-label="Search query"
              className="w-full rounded-t-xl border-b border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
            <div className="max-h-80 overflow-auto p-2">
              {q.trim().length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-zinc-500">Type to search</p>
              )}
              {q.trim().length > 0 && search.isLoading && (
                <p className="px-2 py-4 text-sm text-zinc-500">Searching…</p>
              )}
              {q.trim().length > 0 && search.isError && (
                <p className="px-2 py-4 text-sm text-red-600">Search failed</p>
              )}
              {search.data && (
                <ul className="space-y-1 text-sm">
                  {search.data.leads.map((l) => (
                    <li key={`l-${l.id}`}>
                      <button
                        type="button"
                        onClick={() => go(`/app/leads/${l.id}`)}
                        className="w-full rounded-lg px-2 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <span className="text-xs font-medium uppercase text-zinc-400">Lead</span>
                        <span className="ml-2">{l.title}</span>
                      </button>
                    </li>
                  ))}
                  {search.data.companies.map((c) => (
                    <li key={`c-${c.id}`}>
                      <button
                        type="button"
                        onClick={() => go(`/app/companies/${c.id}`)}
                        className="w-full rounded-lg px-2 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <span className="text-xs font-medium uppercase text-zinc-400">Company</span>
                        <span className="ml-2">{c.name}</span>
                      </button>
                    </li>
                  ))}
                  {search.data.contacts.map((c) => (
                    <li key={`co-${c.id}`}>
                      <button
                        type="button"
                        onClick={() => go(`/app/contacts/${c.id}`)}
                        className="w-full rounded-lg px-2 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <span className="text-xs font-medium uppercase text-zinc-400">Contact</span>
                        <span className="ml-2">
                          {c.firstName} {c.lastName}
                        </span>
                      </button>
                    </li>
                  ))}
                  {search.data.leads.length === 0 &&
                    search.data.companies.length === 0 &&
                    search.data.contacts.length === 0 && (
                      <p className="px-2 py-6 text-center text-zinc-500">No results</p>
                    )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
