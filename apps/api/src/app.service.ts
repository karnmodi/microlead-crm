import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

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

  /** Single round-trip counts for dashboard (matches list meta.totals). */
  async dashboardSummary(teamId: string) {
    const [leadTotal, companyTotal] = await Promise.all([
      this.prisma.lead.count({ where: { teamId, deletedAt: null } }),
      this.prisma.company.count({ where: { teamId, deletedAt: null } }),
    ]);
    return {
      leads: { meta: { total: leadTotal } },
      companies: { meta: { total: companyTotal } },
    };
  }
}
