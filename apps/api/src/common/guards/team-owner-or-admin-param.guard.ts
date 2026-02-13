import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { TeamRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthUser } from "../decorators/current-user.decorator";

/** Ensures the user is OWNER or ADMIN of `params.teamId`. */
@Injectable()
export class TeamOwnerOrAdminParamGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      user?: AuthUser;
      params: { teamId?: string };
    }>();
    const user = req.user;
    if (!user?.id) throw new UnauthorizedException();

    const teamId = req.params.teamId?.trim();
    if (!teamId) {
      throw new ForbiddenException({ message: "Missing team id." });
    }

    const membership = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: user.id, teamId } },
    });
    if (!membership || (membership.role !== TeamRole.OWNER && membership.role !== TeamRole.ADMIN)) {
      throw new ForbiddenException({
        message: "Only workspace owners and admins can perform this action.",
      });
    }
    return true;
  }
}
