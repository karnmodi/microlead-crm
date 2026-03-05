import { Injectable, NotFoundException } from "@nestjs/common";
import { ParentEntityType, Prisma } from "@prisma/client";
import { ActivitiesService } from "../activities/activities.service";
import { paginate } from "../common/dto/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  private async bumpLeadSummaryVersionForParent(
    teamId: string,
    parentType: ParentEntityType,
    parentId: string,
  ) {
    if (parentType !== ParentEntityType.LEAD) return;
    await this.prisma.lead.updateMany({
      where: { id: parentId, teamId, deletedAt: null },
      data: { aiSummaryVersion: { increment: 1 } },
    });
  }

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
    parentType?: ParentEntityType,
    parentId?: string,
  ) {
    const { take, skip } = paginate(page, limit);
    const where: Prisma.NoteWhereInput = {
      teamId,
      deletedAt: null,
      ...(parentType && parentId ? { parentType, parentId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
      }),
      this.prisma.note.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async get(teamId: string, id: string) {
    const row = await this.prisma.note.findFirst({
      where: { id, teamId, deletedAt: null },
    });
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(
    teamId: string,
    userId: string,
    body: { parentType: ParentEntityType; parentId: string; body: string },
  ) {
    await this.assertParent(teamId, body.parentType, body.parentId);
    const row = await this.prisma.note.create({
      data: {
        teamId,
        parentType: body.parentType,
        parentId: body.parentId,
        body: body.body,
      },
    });
    await Promise.all([
      this.activities.append(teamId, userId, body.parentType, body.parentId, "note.created", {
        noteId: row.id,
      }),
      this.bumpLeadSummaryVersionForParent(teamId, body.parentType, body.parentId),
    ]);
    return row;
  }

  async update(teamId: string, userId: string, id: string, body: { body: string }) {
    const existing = await this.get(teamId, id);
    const row = await this.prisma.note.update({
      where: { id },
      data: { body: body.body },
    });
    await Promise.all([
      this.activities.append(
        teamId,
        userId,
        existing.parentType,
        existing.parentId,
        "note.updated",
        {
          noteId: id,
          changes: {
            body: {
              from: existing.body.slice(0, 180),
              to: row.body.slice(0, 180),
            },
          },
        },
      ),
      this.bumpLeadSummaryVersionForParent(teamId, existing.parentType, existing.parentId),
    ]);
    return row;
  }

  async remove(teamId: string, userId: string, id: string) {
    const existing = await this.get(teamId, id);
    await this.prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await Promise.all([
      this.activities.append(
        teamId,
        userId,
        existing.parentType,
        existing.parentId,
        "note.deleted",
        { noteId: id },
      ),
      this.bumpLeadSummaryVersionForParent(teamId, existing.parentType, existing.parentId),
    ]);
    return { ok: true };
  }
}
