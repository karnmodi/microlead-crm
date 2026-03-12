import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, MinLength, ValidateNested } from "class-validator";
import { CurrentTeam, type TeamContext } from "../common/decorators/current-team.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
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

class ActionItemDetailedDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsDateString()
  dueAt!: string;
}

class CreateTasksFromActionsBody {
  @IsUUID()
  leadId!: string;

  @IsArray()
  @IsString({ each: true })
  actionItems!: string[];

  @IsOptional()
  @IsArray()
  @Type(() => ActionItemDetailedDto)
  @ValidateNested({ each: true })
  actionItemsDetailed?: ActionItemDetailedDto[];
}

class SendDraftEmailBody {
  @IsUUID()
  leadId!: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  @MinLength(1)
  body!: string;
}

class LogLinkedinDraftBody {
  @IsUUID()
  leadId!: string;

  @IsString()
  @MinLength(1)
  message!: string;
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

  @Post("actions-to-tasks")
  actionsToTasks(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTasksFromActionsBody,
  ) {
    return this.ai.createLeadTasksFromActions(
      team.teamId,
      user.id,
      dto.leadId,
      dto.actionItems,
      dto.actionItemsDetailed,
    );
  }

  @Post("send-draft-email")
  sendDraftEmail(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: SendDraftEmailBody,
  ) {
    return this.ai.sendLeadDraftEmail(team.teamId, user.id, dto.leadId, dto.subject, dto.body);
  }

  @Post("log-linkedin-intent")
  logLinkedinIntent(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: LogLinkedinDraftBody,
  ) {
    return this.ai.logLinkedinDraftIntent(team.teamId, user.id, dto.leadId, dto.message);
  }

  @Post("win-probability")
  winProbability(@CurrentTeam() team: TeamContext, @Body() dto: LeadIdBody) {
    return this.ai.predictWinProbability(team.teamId, dto.leadId);
  }
}
