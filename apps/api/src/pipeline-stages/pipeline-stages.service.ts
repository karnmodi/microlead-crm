import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ActivitiesService } from "../activities/activities.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PipelineStagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  list(teamId: string) {
    return this.prisma.pipelineStage.findMany({
      where: { teamId },
      orderBy: { sortOrder: "asc" },
    });
  }

  async create(teamId: string, userId: string, name: string) {
    const max = await this.prisma.pipelineStage.aggregate({
      where: { teamId },
      _max: { sortOrder: true },
    });
    const sortOrder = (max._max.sortOrder ?? -1) + 1;
    const row = await this.prisma.pipelineStage.create({
      data: { teamId, name, sortOrder },
    });
    await this.activities.append(teamId, userId, "PIPELINE_STAGE", row.id, "stage.created", {
      name,
    });
    return row;
  }

  async update(teamId: string, userId: string, id: string, name: string) {
    const row = await this.prisma.pipelineStage.findFirst({ where: { id, teamId } });
    if (!row) throw new NotFoundException();
    const updated = await this.prisma.pipelineStage.update({
      where: { id },
      data: { name },
    });
    await this.activities.append(teamId, userId, "PIPELINE_STAGE", id, "stage.updated", { name });
    return updated;
  }

  async reorder(teamId: string, userId: string, orderedIds: string[]) {
    const existing = await this.prisma.pipelineStage.findMany({
      where: { teamId },
      select: { id: true },
    });
    const set = new Set(existing.map((e) => e.id));
    if (orderedIds.length !== set.size || orderedIds.some((id) => !set.has(id))) {
      throw new BadRequestException("Invalid stage id list for this team.");
    }
    await this.prisma.$transaction(
      orderedIds.map((id, i) =>
        this.prisma.pipelineStage.update({
          where: { id },
          data: { sortOrder: i },
        }),
      ),
    );
    await this.activities.append(teamId, userId, "PIPELINE_STAGE", orderedIds[0], "stage.reordered", {
      orderedIds,
    });
    return this.list(teamId);
  }

  async remove(teamId: string, userId: string, id: string) {
    const row = await this.prisma.pipelineStage.findFirst({ where: { id, teamId } });
    if (!row) throw new NotFoundException();
    const leadCount = await this.prisma.lead.count({
      where: { teamId, stageId: id, deletedAt: null },
    });
    if (leadCount > 0) {
      throw new BadRequestException("Move or delete leads before removing this stage.");
    }
    await this.prisma.pipelineStage.delete({ where: { id } });
    await this.activities.append(teamId, userId, "PIPELINE_STAGE", id, "stage.deleted", {});
    return { ok: true };
  }
}
