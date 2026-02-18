import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { LeadPriority, LeadStatus, TeamRole } from "@prisma/client";
import { CurrentTeam, type TeamContext } from "../common/decorators/current-team.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequireTeamMinimumRole } from "../common/decorators/require-team-minimum-role.decorator";
import { TeamGuard } from "../common/guards/team.guard";
import { LeadsService } from "./leads.service";

class LeadCreateDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsUUID()
  stageId!: string;

  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  tags?: string[];
}

class LeadUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;

  @IsOptional()
  @IsNumber()
  value?: number | null;

  @IsOptional()
  @IsUUID()
  companyId?: string | null;

  @IsOptional()
  @IsUUID()
  contactId?: string | null;

  @IsOptional()
  @IsUUID()
  ownerId?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number | null;

  @IsOptional()
  @IsString()
  source?: string | null;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string | null;

  @IsOptional()
  @IsDateString()
  closedAt?: string | null;

  @IsOptional()
  @IsString()
  lostReason?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  tags?: string[] | null;
}

class LeadListQuery {
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
  limit = 20;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;
}

class KanbanQuery {
  @IsOptional()
  @IsIn(["updatedAt", "value", "priority", "expectedCloseDate", "title"])
  sortBy?: "updatedAt" | "value" | "priority" | "expectedCloseDate" | "title";

  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}

@Controller("leads")
@UseGuards(TeamGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get("kanban")
  kanban(@CurrentTeam() team: TeamContext, @Query() query: KanbanQuery) {
    return this.leads.kanban(team.teamId, {
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get()
  list(@CurrentTeam() team: TeamContext, @Query() q: LeadListQuery) {
    return this.leads.list(team.teamId, q.page, q.limit, {
      q: q.q,
      stageId: q.stageId,
      ownerId: q.ownerId,
      status: q.status,
    });
  }

  @Get(":id")
  get(@CurrentTeam() team: TeamContext, @Param("id", ParseUUIDPipe) id: string) {
    return this.leads.get(team.teamId, id);
  }

  @Post()
  create(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: LeadCreateDto,
  ) {
    return this.leads.create(team.teamId, user.id, dto);
  }

  @Patch(":id")
  update(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: LeadUpdateDto,
  ) {
    return this.leads.update(team.teamId, user.id, id, dto);
  }

  @Delete(":id")
  @RequireTeamMinimumRole(TeamRole.ADMIN)
  remove(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.leads.remove(team.teamId, user.id, id);
  }
}
