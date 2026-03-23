import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { IsEnum, IsUUID } from "class-validator";
import { memoryStorage } from "multer";
import { CurrentTeam, type TeamContext } from "../common/decorators/current-team.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { RequireTeamMinimumRole } from "../common/decorators/require-team-minimum-role.decorator";
import { TeamGuard } from "../common/guards/team.guard";
import { AttachmentsService } from "./attachments.service";
import { ParentEntityType, TeamRole } from "@prisma/client";

class UploadMetaDto {
  @IsEnum(ParentEntityType)
  parentType!: ParentEntityType;

  @IsUUID()
  parentId!: string;
}

@Controller("attachments")
@UseGuards(TeamGuard)
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get()
  list(
    @CurrentTeam() team: TeamContext,
    @Query("parentType", new ParseEnumPipe(ParentEntityType)) parentType: ParentEntityType,
    @Query("parentId", ParseUUIDPipe) parentId: string,
  ) {
    return this.attachments.listForParent(team.teamId, parentType, parentId);
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Body() meta: UploadMetaDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException("File required");
    }
    return this.attachments.createFromUpload(team.teamId, user.id, meta.parentType, meta.parentId, file);
  }

  @Post(":id/extract")
  reExtract(
    @CurrentTeam() team: TeamContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.attachments.reExtract(team.teamId, id);
  }

  @Get(":id/download")
  async download(
    @CurrentTeam() team: TeamContext,
    @Param("id", ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { buffer, mimeType, filename } = await this.attachments.streamFile(team.teamId, id);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", buffer.length);
    if (filename) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename.replace(/"/g, "")}"`,
      );
    }
    res.end(buffer);
  }

  @Delete(":id")
  @RequireTeamMinimumRole(TeamRole.ADMIN)
  remove(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.attachments.remove(team.teamId, user.id, id);
  }
}
