import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { TeamRole } from "@prisma/client";
import { TEAM_MIN_ROLE_KEY } from "../constants";
import { TeamMinimumRoleGuard } from "../guards/team-minimum-role.guard";

export function RequireTeamMinimumRole(role: TeamRole) {
  return applyDecorators(SetMetadata(TEAM_MIN_ROLE_KEY, role), UseGuards(TeamMinimumRoleGuard));
}
