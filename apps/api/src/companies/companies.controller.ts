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
import { TeamRole } from "@prisma/client";
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import { CurrentTeam, type TeamContext } from "../common/decorators/current-team.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequireTeamMinimumRole } from "../common/decorators/require-team-minimum-role.decorator";
import { TeamGuard } from "../common/guards/team.guard";
import { CompaniesService } from "./companies.service";

class CompanyCreateDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  employeeCount?: number;
}

class CompanyUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  industry?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  employeeCount?: number | null;
}

class CompanyListQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 20;

  @IsOptional()
  @IsString()
  q?: string;
}

@Controller("companies")
@UseGuards(TeamGuard)
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  list(@CurrentTeam() team: TeamContext, @Query() q: CompanyListQuery) {
    return this.companies.list(team.teamId, q.page, q.limit, q.q);
  }

  @Get(":id")
  get(@CurrentTeam() team: TeamContext, @Param("id", ParseUUIDPipe) id: string) {
    return this.companies.get(team.teamId, id);
  }

  @Post()
  create(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: CompanyCreateDto,
  ) {
    return this.companies.create(team.teamId, user.id, dto);
  }

  @Patch(":id")
  update(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CompanyUpdateDto,
  ) {
    return this.companies.update(team.teamId, user.id, id, dto);
  }

  @Delete(":id")
  @RequireTeamMinimumRole(TeamRole.ADMIN)
  remove(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.companies.remove(team.teamId, user.id, id);
  }
}
