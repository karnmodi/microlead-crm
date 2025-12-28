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
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { ParentEntityType } from "@prisma/client";
import { CurrentTeam, type TeamContext } from "../common/decorators/current-team.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { TeamGuard } from "../common/guards/team.guard";
import { TasksService } from "./tasks.service";

class TaskCreateDto {
  @IsEnum(ParentEntityType)
  parentType!: ParentEntityType;

  @IsUUID()
  parentId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

class TaskUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;
}

class TaskListQuery {
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

  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}

@Controller("tasks")
@UseGuards(TeamGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(@CurrentTeam() team: TeamContext, @Query() q: TaskListQuery) {
    return this.tasks.list(team.teamId, q.page, q.limit, {
      parentType: q.parentType,
      parentId: q.parentId,
      assigneeId: q.assigneeId,
    });
  }

  @Get(":id")
  get(@CurrentTeam() team: TeamContext, @Param("id", ParseUUIDPipe) id: string) {
    return this.tasks.get(team.teamId, id);
  }

  @Post()
  create(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: TaskCreateDto,
  ) {
    return this.tasks.create(team.teamId, user.id, dto);
  }

  @Patch(":id")
  update(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: TaskUpdateDto,
  ) {
    return this.tasks.update(team.teamId, user.id, id, dto);
  }

  @Delete(":id")
  remove(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.tasks.remove(team.teamId, user.id, id);
  }
}
