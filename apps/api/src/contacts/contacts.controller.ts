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
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { TeamRole } from "@prisma/client";
import { CurrentTeam, type TeamContext } from "../common/decorators/current-team.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequireTeamMinimumRole } from "../common/decorators/require-team-minimum-role.decorator";
import { TeamGuard } from "../common/guards/team.guard";
import { ContactsService } from "./contacts.service";

class ContactCreateDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;
}

class ContactUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string | null;

  @IsOptional()
  @IsString()
  linkedinUrl?: string | null;
}

class ContactListQuery {
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

  @IsOptional()
  @IsUUID()
  companyId?: string;
}

@Controller("contacts")
@UseGuards(TeamGuard)
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  list(@CurrentTeam() team: TeamContext, @Query() q: ContactListQuery) {
    return this.contacts.list(team.teamId, q.page, q.limit, q.q, q.companyId);
  }

  @Get(":id")
  get(@CurrentTeam() team: TeamContext, @Param("id", ParseUUIDPipe) id: string) {
    return this.contacts.get(team.teamId, id);
  }

  @Post()
  create(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: ContactCreateDto,
  ) {
    return this.contacts.create(team.teamId, user.id, dto);
  }

  @Patch(":id")
  update(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ContactUpdateDto,
  ) {
    return this.contacts.update(team.teamId, user.id, id, dto);
  }

  @Delete(":id")
  @RequireTeamMinimumRole(TeamRole.ADMIN)
  remove(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.contacts.remove(team.teamId, user.id, id);
  }
}
