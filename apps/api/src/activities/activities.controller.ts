import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { CurrentTeam } from "../common/decorators/current-team.decorator";
import type { TeamContext } from "../common/decorators/current-team.decorator";
import { TeamGuard } from "../common/guards/team.guard";
import { ActivitiesService } from "./activities.service";

class ActivitiesQueryDto {
  @IsString()
  entityType!: string;

  @IsUUID()
  entityId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

@Controller("activities")
@UseGuards(TeamGuard)
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  list(@CurrentTeam() team: TeamContext, @Query() q: ActivitiesQueryDto) {
    return this.activities.listForEntity(team.teamId, q.entityType, q.entityId, q.page, q.limit);
  }
}
