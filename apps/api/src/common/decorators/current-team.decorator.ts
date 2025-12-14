import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { TeamRole } from "@prisma/client";

export type TeamContext = { teamId: string; role: TeamRole };

export const CurrentTeam = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TeamContext => {
    const req = ctx.switchToHttp().getRequest<{ teamContext: TeamContext }>();
    return req.teamContext;
  },
);
