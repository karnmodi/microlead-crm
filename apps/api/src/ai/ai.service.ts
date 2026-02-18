import * as fs from "fs";
import * as path from "path";

import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import OpenAI, { APIError } from "openai";
import type { Prisma } from "@prisma/client";
import {
  buildLeadSummaryPrompt,
  buildNextActionsPrompt,
  buildOutreachDraftPrompt,
} from "@microlead-crm/ai";
import { PrismaService } from "../prisma/prisma.service";

function tagsFromJson(tags: Prisma.JsonValue | null | undefined): string[] | undefined {
  if (tags === null || tags === undefined) return undefined;
  if (Array.isArray(tags) && tags.every((t) => typeof t === "string")) return tags as string[];
  return undefined;
}

/** Parse a .env file into a key→value map without touching process.env. */
function parseEnvFile(filePath: string): Record<string, string> {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const result: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      // Strip surrounding quotes
      result[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    }
    return result;
  } catch {
    return {};
  }
}

/** Read Azure config directly from .env files — ignores process.env overrides. */
function loadAzureConfigFromFile(): {
  key: string;
  endpoint: string;
  deployment: string;
  apiVersion: string;
} | null {
  const candidates = [
    path.join(process.cwd(), ".env"),
    path.join(process.cwd(), "..", "..", ".env"),
  ];
  const merged: Record<string, string> = {};
  // Later files don't override earlier ones
  for (const p of candidates) {
    const parsed = parseEnvFile(p);
    for (const [k, v] of Object.entries(parsed)) {
      if (!(k in merged)) merged[k] = v;
    }
  }

  const key = merged["AZURE_OPENAI_API_KEY"]?.trim();
  const endpoint = merged["AZURE_OPENAI_ENDPOINT"]?.trim()?.replace(/\/$/, "");
  const deployment = merged["AZURE_OPENAI_DEPLOYMENT"]?.trim();
  const apiVersion = merged["AZURE_OPENAI_API_VERSION"]?.trim() ?? "2024-08-01-preview";

  if (key && endpoint && deployment) return { key, endpoint, deployment, apiVersion };
  return null;
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private azureCfg: ReturnType<typeof loadAzureConfigFromFile> = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.azureCfg = loadAzureConfigFromFile();
    const cfg = this.azureCfg;

    if (cfg) {
      this.logger.log(`AI provider : Azure OpenAI (credentials read from .env file)`);
      this.logger.log(`  Endpoint  : ${cfg.endpoint}`);
      this.logger.log(`  Deployment: ${cfg.deployment}`);
      this.logger.log(`  API ver   : ${cfg.apiVersion}`);
      this.logger.log(`  Key       : ${cfg.key.slice(0, 6)}... (${cfg.key.length} chars)`);
    } else if (process.env.OPENAI_API_KEY?.trim()) {
      this.logger.log(`AI provider : OpenAI (OPENAI_API_KEY from process.env)`);
    } else {
      this.logger.warn(`AI provider : NOT CONFIGURED — add AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_DEPLOYMENT to .env`);
    }
  }

  private async complete(system: string, user: string): Promise<string> {
    const cfg = this.azureCfg;

    if (cfg) {
      const url = `${cfg.endpoint}/openai/responses?api-version=${cfg.apiVersion}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": cfg.key,
        },
        body: JSON.stringify({
          model: cfg.deployment,
          instructions: system,
          input: user,
        }),
      });

      type AzureResponsesOutput = {
        output_text?: string;
        output?: Array<{
          type: string;
          content?: Array<{ type: string; text?: string }>;
        }>;
        error?: { message?: string; code?: string };
      };
      const data = (await res.json()) as AzureResponsesOutput;

      if (!res.ok) {
        const msg = data.error?.message ?? res.statusText;
        if (res.status === 401) {
          throw new HttpException(
            `Azure 401 — URL: ${url} | Key: ${cfg.key.slice(0, 6)}... (${cfg.key.length} chars) | ${msg}`,
            HttpStatus.UNAUTHORIZED,
          );
        }
        throw new HttpException(
          msg,
          res.status >= 400 && res.status < 600 ? res.status : HttpStatus.BAD_GATEWAY,
        );
      }

      const text = (
        data.output_text ??
        data.output?.[0]?.content?.find((c) => c.type === "output_text")?.text ??
        ""
      ).trim();
      if (!text) throw new BadGatewayException("Empty AI response");
      return text;
    }

    // Fallback: standard OpenAI
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: "AI_NOT_CONFIGURED",
          message:
            "AI provider is not configured. Add AZURE_OPENAI_API_KEY + AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_DEPLOYMENT to .env",
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const openai = new OpenAI({ apiKey: key });
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    try {
      const r = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      const text = r.choices[0]?.message?.content?.trim();
      if (!text) throw new BadGatewayException("Empty AI response");
      return text;
    } catch (e: unknown) {
      if (e instanceof APIError) {
        const status =
          typeof e.status === "number" && e.status >= 400 && e.status < 600
            ? e.status
            : HttpStatus.BAD_GATEWAY;
        throw new HttpException(e.message, status);
      }
      throw e;
    }
  }

  private async leadContext(teamId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, teamId, deletedAt: null },
      include: {
        stage: true,
        company: true,
        contact: true,
      },
    });
    if (!lead) {
      throw new NotFoundException(
        "Lead not found in this workspace. Check the URL or switch workspace if this lead belongs to another team.",
      );
    }
    const notes = await this.prisma.note.findMany({
      where: {
        teamId,
        deletedAt: null,
        parentType: "LEAD",
        parentId: leadId,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { body: true },
    });
    return { lead, notes: notes.map((n) => n.body) };
  }

  async leadSummary(teamId: string, leadId: string) {
    const { lead, notes } = await this.leadContext(teamId, leadId);
    const tagList = tagsFromJson(lead.tags);
    const userPrompt = buildLeadSummaryPrompt({
      leadTitle: lead.title,
      stageName: lead.stage.name,
      companyName: lead.company?.name,
      contactName: lead.contact
        ? `${lead.contact.firstName} ${lead.contact.lastName}`
        : undefined,
      value: lead.value != null ? String(lead.value) : undefined,
      currency: lead.currency,
      priority: lead.priority,
      description: lead.description ?? undefined,
      expectedCloseDate: lead.expectedCloseDate?.toISOString(),
      probability: lead.probability ?? undefined,
      source: lead.source ?? undefined,
      status: lead.status,
      tags: tagList,
      recentNotes: notes,
    });
    const text = await this.complete(
      "You are a concise B2B sales assistant. Output plain text bullets only.",
      userPrompt,
    );
    return { summary: text };
  }

  async nextActions(teamId: string, leadId?: string, contactId?: string) {
    if (!leadId && !contactId) {
      throw new HttpException("leadId or contactId required", HttpStatus.BAD_REQUEST);
    }
    if (leadId) {
      const { lead, notes } = await this.leadContext(teamId, leadId);
      const tasks = await this.prisma.task.findMany({
        where: {
          teamId,
          deletedAt: null,
          parentType: "LEAD",
          parentId: leadId,
          done: false,
        },
        take: 15,
        select: { title: true },
      });
      const userPrompt = buildNextActionsPrompt({
        entityLabel: "Lead",
        leadTitle: lead.title,
        stageName: lead.stage.name,
        description: lead.description ?? undefined,
        probability: lead.probability ?? undefined,
        expectedCloseDate: lead.expectedCloseDate?.toISOString(),
        openTasks: tasks.map((t) => t.title),
        recentNotes: notes,
      });
      const text = await this.complete(
        "You are a sales coach. Give actionable next steps only.",
        userPrompt,
      );
      return { actions: text };
    }

    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId!, teamId, deletedAt: null },
    });
    if (!contact) {
      throw new NotFoundException(
        "Contact not found in this workspace. Check the URL or switch workspace.",
      );
    }
    const tasks = await this.prisma.task.findMany({
      where: {
        teamId,
        deletedAt: null,
        parentType: "CONTACT",
        parentId: contactId!,
        done: false,
      },
      take: 15,
      select: { title: true },
    });
    const notes = await this.prisma.note.findMany({
      where: {
        teamId,
        deletedAt: null,
        parentType: "CONTACT",
        parentId: contactId!,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { body: true },
    });
    const name = `${contact.firstName} ${contact.lastName}`;
    const userPrompt = buildNextActionsPrompt({
      entityLabel: "Contact",
      contactName: name,
      openTasks: tasks.map((t) => t.title),
      recentNotes: notes.map((n) => n.body),
    });
    const text = await this.complete(
      "You are a sales coach. Give actionable next steps only.",
      userPrompt,
    );
    return { actions: text };
  }

  async outreachDraft(
    teamId: string,
    leadId: string,
    channel: "email" | "linkedin" = "email",
  ) {
    const { lead, notes } = await this.leadContext(teamId, leadId);
    const userPrompt = buildOutreachDraftPrompt({
      channel,
      leadTitle: lead.title,
      contactName: lead.contact
        ? `${lead.contact.firstName} ${lead.contact.lastName}`
        : undefined,
      companyName: lead.company?.name,
      stageName: lead.stage.name,
      description: lead.description ?? undefined,
    });
    if (notes.length) {
      void notes;
    }
    const text = await this.complete(
      "You write short, human outreach. No placeholder names like [Name].",
      userPrompt,
    );
    return { draft: text };
  }
}
