import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { ParentEntityType } from "@prisma/client";
import { createReadStream } from "fs";
import { mkdir } from "fs/promises";
import { join, posix } from "path";
import { randomUUID } from "crypto";
import { ActivitiesService } from "../activities/activities.service";
import { PrismaService } from "../prisma/prisma.service";
import { DocumentExtractorService } from "./document-extractor.service";

@Injectable()
export class AttachmentsService implements OnModuleInit {
  private root!: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
    private readonly extractor: DocumentExtractorService,
  ) {}

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

  async onModuleInit() {
    this.root = process.env.STORAGE_PATH ?? join(process.cwd(), "storage", "uploads");
    await mkdir(this.root, { recursive: true });
  }

  diskPath(storageKey: string) {
    return join(this.root, storageKey);
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
    const safe = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${randomUUID()}-${safe}`;
    const storageKey = posix.join(teamId, fileName);
    const fs = await import("fs/promises");
    const dir = join(this.root, teamId);
    await mkdir(dir, { recursive: true });
    await fs.writeFile(join(this.root, teamId, fileName), file.buffer);

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

    // Fire-and-forget document extraction — does not block the upload response
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
    const row = await this.prisma.attachment.findFirst({
      where: { id, teamId },
    });
    if (!row) throw new NotFoundException();
    return row;
  }

  async streamFile(teamId: string, id: string) {
    const row = await this.get(teamId, id);
    const path = this.diskPath(row.storageKey);
    return { stream: createReadStream(path), mimeType: row.mimeType, filename: row.filename };
  }

  async reExtract(teamId: string, id: string) {
    const row = await this.get(teamId, id);
    const fs = await import("fs/promises");
    const buffer = await fs.readFile(this.diskPath(row.storageKey));
    void this.extractor.extract(row.id, buffer, row.mimeType);
    return { ok: true, status: "pending" };
  }

  async remove(teamId: string, userId: string, id: string) {
    const row = await this.get(teamId, id);
    const fs = await import("fs/promises");
    try {
      await fs.unlink(this.diskPath(row.storageKey));
    } catch {
      /* ignore missing file */
    }
    await this.prisma.attachment.delete({ where: { id } });
    await this.activities.append(teamId, userId, row.parentType, row.parentId, "attachment.deleted", {
      attachmentId: id,
    });
    await this.bumpLeadSummaryVersionForParent(teamId, row.parentType, row.parentId);
    return { ok: true };
  }
}
