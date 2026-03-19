import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AiService } from "./ai/ai.service";
import { PrismaService } from "./prisma/prisma.service";

const BRIEFING_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async health() {
    let db = false;
    try {
      await this.prisma.$connect();
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    return { status: "ok", service: "microlead-crm-api", db };
  }

  /** Expanded dashboard summary — all data in one parallel round-trip. */
  async dashboardSummary(teamId: string) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      leadTotal,
      companyTotal,
      contactTotal,
      openValueResult,
      closingSoonCount,
      overdueTaskCount,
      dueTodayTaskCount,
      topLeads,
      leadsByStage,
      recentActivity,
    ] = await Promise.all([
      // Total open leads
      this.prisma.lead.count({
        where: { teamId, deletedAt: null, status: "OPEN" },
      }),

      // Total companies
      this.prisma.company.count({ where: { teamId, deletedAt: null } }),

      // Total contacts
      this.prisma.contact.count({ where: { teamId, deletedAt: null } }),

      // Sum of open lead values
      this.prisma.lead.aggregate({
        where: { teamId, deletedAt: null, status: "OPEN", value: { not: null } },
        _sum: { value: true },
      }),

      // Leads closing in next 7 days
      this.prisma.lead.count({
        where: {
          teamId,
          deletedAt: null,
          status: "OPEN",
          expectedCloseDate: { gte: now, lte: sevenDaysOut },
        },
      }),

      // Overdue incomplete tasks
      this.prisma.task.count({
        where: {
          teamId,
          deletedAt: null,
          done: false,
          dueAt: { lt: startOfToday },
        },
      }),

      // Tasks due today (incomplete)
      this.prisma.task.count({
        where: {
          teamId,
          deletedAt: null,
          done: false,
          dueAt: { gte: startOfToday, lte: endOfToday },
        },
      }),

      // Top 5 open leads by value
      this.prisma.lead.findMany({
        where: { teamId, deletedAt: null, status: "OPEN", value: { not: null } },
        orderBy: { value: "desc" },
        take: 5,
        include: {
          stage: { select: { name: true } },
          company: { select: { name: true } },
        },
      }),

      // Leads grouped by stage with totals
      this.prisma.$queryRaw<
        Array<{ stage_id: string; stage_name: string; sort_order: number; count: bigint; total_value: string | null }>
      >(Prisma.sql`
        SELECT
          ps.id        AS stage_id,
          ps.name      AS stage_name,
          ps.sort_order,
          COUNT(l.id)  AS count,
          COALESCE(SUM(l.value::numeric), 0)::text AS total_value
        FROM pipeline_stages ps
        LEFT JOIN leads l
          ON l.stage_id = ps.id
         AND l.team_id  = ${teamId}
         AND l.deleted_at IS NULL
         AND l.status = 'OPEN'
        WHERE ps.team_id = ${teamId}
        GROUP BY ps.id, ps.name, ps.sort_order
        ORDER BY ps.sort_order ASC
      `),

      // Last 6 activities for the team
      this.prisma.activity.findMany({
        where: { teamId },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { actor: { select: { name: true, email: true } } },
      }),
    ]);

    const openValue = Number(openValueResult._sum.value ?? 0);

    return {
      leads: {
        total: leadTotal,
        openValue,
        closingSoon: closingSoonCount,
      },
      companies: { total: companyTotal },
      contacts: { total: contactTotal },
      tasks: {
        overdue: overdueTaskCount,
        dueToday: dueTodayTaskCount,
      },
      topLeads: topLeads.map((l) => ({
        id: l.id,
        title: l.title,
        value: l.value ? String(l.value) : null,
        currency: l.currency,
        stageName: l.stage.name,
        company: l.company?.name ?? null,
      })),
      leadsByStage: leadsByStage.map((row) => ({
        stageId: row.stage_id,
        stageName: row.stage_name,
        sortOrder: row.sort_order,
        count: Number(row.count),
        totalValue: parseFloat(row.total_value ?? "0"),
      })),
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        actorName: a.actor.name ?? a.actor.email,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  /** Cached 24h AI signal cards for the dashboard. Pass force=true to regenerate. */
  async getDashboardBriefing(teamId: string, force = false) {
    const now = new Date();

    if (!force) {
      const cached = await this.prisma.dashboardBriefingCache.findUnique({
        where: { teamId },
      });
      if (cached && now.getTime() - cached.generatedAt.getTime() < BRIEFING_CACHE_TTL_MS) {
        // Try parsing as structured signals (new format)
        try {
          const signals = JSON.parse(cached.content) as unknown;
          if (Array.isArray(signals)) {
            return { signals, generatedAt: cached.generatedAt.toISOString(), fresh: false };
          }
        } catch {
          // Fall through to regenerate if cache is old prose format
        }
      }
    }

    const summary = await this.dashboardSummary(teamId);

    const signals = await this.ai.generateDashboardSignals({
      totalLeads: summary.leads.total,
      openValue: summary.leads.openValue,
      currency: summary.topLeads[0]?.currency ?? "USD",
      closingSoon: summary.leads.closingSoon,
      overdueTasks: summary.tasks.overdue,
      dueTodayTasks: summary.tasks.dueToday,
      topLeads: summary.topLeads.map((l) => ({
        title: l.title,
        value: l.value,
        stageName: l.stageName,
      })),
      leadsByStage: summary.leadsByStage.map((s) => ({
        stageName: s.stageName,
        count: s.count,
        totalValue: s.totalValue,
      })),
      recentActions: summary.recentActivity.map((a) => `${a.actorName} ${a.action} ${a.entityType}`),
    });

    const content = JSON.stringify(signals);

    const cached = await this.prisma.dashboardBriefingCache.upsert({
      where: { teamId },
      create: { teamId, content, generatedAt: now },
      update: { content, generatedAt: now },
    });

    return { signals, generatedAt: cached.generatedAt.toISOString(), fresh: true };
  }
}
