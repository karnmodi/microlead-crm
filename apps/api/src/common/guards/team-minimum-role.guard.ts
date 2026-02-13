import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TeamRole } from "@prisma/client";
import { TEAM_MIN_ROLE_KEY } from "../constants";
import type { TeamContext } from "../decorators/current-team.decorator";

const rank: Record<TeamRole, number> = {
  [TeamRole.MEMBER]: 1,
  [TeamRole.ADMIN]: 2,
  [TeamRole.OWNER]: 3,
};

/** Use after TeamGuard. Requires `teamContext.role` to be at least the handler metadata role. */
@Injectable()
export class TeamMinimumRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const minRole = this.reflector.getAllAndOverride<TeamRole>(TEAM_MIN_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!minRole) return true;

    const req = context.switchToHttp().getRequest<{ teamContext?: TeamContext }>();
    const ctx = req.teamContext;
    if (!ctx?.role) {
      throw new ForbiddenException({ message: "No team context." });
    }
    if (rank[ctx.role] < rank[minRole]) {
      throw new ForbiddenException({
        message: "Insufficient permissions for this workspace.",
      });
    }
    return true;
  }
}
