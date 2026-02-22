import type { QueryClient } from "@tanstack/react-query";
import { api } from "./api";

export type DashboardSummary = {
  leads: { meta: { total: number } };
  companies: { meta: { total: number } };
};

export const dashboardStatsQuery = {
  queryKey: ["dashboard", "stats"] as const,
  queryFn: () => api<DashboardSummary>("/dashboard/summary"),
  staleTime: 5 * 60 * 1000,
};

export function prefetchDashboardStats(qc: QueryClient) {
  return qc.prefetchQuery(dashboardStatsQuery);
}
