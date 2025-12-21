import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ActivitiesService } from "../activities/activities.service";
import { paginate } from "../common/dto/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  async list(teamId: string, page: number, limit: number, q?: string) {
    const { take, skip } = paginate(page, limit);
    const where: Prisma.CompanyWhereInput = {
      teamId,
      deletedAt: null,
      ...(q
        ? { name: { contains: q, mode: "insensitive" } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
      }),
      this.prisma.company.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async get(teamId: string, id: string) {
    const row = await this.prisma.company.findFirst({
      where: { id, teamId, deletedAt: null },
    });
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(teamId: string, userId: string, body: { name: string; website?: string }) {
    const row = await this.prisma.company.create({
      data: { teamId, name: body.name, website: body.website },
    });
    await this.activities.append(teamId, userId, "COMPANY", row.id, "company.created", {
      name: row.name,
    });
    return row;
  }

  async update(teamId: string, userId: string, id: string, body: { name?: string; website?: string }) {
    await this.get(teamId, id);
    const row = await this.prisma.company.update({
      where: { id },
      data: body,
    });
    await this.activities.append(teamId, userId, "COMPANY", id, "company.updated", body);
    return row;
  }

  async remove(teamId: string, userId: string, id: string) {
    await this.get(teamId, id);
    const row = await this.prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.activities.append(teamId, userId, "COMPANY", id, "company.deleted", {});
    return row;
  }
}
