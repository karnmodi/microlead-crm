import type { QueryClient } from "@tanstack/react-query";
import { api } from "./api";

export type TopLead = {
  id: string;
  title: string;
  value: string | null;
  currency: string;
  stageName: string;
  company: string | null;
};

export type LeadByStage = {
  stageId: string;
  stageName: string;
  sortOrder: number;
  count: number;
  totalValue: number;
};

export type RecentActivityItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorName: string;
  createdAt: string;
};

export type DashboardSummary = {
  leads: { total: number; openValue: number; closingSoon: number };
  companies: { total: number };
  contacts: { total: number };
  tasks: { overdue: number; dueToday: number };
  topLeads: TopLead[];
  leadsByStage: LeadByStage[];
  recentActivity: RecentActivityItem[];
};

export type DashboardSignal = {
  type: "risk" | "opportunity" | "nudge" | "win";
  title: string;
  body: string;
  href: string;
};

export type DashboardBriefing = {
  signals: DashboardSignal[];
  generatedAt: string;
  fresh: boolean;
};

export type IntegrationStatus = {
  integration: string;
  status: "idle" | "running" | "success" | "error";
  lastRunAt: string | null;
  lastError: string | null;
  recordsUpdated: number;
  configured: boolean;
};

export const dashboardStatsQuery = {
  queryKey: ["dashboard", "stats"] as const,
  queryFn: () => api<DashboardSummary>("/dashboard/summary"),
  staleTime: 2 * 60 * 1000,
};

export const integrationsStatusQuery = {
  queryKey: ["integrations", "status"] as const,
  queryFn: () => api<IntegrationStatus[]>("/integrations"),
  staleTime: 30 * 1000,
};

export function prefetchDashboardStats(qc: QueryClient) {
  return qc.prefetchQuery(dashboardStatsQuery);
}
