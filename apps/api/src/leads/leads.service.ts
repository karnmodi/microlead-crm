import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { LeadPriority, LeadStatus, Prisma } from "@prisma/client";
import { ActivitiesService } from "../activities/activities.service";
import { paginate } from "../common/dto/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";

const leadInclude = {
  stage: true,
  company: true,
  contact: true,
  owner: { select: { id: true, name: true, email: true } },
} as const;

function tagsToJson(tags: string[] | undefined | null): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (tags === undefined) return undefined;
  if (tags === null) return Prisma.JsonNull;
  if (!Array.isArray(tags) || !tags.every((t) => typeof t === "string")) {
    throw new BadRequestException("tags must be an array of strings");
  }
  return tags as unknown as Prisma.InputJsonValue;
}

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
    filters: { q?: string; stageId?: string; ownerId?: string; status?: LeadStatus },
  ) {
    const { take, skip } = paginate(page, limit);
    const where: Prisma.LeadWhereInput = {
      teamId,
      deletedAt: null,
      ...(filters.stageId ? { stageId: filters.stageId } : {}),
      ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
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

  async kanban(
    teamId: string,
    options?: {
      sortBy?: "updatedAt" | "value" | "priority" | "expectedCloseDate" | "title";
      sortOrder?: "asc" | "desc";
    },
  ) {
    const [stages, leads] = await Promise.all([
      this.prisma.pipelineStage.findMany({
        where: { teamId },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.lead.findMany({
        where: { teamId, deletedAt: null, status: LeadStatus.OPEN },
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
    const sortBy = options?.sortBy ?? "updatedAt";
    const sortOrder = options?.sortOrder ?? "desc";
    const direction = sortOrder === "asc" ? 1 : -1;

    const priorityRank: Record<LeadPriority, number> = {
      [LeadPriority.LOW]: 1,
      [LeadPriority.MEDIUM]: 2,
      [LeadPriority.HIGH]: 3,
    };

    const sorted = stages.map((s) => {
      const stageLeads = [...(byStage.get(s.id) ?? [])];
      stageLeads.sort((a, b) => {
        if (sortBy === "value") {
          const av = a.value ? Number(a.value) : 0;
          const bv = b.value ? Number(b.value) : 0;
          return (av - bv) * direction;
        }
        if (sortBy === "priority") {
          return (priorityRank[a.priority] - priorityRank[b.priority]) * direction;
        }
        if (sortBy === "expectedCloseDate") {
          const at = a.expectedCloseDate ? new Date(a.expectedCloseDate).getTime() : 0;
          const bt = b.expectedCloseDate ? new Date(b.expectedCloseDate).getTime() : 0;
          return (at - bt) * direction;
        }
        if (sortBy === "title") {
          return a.title.localeCompare(b.title) * direction;
        }
        const at = new Date(a.updatedAt).getTime();
        const bt = new Date(b.updatedAt).getTime();
        return (at - bt) * direction;
      });
      return { stage: s, leads: stageLeads };
    });

    return {
      stages: sorted,
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
      description?: string;
      currency?: string;
      probability?: number;
      source?: string;
      status?: LeadStatus;
      expectedCloseDate?: string;
      tags?: string[];
    },
  ) {
    if (body.probability !== undefined && (body.probability < 0 || body.probability > 100)) {
      throw new BadRequestException("probability must be 0–100");
    }
    await this.assertRefs(teamId, body);
    const status = body.status ?? LeadStatus.OPEN;
    const closedAt = status !== LeadStatus.OPEN ? new Date() : undefined;

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
        description: body.description,
        currency: body.currency ?? "USD",
        probability: body.probability,
        source: body.source,
        status,
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : undefined,
        closedAt,
        tags: tagsToJson(body.tags),
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
      description: string | null;
      currency: string;
      probability: number | null;
      source: string | null;
      status: LeadStatus;
      expectedCloseDate: string | null;
      closedAt: string | null;
      lostReason: string | null;
      tags: string[] | null;
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

    const nextStatus = body.status ?? existing.status;
    let closedAt: Date | null | undefined = undefined;
    let lostReason: string | null | undefined = undefined;

    if (body.status !== undefined) {
      if (nextStatus === LeadStatus.OPEN) {
        closedAt = null;
        lostReason = null;
      } else if (nextStatus === LeadStatus.WON || nextStatus === LeadStatus.LOST) {
        closedAt = body.closedAt ? new Date(body.closedAt) : new Date();
        if (nextStatus === LeadStatus.LOST) {
          lostReason = body.lostReason !== undefined ? body.lostReason : existing.lostReason;
        } else {
          lostReason = null;
        }
      }
    } else {
      if (body.closedAt !== undefined) closedAt = body.closedAt ? new Date(body.closedAt) : null;
      if (body.lostReason !== undefined) lostReason = body.lostReason;
    }

    if (body.probability !== null && body.probability !== undefined) {
      if (body.probability < 0 || body.probability > 100) {
        throw new BadRequestException("probability must be 0–100");
      }
    }

    const data: Prisma.LeadUpdateInput = {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.stageId !== undefined ? { stage: { connect: { id: body.stageId } } } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      ...(body.value !== undefined ? { value: body.value } : {}),
      ...(body.companyId !== undefined
        ? { company: body.companyId ? { connect: { id: body.companyId } } : { disconnect: true } }
        : {}),
      ...(body.contactId !== undefined
        ? { contact: body.contactId ? { connect: { id: body.contactId } } : { disconnect: true } }
        : {}),
      ...(body.ownerId !== undefined
        ? { owner: body.ownerId ? { connect: { id: body.ownerId } } : { disconnect: true } }
        : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.currency !== undefined ? { currency: body.currency } : {}),
      ...(body.probability !== undefined ? { probability: body.probability } : {}),
      ...(body.source !== undefined ? { source: body.source } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.expectedCloseDate !== undefined
        ? {
            expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
          }
        : {}),
      ...(closedAt !== undefined ? { closedAt } : {}),
      ...(lostReason !== undefined ? { lostReason } : {}),
      ...(body.tags !== undefined ? { tags: tagsToJson(body.tags) } : {}),
    };

    const row = await this.prisma.lead.update({
      where: { id },
      data,
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
