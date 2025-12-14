import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../decorators/current-user.decorator";
import type { TeamContext } from "../decorators/current-team.decorator";

@Injectable()
export class TeamGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: AuthUser;
      headers: Record<string, string | string[] | undefined>;
      teamContext?: TeamContext;
    }>();
    const user = req.user;
    if (!user?.id) throw new UnauthorizedException();

    const raw = req.headers["x-team-id"];
    const headerTeam = Array.isArray(raw) ? raw[0] : raw;

    let teamId = headerTeam?.trim() || undefined;
    if (!teamId) {
      const u = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { preferredTeamId: true },
      });
      teamId = u?.preferredTeamId ?? undefined;
    }

    if (!teamId) {
      throw new ForbiddenException({
        statusCode: 403,
        message: "No active workspace. Create a team or send X-Team-Id.",
      });
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: user.id, teamId } },
    });
    if (!membership) {
      throw new ForbiddenException({
        statusCode: 403,
        message: "Not a member of this workspace.",
      });
    }

    req.teamContext = { teamId, role: membership.role };
    return true;
  }
}
