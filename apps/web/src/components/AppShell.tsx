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

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="11" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="18" width="7" height="3" rx="1.5" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" />
    </svg>
  );
}

function ContactsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <path d="M17 11a3 3 0 1 0 0-6" />
      <path d="M21 19a6 6 0 0 0-3.5-5.4" />
    </svg>
  );
}

function KanbanIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 8v5M15 8v8M9 16h0M15 18h0" />
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

const links = [
  { href: "/app", label: "Dashboard", icon: DashboardIcon, match: (p: string) => p === "/app" },
  {
    href: "/app/companies",
    label: "Companies",
    icon: BuildingIcon,
    match: (p: string) => p.startsWith("/app/companies"),
  },
  {
    href: "/app/contacts",
    label: "Contacts",
    icon: ContactsIcon,
    match: (p: string) => p.startsWith("/app/contacts"),
  },
  {
    href: "/app/leads/kanban",
    label: "Kanban",
    icon: KanbanIcon,
    match: (p: string) => p.startsWith("/app/leads"),
  },
  { href: "/app/tasks", label: "Tasks", icon: TasksIcon, match: (p: string) => p.startsWith("/app/tasks") },
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
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
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
                  <span className="inline-flex items-center gap-1.5">
                    <l.icon />
                    <span>{l.label}</span>
                  </span>
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
        <div className="flex w-full flex-wrap gap-1 border-t border-zinc-100 px-4 py-2.5 md:hidden dark:border-zinc-800">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onMouseEnter={() => prefetchAppRoute(queryClient, l.href)}
              className={`rounded-md px-2 py-1.5 text-xs ${
                l.match(pathname) ? "bg-zinc-100 font-medium dark:bg-zinc-800" : ""
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <l.icon />
                <span>{l.label}</span>
              </span>
            </Link>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6">{children}</main>
    </div>
  );
}
