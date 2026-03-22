import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ParentEntityType } from "@prisma/client";
import { posix } from "path";
import { randomUUID } from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ActivitiesService } from "../activities/activities.service";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentExtractorService } from "./document-extractor.service";

const BUCKET = "Microlead";

@Injectable()
export class AttachmentsService {
  private readonly log = new Logger(AttachmentsService.name);
  private supabase!: SupabaseClient;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
    private readonly extractor: DocumentExtractorService,
  ) {
    const url = this.config.get<string>("SUPABASE_URL")?.trim();
    const key = this.config.get<string>("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    if (!url || !key) {
      this.log.warn(
        "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set — file uploads will fail",
      );
    } else {
      this.supabase = createClient(url, key, {
        auth: { persistSession: false },
      });
      this.log.log(`Supabase Storage configured → bucket: ${BUCKET}`);
    }
  }

  private get storage() {
    if (!this.supabase) {
      throw new InternalServerErrorException(
        "Storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)",
      );
    }
    return this.supabase.storage.from(BUCKET);
  }

  private async bumpLeadSummaryVersionForParent(
    teamId: string,
    parentType: ParentEntityType,
    parentId: string,
  ) {
    if (parentType !== ParentEntityType.LEAD) return;
    await this.prisma.lead.updateMany({
      where: { id: parentId, teamId, deletedAt: null },
      data: { aiSummaryVersion: { increment: 1 } },
    });
  }

  private async assertParent(teamId: string, type: ParentEntityType, id: string) {
    if (type === "LEAD") {
      const r = await this.prisma.lead.findFirst({ where: { id, teamId, deletedAt: null } });
      if (!r) throw new NotFoundException("Lead not found");
    } else if (type === "CONTACT") {
      const r = await this.prisma.contact.findFirst({ where: { id, teamId, deletedAt: null } });
      if (!r) throw new NotFoundException("Contact not found");
    } else {
      const r = await this.prisma.company.findFirst({ where: { id, teamId, deletedAt: null } });
      if (!r) throw new NotFoundException("Company not found");
    }
  }

  async createFromUpload(
    teamId: string,
    userId: string,
    parentType: ParentEntityType,
    parentId: string,
    file: Express.Multer.File,
  ) {
    await this.assertParent(teamId, parentType, parentId);

    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${randomUUID()}-${safe}`;
    const storageKey = posix.join(teamId, parentType.toLowerCase(), parentId, fileName);

    const { error } = await this.storage.upload(storageKey, file.buffer, {
      contentType: file.mimetype || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      this.log.error(`Supabase upload failed: ${error.message}`);
      throw new InternalServerErrorException(`Upload failed: ${error.message}`);
    }

    const row = await this.prisma.attachment.create({
      data: {
        teamId,
        parentType,
        parentId,
        storageKey,
        mimeType: file.mimetype || "application/octet-stream",
        size: file.size,
        filename: file.originalname,
      },
    });

    await this.activities.append(teamId, userId, parentType, parentId, "attachment.created", {
      attachmentId: row.id,
    });
    await this.bumpLeadSummaryVersionForParent(teamId, parentType, parentId);

    // Fire-and-forget document extraction
    void this.extractor.extract(row.id, file.buffer, file.mimetype || "application/octet-stream");

    return row;
  }

  async listForParent(teamId: string, parentType: ParentEntityType, parentId: string) {
    await this.assertParent(teamId, parentType, parentId);
    return this.prisma.attachment.findMany({
      where: { teamId, parentType, parentId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        createdAt: true,
      },
    });
  }

  async get(teamId: string, id: string) {
    const row = await this.prisma.attachment.findFirst({ where: { id, teamId } });
    if (!row) throw new NotFoundException();
    return row;
  }

  async streamFile(teamId: string, id: string) {
    const row = await this.get(teamId, id);

    const { data, error } = await this.storage.download(row.storageKey);
    if (error || !data) {
      this.log.error(`Supabase download failed for ${row.storageKey}: ${error?.message}`);
      throw new InternalServerErrorException("Could not retrieve file from storage");
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    return { buffer, mimeType: row.mimeType, filename: row.filename };
  }

  async reExtract(teamId: string, id: string) {
    const row = await this.get(teamId, id);
    const { data, error } = await this.storage.download(row.storageKey);
    if (error || !data) {
      throw new InternalServerErrorException("Could not retrieve file from storage");
    }
    const buffer = Buffer.from(await data.arrayBuffer());
    void this.extractor.extract(row.id, buffer, row.mimeType);
    return { ok: true, status: "pending" };
  }

  async remove(teamId: string, userId: string, id: string) {
    const row = await this.get(teamId, id);

    const { error } = await this.storage.remove([row.storageKey]);
    if (error) {
      this.log.warn(`Supabase delete failed for ${row.storageKey}: ${error.message}`);
    }

    await this.prisma.attachment.delete({ where: { id } });
    await this.activities.append(teamId, userId, row.parentType, row.parentId, "attachment.deleted", {
      attachmentId: id,
    });
    await this.bumpLeadSummaryVersionForParent(teamId, row.parentType, row.parentId);
    return { ok: true };
  }
}
