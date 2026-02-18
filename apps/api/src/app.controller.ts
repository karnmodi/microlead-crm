import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentTeam, type TeamContext } from "./common/decorators/current-team.decorator";
import { Public } from "./common/decorators/public.decorator";
import { TeamGuard } from "./common/guards/team.guard";
import { AppService } from "./app.service";

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
}
