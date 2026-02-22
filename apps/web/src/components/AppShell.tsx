"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { clearSession, getStoredToken } from "@/lib/api";
import { prefetchAppRoute } from "@/lib/prefetch-routes";
import { CommandBar } from "@/components/CommandBar";
import { CreateMenu } from "@/components/CreateMenu";
import { TeamSwitcher } from "@/components/TeamSwitcher";
import { Button } from "@/components/ui/button";

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21a8 8 0 1 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

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
  const queryClient = useQueryClient();

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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Link href="/app" className="text-lg font-semibold tracking-tight">
              microlead-crm
            </Link>
            <nav className="hidden flex-wrap items-center gap-1 text-sm md:flex">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onMouseEnter={() => prefetchAppRoute(queryClient, l.href)}
                  className={`rounded-md px-3 py-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    l.match(pathname) ? "bg-zinc-100 font-medium dark:bg-zinc-800" : ""
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <CreateMenu />
            <CommandBar />
            <TeamSwitcher />
            <Link href="/app/workspace/members">
              <Button variant="secondary" size="sm">
                <SettingsIcon />
                Settings
              </Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={logout}>
              <UserIcon />
              Log out
            </Button>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap gap-1 border-t border-zinc-100 px-4 py-2.5 md:hidden dark:border-zinc-800">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onMouseEnter={() => prefetchAppRoute(queryClient, l.href)}
              className={`rounded-md px-2 py-1.5 text-xs ${
                l.match(pathname) ? "bg-zinc-100 font-medium dark:bg-zinc-800" : ""
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6">{children}</main>
    </div>
  );
}
