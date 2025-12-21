import { Injectable, NotFoundException } from "@nestjs/common";
import { LeadPriority, Prisma } from "@prisma/client";
import { ActivitiesService } from "../activities/activities.service";
import { paginate } from "../common/dto/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";

const leadInclude = {
  stage: true,
  company: true,
  contact: true,
  owner: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  async list(
    teamId: string,
    page: number,
    limit: number,
    filters: { q?: string; stageId?: string; ownerId?: string },
  ) {
    const { take, skip } = paginate(page, limit);
    const where: Prisma.LeadWhereInput = {
      teamId,
      deletedAt: null,
      ...(filters.stageId ? { stageId: filters.stageId } : {}),
      ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
      ...(filters.q
        ? { title: { contains: filters.q, mode: "insensitive" } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
        include: leadInclude,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async kanban(teamId: string) {
    const [stages, leads] = await Promise.all([
      this.prisma.pipelineStage.findMany({
        where: { teamId },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.lead.findMany({
        where: { teamId, deletedAt: null },
        include: leadInclude,
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    const byStage = new Map<string, typeof leads>();
    for (const s of stages) byStage.set(s.id, []);
    for (const l of leads) {
      const arr = byStage.get(l.stageId);
      if (arr) arr.push(l);
    }
    return {
      stages: stages.map((s) => ({
        stage: s,
        leads: byStage.get(s.id) ?? [],
      })),
    };
  }

  async get(teamId: string, id: string) {
    const row = await this.prisma.lead.findFirst({
      where: { id, teamId, deletedAt: null },
      include: leadInclude,
    });
    if (!row) throw new NotFoundException();
    return row;
  }

  private async assertRefs(
    teamId: string,
    refs: { stageId: string; companyId?: string | null; contactId?: string | null; ownerId?: string | null },
  ) {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: refs.stageId, teamId },
    });
    if (!stage) throw new NotFoundException("Stage not found");
    if (refs.companyId) {
      const c = await this.prisma.company.findFirst({
        where: { id: refs.companyId, teamId, deletedAt: null },
      });
      if (!c) throw new NotFoundException("Company not found");
    }
    if (refs.contactId) {
      const c = await this.prisma.contact.findFirst({
        where: { id: refs.contactId, teamId, deletedAt: null },
      });
      if (!c) throw new NotFoundException("Contact not found");
    }
    if (refs.ownerId) {
      const m = await this.prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: refs.ownerId, teamId } },
      });
      if (!m) throw new NotFoundException("Owner must be a team member");
    }
  }

  async create(
    teamId: string,
    userId: string,
    body: {
      title: string;
      stageId: string;
      priority?: LeadPriority;
      value?: number;
      companyId?: string;
      contactId?: string;
      ownerId?: string;
    },
  ) {
    await this.assertRefs(teamId, body);
    const row = await this.prisma.lead.create({
      data: {
        teamId,
        title: body.title,
        stageId: body.stageId,
        priority: body.priority ?? LeadPriority.MEDIUM,
        value: body.value != null ? body.value : undefined,
        companyId: body.companyId,
        contactId: body.contactId,
        ownerId: body.ownerId,
      },
      include: leadInclude,
    });
    await this.activities.append(teamId, userId, "LEAD", row.id, "lead.created", {
      title: row.title,
      stageId: row.stageId,
    });
    return row;
  }

  async update(
    teamId: string,
    userId: string,
    id: string,
    body: Partial<{
      title: string;
      stageId: string;
      priority: LeadPriority;
      value: number | null;
      companyId: string | null;
      contactId: string | null;
      ownerId: string | null;
    }>,
  ) {
    const existing = await this.prisma.lead.findFirst({
      where: { id, teamId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException();

    await this.assertRefs(teamId, {
      stageId: body.stageId ?? existing.stageId,
      companyId: body.companyId !== undefined ? body.companyId : existing.companyId,
      contactId: body.contactId !== undefined ? body.contactId : existing.contactId,
      ownerId: body.ownerId !== undefined ? body.ownerId : existing.ownerId,
    });

    const row = await this.prisma.lead.update({
      where: { id },
      data: body,
      include: leadInclude,
    });

    if (body.stageId && body.stageId !== existing.stageId) {
      await this.activities.append(teamId, userId, "LEAD", id, "lead.stage_changed", {
        fromStageId: existing.stageId,
        toStageId: body.stageId,
      });
    } else {
      await this.activities.append(teamId, userId, "LEAD", id, "lead.updated", body);
    }
    return row;
  }

  async remove(teamId: string, userId: string, id: string) {
    await this.get(teamId, id);
    const row = await this.prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: leadInclude,
    });
    await this.activities.append(teamId, userId, "LEAD", id, "lead.deleted", {});
    return row;
  }
}
