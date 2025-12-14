import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async setPreferredTeam(userId: string, teamId: string) {
    const m = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!m) {
      throw new ForbiddenException("Not a member of this workspace.");
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { preferredTeamId: teamId },
      select: { id: true, email: true, name: true, preferredTeamId: true },
    });
  }
}
