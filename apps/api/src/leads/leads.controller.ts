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
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { LeadPriority } from "@prisma/client";
import { CurrentTeam, type TeamContext } from "../common/decorators/current-team.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
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
}

@Controller("leads")
@UseGuards(TeamGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get("kanban")
  kanban(@CurrentTeam() team: TeamContext) {
    return this.leads.kanban(team.teamId);
  }

  @Get()
  list(@CurrentTeam() team: TeamContext, @Query() q: LeadListQuery) {
    return this.leads.list(team.teamId, q.page, q.limit, {
      q: q.q,
      stageId: q.stageId,
      ownerId: q.ownerId,
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
  remove(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.leads.remove(team.teamId, user.id, id);
  }
}
