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
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from "class-validator";
import { ParentEntityType, TeamRole } from "@prisma/client";
import { CurrentTeam, type TeamContext } from "../common/decorators/current-team.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequireTeamMinimumRole } from "../common/decorators/require-team-minimum-role.decorator";
import { TeamGuard } from "../common/guards/team.guard";
import { NotesService } from "./notes.service";

class NoteCreateDto {
  @IsEnum(ParentEntityType)
  parentType!: ParentEntityType;

  @IsUUID()
  parentId!: string;

  @IsString()
  @MinLength(1)
  text!: string;
}

class NoteUpdateDto {
  @IsString()
  @MinLength(1)
  body!: string;
}

class NoteListQuery {
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
  @IsEnum(ParentEntityType)
  parentType?: ParentEntityType;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

@Controller("notes")
@UseGuards(TeamGuard)
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(@CurrentTeam() team: TeamContext, @Query() q: NoteListQuery) {
    return this.notes.list(team.teamId, q.page, q.limit, q.parentType, q.parentId);
  }

  @Get(":id")
  get(@CurrentTeam() team: TeamContext, @Param("id", ParseUUIDPipe) id: string) {
    return this.notes.get(team.teamId, id);
  }

  @Post()
  create(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: NoteCreateDto,
  ) {
    return this.notes.create(team.teamId, user.id, {
      parentType: dto.parentType,
      parentId: dto.parentId,
      body: dto.text,
    });
  }

  @Patch(":id")
  update(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: NoteUpdateDto,
  ) {
    return this.notes.update(team.teamId, user.id, id, dto);
  }

  @Delete(":id")
  @RequireTeamMinimumRole(TeamRole.ADMIN)
  remove(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.notes.remove(team.teamId, user.id, id);
  }
}
