import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { IsEnum, IsUUID } from "class-validator";
import { memoryStorage } from "multer";
import { CurrentTeam, type TeamContext } from "../common/decorators/current-team.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { TeamGuard } from "../common/guards/team.guard";
import { AttachmentsService } from "./attachments.service";
import { ParentEntityType } from "@prisma/client";

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

  @Get(":id/download")
  async download(
    @CurrentTeam() team: TeamContext,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const { stream, mimeType, filename } = await this.attachments.streamFile(team.teamId, id);
    return new StreamableFile(stream, {
      type: mimeType,
      disposition: filename ? `attachment; filename="${filename.replace(/"/g, "")}"` : undefined,
    });
  }

  @Delete(":id")
  remove(
    @CurrentTeam() team: TeamContext,
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.attachments.remove(team.teamId, user.id, id);
  }
}
