import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import { CurrentTeam, type TeamContext } from "../common/decorators/current-team.decorator";
import { TeamGuard } from "../common/guards/team.guard";
import { AiService } from "./ai.service";

class LeadIdBody {
  @IsUUID()
  leadId!: string;
}

class NextActionsBody {
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;
}

class OutreachBody {
  @IsUUID()
  leadId!: string;

  @IsOptional()
  @IsIn(["email", "linkedin"])
  channel?: "email" | "linkedin";
}

@Controller("ai")
@UseGuards(TeamGuard)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("lead-summary")
  leadSummary(@CurrentTeam() team: TeamContext, @Body() dto: LeadIdBody) {
    return this.ai.leadSummary(team.teamId, dto.leadId);
  }

  @Post("next-actions")
  nextActions(@CurrentTeam() team: TeamContext, @Body() dto: NextActionsBody) {
    return this.ai.nextActions(team.teamId, dto.leadId, dto.contactId);
  }

  @Post("outreach-draft")
  outreach(@CurrentTeam() team: TeamContext, @Body() dto: OutreachBody) {
    return this.ai.outreachDraft(team.teamId, dto.leadId, dto.channel ?? "email");
  }
}
