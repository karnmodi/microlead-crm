import { Injectable, NotFoundException } from "@nestjs/common";
import { ParentEntityType, Prisma } from "@prisma/client";
import { ActivitiesService } from "../activities/activities.service";
import { paginate } from "../common/dto/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  private async assertParent(teamId: string, type: ParentEntityType, id: string) {
    if (type === "LEAD") {
      const r = await this.prisma.lead.findFirst({ where: { id, teamId, deletedAt: null } });
      if (!r) throw new NotFoundException("Lead not found");
    } else if (type === "CONTACT") {
      const r = await this.prisma.contact.findFirst({ where: { id, teamId, deletedAt: null } });
      if (!r) throw new NotFoundException("Contact not found");
    } else {
      const r = await this.prisma.company.findFirst({ where: { id, teamId, deletedAt: null } });
      if (!r) throw new NotFoundException("Company not found");
    }
  }

  async list(
    teamId: string,
    page: number,
    limit: number,
    filters: { parentType?: ParentEntityType; parentId?: string; assigneeId?: string },
  ) {
    const { take, skip } = paginate(page, limit);
    const where: Prisma.TaskWhereInput = {
      teamId,
      deletedAt: null,
      ...(filters.parentType && filters.parentId
        ? { parentType: filters.parentType, parentId: filters.parentId }
        : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
        include: { assignee: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.task.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async get(teamId: string, id: string) {
    const row = await this.prisma.task.findFirst({
      where: { id, teamId, deletedAt: null },
      include: { assignee: { select: { id: true, name: true, email: true } } },
    });
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(
    teamId: string,
    userId: string,
    body: {
      parentType: ParentEntityType;
      parentId: string;
      title: string;
      assigneeId?: string;
      dueAt?: string;
    },
  ) {
    await this.assertParent(teamId, body.parentType, body.parentId);
    if (body.assigneeId) {
      const m = await this.prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: body.assigneeId, teamId } },
      });
      if (!m) throw new NotFoundException("Assignee must be a team member");
    }
    const row = await this.prisma.task.create({
      data: {
        teamId,
        parentType: body.parentType,
        parentId: body.parentId,
        title: body.title,
        assigneeId: body.assigneeId,
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      },
    });
    await this.activities.append(teamId, userId, body.parentType, body.parentId, "task.created", {
      taskId: row.id,
      title: row.title,
    });
    return row;
  }

  async update(
    teamId: string,
    userId: string,
    id: string,
    body: Partial<{ title: string; done: boolean; assigneeId: string | null; dueAt: string | null }>,
  ) {
    await this.get(teamId, id);
    const row = await this.prisma.task.update({
      where: { id },
      data: {
        ...body,
        dueAt: body.dueAt === undefined ? undefined : body.dueAt ? new Date(body.dueAt) : null,
      },
    });
    await this.activities.append(teamId, userId, row.parentType, row.parentId, "task.updated", {
      taskId: id,
    });
    return row;
  }

  async remove(teamId: string, userId: string, id: string) {
    const row = await this.get(teamId, id);
    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.activities.append(teamId, userId, row.parentType, row.parentId, "task.deleted", {
      taskId: id,
    });
    return { ok: true };
  }
}
