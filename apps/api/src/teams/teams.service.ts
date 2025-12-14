import { Injectable } from "@nestjs/common";
import { TeamRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.teamMember.findMany({
      where: { userId },
      include: { team: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(userId: string, name: string) {
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({ data: { name } });
      await tx.teamMember.create({
        data: { teamId: team.id, userId, role: TeamRole.OWNER },
      });
      await tx.user.update({
        where: { id: userId },
        data: { preferredTeamId: team.id },
      });
      return team;
    });
  }
}
