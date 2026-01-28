"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { clearSession, getStoredToken } from "@/lib/api";
import { CommandBar } from "@/components/CommandBar";
import { TeamSwitcher } from "@/components/TeamSwitcher";

const links = [
  { href: "/app", label: "Dashboard", match: (p: string) => p === "/app" },
  {
    href: "/app/companies",
    label: "Companies",
    match: (p: string) => p.startsWith("/app/companies"),
  },
  {
    href: "/app/contacts",
    label: "Contacts",
    match: (p: string) => p.startsWith("/app/contacts"),
  },
  {
    href: "/app/leads/kanban",
    label: "Pipeline",
    match: (p: string) => p.startsWith("/app/leads"),
  },
  { href: "/app/tasks", label: "Tasks", match: (p: string) => p.startsWith("/app/tasks") },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
    }
  }, [router]);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/app" className="text-lg font-semibold tracking-tight">
            microlead-crm
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  l.match(pathname) ? "bg-zinc-100 font-medium dark:bg-zinc-800" : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <CommandBar />
            <TeamSwitcher />
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-zinc-300 px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
