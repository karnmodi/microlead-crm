import type { QueryClient } from "@tanstack/react-query";
import { api, getStoredTeamId } from "./api";
import { prefetchDashboardStats } from "./dashboard-stats";

/** Prefetch React Query data when the user hovers primary nav links. */
export function prefetchAppRoute(qc: QueryClient, href: string) {
  const path = href.split("?")[0];

  switch (path) {
    case "/app":
      return void prefetchDashboardStats(qc);
    case "/app/companies":
      return void qc.prefetchQuery({
        queryKey: ["companies"],
        queryFn: () => api<{ data: unknown[]; meta: { total: number } }>("/companies?limit=50"),
      });
    case "/app/contacts":
      return void qc.prefetchQuery({
        queryKey: ["contacts"],
        queryFn: () => api<{ data: unknown[]; meta: { total: number } }>("/contacts?limit=100"),
      });
    case "/app/leads/kanban":
      return void qc.prefetchQuery({
        queryKey: ["leads", "kanban"],
        queryFn: () => api("/leads/kanban"),
      });
    case "/app/tasks":
      return void qc.prefetchQuery({
        queryKey: ["tasks", "all"],
        queryFn: () => api("/tasks?limit=100"),
      });
    case "/app/workspace/members": {
      const tid = getStoredTeamId();
      if (!tid) return;
      return void qc.prefetchQuery({
        queryKey: ["team-members", tid],
        queryFn: () => api(`/teams/${tid}/members`),
      });
    }
    default:
      return;
  }
}
