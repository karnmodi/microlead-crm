import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ArrayMinSize, IsArray, IsString, IsUUID, MinLength } from "class-validator";
import { CurrentTeam, type TeamContext } from "../common/decorators/current-team.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { TeamGuard } from "../common/guards/team.guard";
import { PipelineStagesService } from "./pipeline-stages.service";

class CreateStageDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

class UpdateStageDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

class ReorderDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  ids!: string[];
}

@Controller("pipeline-stages")
@UseGuards(TeamGuard)
export class PipelineStagesController {
  constructor(private readonly stages: PipelineStagesService) {}

  @Get()
  list(@CurrentTeam() team: TeamContext) {
    return this.stages.list(team.teamId);
  }

  @Post()
  create(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateStageDto,
  ) {
    return this.stages.create(team.teamId, user.id, dto.name);
  }

  @Patch("reorder")
  reorder(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderDto,
  ) {
    return this.stages.reorder(team.teamId, user.id, dto.ids);
  }

  @Patch(":id")
  update(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.stages.update(team.teamId, user.id, id, dto.name);
  }

  @Delete(":id")
  remove(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.stages.remove(team.teamId, user.id, id);
  }
}
