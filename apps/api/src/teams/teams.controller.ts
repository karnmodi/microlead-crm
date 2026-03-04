import {
  Body,
  Controller,
  Patch,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TeamRole } from "@prisma/client";
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { TeamMemberParamGuard } from "../common/guards/team-member-param.guard";
import { TeamOwnerOrAdminParamGuard } from "../common/guards/team-owner-or-admin-param.guard";
import { TeamsService } from "./teams.service";

class CreateTeamDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

class AddMemberDto {
  @IsEmail()
  email!: string;

  @IsIn([TeamRole.ADMIN, TeamRole.MEMBER])
  role!: TeamRole;
}

class CreateInviteDto {
  @IsEmail()
  email!: string;

  @IsIn([TeamRole.ADMIN, TeamRole.MEMBER])
  role!: TeamRole;
}

class UpdateAiSettingsDto {
  @IsOptional()
  @IsString()
  businessFocus?: string | null;

  @IsOptional()
  @IsString()
  crmPurpose?: string | null;

  @IsOptional()
  @IsString()
  targetAudience?: string | null;

  @IsOptional()
  @IsString()
  toneGuidelines?: string | null;

  @IsOptional()
  @IsString()
  emailSignature?: string | null;

  @IsOptional()
  @IsString()
  defaultClosing?: string | null;

  @IsOptional()
  @IsString()
  languageStyle?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  responseVerbosity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  reasoningDepth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  actionHorizonDays?: number;
}

@Controller("teams")
export class TeamsController {
  constructor(
    private readonly teams: TeamsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.teams.listForUser(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    return this.teams.create(user.id, dto.name);
  }

  @Get(":teamId/members")
  @UseGuards(TeamMemberParamGuard)
  listMembers(@Param("teamId", ParseUUIDPipe) teamId: string) {
    return this.teams.listMembers(teamId);
  }

  @Post(":teamId/members")
  @UseGuards(TeamOwnerOrAdminParamGuard)
  addMember(
    @CurrentUser() user: AuthUser,
    @Param("teamId", ParseUUIDPipe) teamId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.teams.addMember(user.id, teamId, dto.email, dto.role);
  }

  @Post(":teamId/invites")
  @UseGuards(TeamOwnerOrAdminParamGuard)
  async createInvite(
    @CurrentUser() user: AuthUser,
    @Param("teamId", ParseUUIDPipe) teamId: string,
    @Body() dto: CreateInviteDto,
  ) {
    const raw = this.config.get<string>("WEB_ORIGIN") ?? "http://localhost:3000";
    const webOrigin = raw.split(",")[0]?.trim() || "http://localhost:3000";
    return this.teams.createInvite(user.id, teamId, dto.email, dto.role, webOrigin);
  }

  @Get(":teamId/ai-settings")
  @UseGuards(TeamMemberParamGuard)
  aiSettings(@Param("teamId", ParseUUIDPipe) teamId: string) {
    return this.teams.getAiSettings(teamId);
  }

  @Patch(":teamId/ai-settings")
  @UseGuards(TeamOwnerOrAdminParamGuard)
  updateAiSettings(
    @Param("teamId", ParseUUIDPipe) teamId: string,
    @Body() dto: UpdateAiSettingsDto,
  ) {
    return this.teams.upsertAiSettings(teamId, dto);
  }
}
