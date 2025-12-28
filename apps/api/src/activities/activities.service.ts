import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { paginate } from "../common/dto/pagination.dto";

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async append(
    teamId: string,
    actorUserId: string,
    entityType: string,
    entityId: string,
    action: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.activity.create({
      data: {
        teamId,
        actorUserId,
        entityType,
        entityId,
        action,
        ...(metadata !== undefined ? { metadata } : {}),
      },
    });
  }

  async listForEntity(
    teamId: string,
    entityType: string,
    entityId: string,
    page: number,
    limit: number,
  ) {
    const { take, skip } = paginate(page, limit);
    const where = { teamId, entityType, entityId };
    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.activity.count({ where }),
    ]);
    return { data: items, meta: { page, limit, total } };
  }
}
