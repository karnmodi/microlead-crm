import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { IsBoolean, IsOptional } from "class-validator";
import { CurrentTeam, type TeamContext } from "./common/decorators/current-team.decorator";
import { Public } from "./common/decorators/public.decorator";
import { TeamGuard } from "./common/guards/team.guard";
import { AppService } from "./app.service";

class BriefingBody {
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get("health")
  health() {
    return this.appService.health();
  }

  @Get("dashboard/summary")
  @UseGuards(TeamGuard)
  dashboardSummary(@CurrentTeam() team: TeamContext) {
    return this.appService.dashboardSummary(team.teamId);
  }

  @Post("dashboard/ai-briefing")
  @UseGuards(TeamGuard)
  aiDashboardBriefing(@CurrentTeam() team: TeamContext, @Body() body: BriefingBody) {
    return this.appService.getDashboardBriefing(team.teamId, body.force ?? false);
  }
}
