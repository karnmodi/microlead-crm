import * as fs from "fs";
import * as path from "path";

import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import OpenAI, { APIError } from "openai";
import { ParentEntityType, type Prisma } from "@prisma/client";
import {
  buildLeadSummaryPrompt,
  buildNextActionsPrompt,
  buildOutreachDraftPrompt,
  buildWinProbabilityPrompt,
  type DocumentExtract,
} from "@microlead-crm/ai";
import { ActivitiesService } from "../activities/activities.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { TasksService } from "../tasks/tasks.service";

function tagsFromJson(tags: Prisma.JsonValue | null | undefined): string[] | undefined {
  if (tags === null || tags === undefined) return undefined;
  if (Array.isArray(tags) && tags.every((t) => typeof t === "string")) return tags as string[];
  return undefined;
}

type TeamAiSettingsShape = {
  businessFocus: string | null;
  crmPurpose: string | null;
  targetAudience: string | null;
  toneGuidelines: string | null;
  emailSignature: string | null;
  defaultClosing: string | null;
  languageStyle: string | null;
  responseVerbosity: number;
  reasoningDepth: number;
  actionHorizonDays: number;
};
type AiTaskCandidate = { title: string; dueAt: string | null };
const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function toDateYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isYmd(value: string | null | undefined): value is string {
  return !!value && YMD_REGEX.test(value);
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
    private readonly mail: MailService,
    private readonly activities: ActivitiesService,
  ) {}

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

  private async teamAiSettings(teamId: string): Promise<TeamAiSettingsShape> {
    const settings = await this.prisma.teamAiSettings.findUnique({ where: { teamId } });
    return (
      settings ?? {
        businessFocus: null,
        crmPurpose: null,
        targetAudience: null,
        toneGuidelines: null,
        emailSignature: null,
        defaultClosing: null,
        languageStyle: null,
        responseVerbosity: 2,
        reasoningDepth: 2,
        actionHorizonDays: 7,
      }
    );
  }

  private settingsContext(settings: TeamAiSettingsShape): string | undefined {
    const chunks = [
      settings.businessFocus ? `Business focus: ${settings.businessFocus}` : "",
      settings.crmPurpose ? `CRM purpose: ${settings.crmPurpose}` : "",
      settings.targetAudience ? `Target audience: ${settings.targetAudience}` : "",
      settings.toneGuidelines ? `Tone guidance: ${settings.toneGuidelines}` : "",
      settings.languageStyle ? `Language style: ${settings.languageStyle}` : "",
      settings.defaultClosing ? `Default closing: ${settings.defaultClosing}` : "",
      settings.emailSignature ? `Email signature: ${settings.emailSignature}` : "",
      settings.actionHorizonDays ? `Action horizon days: ${settings.actionHorizonDays}` : "",
    ].filter(Boolean);
    return chunks.length ? chunks.join("\n") : undefined;
  }

  /**
   * Load extracted text from attachments for a given parent entity.
   * Returns up to 6 documents with extracted text, each capped at 2,000 chars in the prompt.
   */
  private async loadAttachmentExtracts(
    teamId: string,
    parentType: ParentEntityType,
    parentId: string,
  ): Promise<DocumentExtract[]> {
    const rows = await this.prisma.attachment.findMany({
      where: { teamId, parentType, parentId, extractionStatus: "done" },
      select: { filename: true, extractedText: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    return rows
      .filter((r) => r.extractedText)
      .map((r) => ({
        filename: r.filename ?? "document",
        text: r.extractedText!,
      }));
  }

  /**
   * Merges attachment extracts from multiple parent contexts (e.g. lead + contact).
   * Dedupes by filename+length and caps total at 6 documents.
   */
  private mergeExtracts(...sets: DocumentExtract[][]): DocumentExtract[] {
    const seen = new Set<string>();
    const merged: DocumentExtract[] = [];
    for (const set of sets) {
      for (const doc of set) {
        const key = `${doc.filename}:${doc.text.length}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(doc);
          if (merged.length >= 6) return merged;
        }
      }
    }
    return merged;
  }

  async leadSummary(teamId: string, leadId: string) {
    const { lead, notes } = await this.leadContext(teamId, leadId);
    const settings = await this.teamAiSettings(teamId);
    const cached = await this.prisma.leadSummaryCache.findUnique({
      where: { leadId },
      select: { sourceVersion: true, summary: true },
    });
    if (cached && cached.sourceVersion === lead.aiSummaryVersion) {
      return { summary: cached.summary, summaryMarkdown: cached.summary, cached: true };
    }

    const [leadExtracts, contactExtracts] = await Promise.all([
      this.loadAttachmentExtracts(teamId, ParentEntityType.LEAD, leadId),
      lead.contactId
        ? this.loadAttachmentExtracts(teamId, ParentEntityType.CONTACT, lead.contactId)
        : Promise.resolve([]),
    ]);
    const documentExtracts = this.mergeExtracts(leadExtracts, contactExtracts);

    const tagList = tagsFromJson(lead.tags);
    const userPromptBase = buildLeadSummaryPrompt({
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
      documentExtracts: documentExtracts.length ? documentExtracts : undefined,
    });
    const settingsContext = this.settingsContext(settings);
    const userPrompt = settingsContext
      ? `${userPromptBase}\n\nBusiness guidance:\n${settingsContext}`
      : userPromptBase;
    const text = await this.complete(
      "You are a concise B2B sales assistant. Output markdown only.",
      userPrompt,
    );
    await this.prisma.leadSummaryCache.upsert({
      where: { leadId },
      create: {
        teamId,
        leadId,
        sourceVersion: lead.aiSummaryVersion,
        summary: text,
      },
      update: {
        sourceVersion: lead.aiSummaryVersion,
        summary: text,
      },
    });
    return { summary: text, summaryMarkdown: text, cached: false };
  }

  private parseActionItems(markdown: string): string[] {
    const lines = markdown
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const items: string[] = [];
    for (const line of lines) {
      const cleaned = line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "").trim();
      if (!cleaned || /^#{1,6}\s+/.test(line)) continue;
      items.push(cleaned);
    }
    return Array.from(new Set(items)).slice(0, 8);
  }

  private parseJson<T>(raw: string): T | null {
    const trimmed = raw.trim();
    const unfenced = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    try {
      return JSON.parse(unfenced) as T;
    } catch {
      return null;
    }
  }

  private normalizeTaskCandidatesFromStructured(parsed: unknown): AiTaskCandidate[] {
    if (!parsed || typeof parsed !== "object") return [];
    const p = parsed as {
      taskCandidates?: unknown;
      actions?: unknown;
    };
    const source = Array.isArray(p.taskCandidates)
      ? p.taskCandidates
      : Array.isArray(p.actions)
        ? p.actions
        : [];
    const normalized: AiTaskCandidate[] = [];
    for (const item of source) {
      if (typeof item === "string") {
        const title = item.replace(/^\d+\.\s*/, "").trim();
        if (title) normalized.push({ title, dueAt: null });
        continue;
      }
      if (!item || typeof item !== "object") continue;
      const candidate = item as { title?: unknown; dueAt?: unknown };
      const title =
        typeof candidate.title === "string"
          ? candidate.title.replace(/^\d+\.\s*/, "").trim()
          : "";
      if (!title) continue;
      const dueAtRaw = typeof candidate.dueAt === "string" ? candidate.dueAt.trim() : null;
      const dueAt = isYmd(dueAtRaw) ? dueAtRaw : null;
      normalized.push({ title, dueAt });
    }
    const deduped = new Map<string, AiTaskCandidate>();
    for (const item of normalized) {
      const key = item.title.toLowerCase();
      if (!deduped.has(key)) deduped.set(key, item);
    }
    return Array.from(deduped.values()).slice(0, 8);
  }

  private fillMissingDueDates(
    candidates: AiTaskCandidate[],
    opts: { expectedCloseDate?: Date | null; actionHorizonDays: number },
  ): AiTaskCandidate[] {
    const base = new Date();
    const fallbackDays = Math.max(1, Math.min(30, opts.actionHorizonDays || 7));
    const defaultDue = new Date(base);
    defaultDue.setDate(defaultDue.getDate() + fallbackDays);
    const expected = opts.expectedCloseDate ? new Date(opts.expectedCloseDate) : null;

    return candidates.map((c, idx) => {
      if (isYmd(c.dueAt)) return c;
      // Spread generated tasks a bit to avoid all same-day deadlines.
      const spread = new Date(defaultDue);
      spread.setDate(spread.getDate() + idx);
      const chosen =
        expected && !Number.isNaN(expected.getTime()) && expected.getTime() < spread.getTime()
          ? expected
          : spread;
      return { ...c, dueAt: toDateYmd(chosen) };
    });
  }

  async nextActions(teamId: string, leadId?: string, contactId?: string) {
    if (!leadId && !contactId) {
      throw new HttpException("leadId or contactId required", HttpStatus.BAD_REQUEST);
    }
    if (leadId) {
      const { lead, notes } = await this.leadContext(teamId, leadId);
      const settings = await this.teamAiSettings(teamId);
      const tasks = await this.prisma.task.findMany({
        where: {
          teamId,
          deletedAt: null,
          parentType: "LEAD",
          parentId: leadId,
        },
        take: 30,
        orderBy: { updatedAt: "desc" },
        select: { title: true, done: true },
      });
      const [leadExtracts, contactExtracts] = await Promise.all([
        this.loadAttachmentExtracts(teamId, ParentEntityType.LEAD, leadId),
        lead.contactId
          ? this.loadAttachmentExtracts(teamId, ParentEntityType.CONTACT, lead.contactId)
          : Promise.resolve([]),
      ]);
      const documentExtracts = this.mergeExtracts(leadExtracts, contactExtracts);
      const userPromptBase = buildNextActionsPrompt({
        entityLabel: "Lead",
        leadTitle: lead.title,
        stageName: lead.stage.name,
        description: lead.description ?? undefined,
        probability: lead.probability ?? undefined,
        expectedCloseDate: lead.expectedCloseDate?.toISOString(),
        openTasks: tasks.filter((t) => !t.done).map((t) => t.title),
        completedTasks: tasks.filter((t) => t.done).map((t) => t.title),
        recentNotes: notes,
        documentExtracts: documentExtracts.length ? documentExtracts : undefined,
      });
      const settingsContext = this.settingsContext(settings);
      const userPrompt = settingsContext
        ? `${userPromptBase}\n\nBusiness guidance:\n${settingsContext}`
        : userPromptBase;
      const text = await this.complete("You are a sales coach. Return valid JSON only.", userPrompt);
      const parsed = this.parseJson<{
        reasoningSummary?: string;
        reasoning?: string;
        idealPlan?: string[];
        taskCandidates?: string[];
        actions?: string[];
        riskFlags?: string[];
        assumptions?: string[];
      }>(text);
      const normalizedCandidates = this.normalizeTaskCandidatesFromStructured(parsed);
      const taskCandidatesRaw = normalizedCandidates.length
        ? normalizedCandidates
        : this.parseActionItems(text).map((title) => ({ title, dueAt: null }));
      const taskCandidates = this.fillMissingDueDates(taskCandidatesRaw, {
        expectedCloseDate: lead.expectedCloseDate,
        actionHorizonDays: settings.actionHorizonDays,
      });
      return {
        actions: taskCandidates.map((x) => x.title).join("\n"),
        actionsMarkdown: taskCandidates
          .map((x, i) => `${i + 1}. ${x.title}${x.dueAt ? ` (due ${x.dueAt})` : ""}`)
          .join("\n"),
        reasoningSummary: parsed?.reasoningSummary?.trim() ?? parsed?.reasoning?.trim() ?? "",
        idealPlan: parsed?.idealPlan ?? [],
        taskCandidates,
        actionItemsDetailed: taskCandidates,
        riskFlags: parsed?.riskFlags ?? [],
        assumptions: parsed?.assumptions ?? [],
        actionItems: taskCandidates.map((x) => x.title),
      };
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
      },
      take: 30,
      orderBy: { updatedAt: "desc" },
      select: { title: true, done: true },
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
    const settings = await this.teamAiSettings(teamId);
    const contactExtracts = await this.loadAttachmentExtracts(
      teamId,
      ParentEntityType.CONTACT,
      contactId!,
    );
    const userPromptBase = buildNextActionsPrompt({
      entityLabel: "Contact",
      contactName: name,
      openTasks: tasks.filter((t) => !t.done).map((t) => t.title),
      completedTasks: tasks.filter((t) => t.done).map((t) => t.title),
      recentNotes: notes.map((n) => n.body),
      documentExtracts: contactExtracts.length ? contactExtracts : undefined,
    });
    const settingsContext = this.settingsContext(settings);
    const userPrompt = settingsContext
      ? `${userPromptBase}\n\nBusiness guidance:\n${settingsContext}`
      : userPromptBase;
    const text = await this.complete("You are a sales coach. Return valid JSON only.", userPrompt);
    const parsed = this.parseJson<{
      reasoningSummary?: string;
      reasoning?: string;
      idealPlan?: string[];
      taskCandidates?: string[];
      actions?: string[];
      riskFlags?: string[];
      assumptions?: string[];
    }>(text);
    const normalizedCandidates = this.normalizeTaskCandidatesFromStructured(parsed);
    const taskCandidatesRaw = normalizedCandidates.length
      ? normalizedCandidates
      : this.parseActionItems(text).map((title) => ({ title, dueAt: null }));
    const taskCandidates = this.fillMissingDueDates(taskCandidatesRaw, {
      expectedCloseDate: null,
      actionHorizonDays: settings.actionHorizonDays,
    });
    return {
      actions: taskCandidates.map((x) => x.title).join("\n"),
      actionsMarkdown: taskCandidates
        .map((x, i) => `${i + 1}. ${x.title}${x.dueAt ? ` (due ${x.dueAt})` : ""}`)
        .join("\n"),
      reasoningSummary: parsed?.reasoningSummary?.trim() ?? parsed?.reasoning?.trim() ?? "",
      idealPlan: parsed?.idealPlan ?? [],
      taskCandidates,
      actionItemsDetailed: taskCandidates,
      riskFlags: parsed?.riskFlags ?? [],
      assumptions: parsed?.assumptions ?? [],
      actionItems: taskCandidates.map((x) => x.title),
    };
  }

  async outreachDraft(
    teamId: string,
    leadId: string,
    channel: "email" | "linkedin" = "email",
  ) {
    const { lead, notes } = await this.leadContext(teamId, leadId);
    const settings = await this.teamAiSettings(teamId);
    const [leadExtracts, contactExtracts] = await Promise.all([
      this.loadAttachmentExtracts(teamId, ParentEntityType.LEAD, leadId),
      lead.contactId
        ? this.loadAttachmentExtracts(teamId, ParentEntityType.CONTACT, lead.contactId)
        : Promise.resolve([]),
    ]);
    const documentExtracts = this.mergeExtracts(leadExtracts, contactExtracts);
    const userPromptBase = buildOutreachDraftPrompt({
      channel,
      leadTitle: lead.title,
      contactName: lead.contact
        ? `${lead.contact.firstName} ${lead.contact.lastName}`
        : undefined,
      companyName: lead.company?.name,
      stageName: lead.stage.name,
      description: lead.description ?? undefined,
      tone: settings.toneGuidelines ?? undefined,
      businessContext: this.settingsContext(settings),
      documentExtracts: documentExtracts.length ? documentExtracts : undefined,
    });
    const settingsContext = this.settingsContext(settings);
    const userPrompt = settingsContext
      ? `${userPromptBase}\n\nBusiness guidance:\n${settingsContext}`
      : userPromptBase;
    if (notes.length) {
      void notes;
    }
    const text = await this.complete(
      "You write short, human outreach. Return valid JSON only. No placeholder names like [Name].",
      userPrompt,
    );
    const structured = this.parseJson<{
      subject?: string;
      body?: string;
      email?: string | { subject?: string; body?: string };
      linkedin?: string | { body?: string };
      reasoning?: string;
    }>(text);
    const normalized = normalizeDraftPayload(structured, channel);
    const parsed = parseDraftToSubjectBody(
      normalized.body || text,
      channel,
      normalized.subject || undefined,
    );
    const brandedBody =
      channel === "email"
        ? applyWorkspaceEmailSignature(parsed.body, {
            defaultClosing: settings.defaultClosing,
            emailSignature: settings.emailSignature,
          })
        : parsed.body;
    return {
      draft: brandedBody,
      draftMarkdown: brandedBody,
      subject: parsed.subject,
      body: brandedBody,
      reasoning: normalized.reasoning,
    };
  }

  async createLeadTasksFromActions(
    teamId: string,
    userId: string,
    leadId: string,
    actionItems: string[],
    actionItemsDetailed?: Array<{ title: string; dueAt?: string | null }>,
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, teamId, deletedAt: null },
      select: { id: true, expectedCloseDate: true },
    });
    if (!lead) throw new NotFoundException("Lead not found");
    const settings = await this.teamAiSettings(teamId);

    const normalizedDetailed = (actionItemsDetailed ?? [])
      .map((item) => {
        const dueAtRaw = typeof item?.dueAt === "string" ? item.dueAt.trim() : null;
        return {
          title: item?.title?.trim() ?? "",
          dueAt: isYmd(dueAtRaw) ? dueAtRaw : null,
        };
      })
      .filter((item) => item.title);
    const fallbackFromTitles = actionItems
      .map((item) => item.trim())
      .filter(Boolean)
      .map((title) => ({ title, dueAt: null }));
    const normalized = this.fillMissingDueDates(
      (normalizedDetailed.length ? normalizedDetailed : fallbackFromTitles).slice(0, 20),
      { expectedCloseDate: lead.expectedCloseDate, actionHorizonDays: settings.actionHorizonDays },
    );
    if (!normalized.length) throw new BadRequestException("No action items provided");

    const existing = await this.prisma.task.findMany({
      where: {
        teamId,
        deletedAt: null,
        parentType: ParentEntityType.LEAD,
        parentId: leadId,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { title: true, done: true },
    });
    const existingOpenTitles = new Set(
      existing.filter((t) => !t.done).map((t) => t.title.trim().toLowerCase()),
    );
    const existingCompletedTitles = new Set(
      existing.filter((t) => t.done).map((t) => t.title.trim().toLowerCase()),
    );

    const created = [];
    const skippedOpen = [];
    const skippedCompleted = [];
    for (const candidate of normalized) {
      const key = candidate.title.toLowerCase();
      if (existingOpenTitles.has(key)) {
        skippedOpen.push(candidate.title);
        continue;
      }
      if (existingCompletedTitles.has(key)) {
        skippedCompleted.push(candidate.title);
        continue;
      }
      const row = await this.tasks.create(teamId, userId, {
        parentType: ParentEntityType.LEAD,
        parentId: leadId,
        title: candidate.title,
        dueAt: `${(candidate.dueAt ?? toDateYmd(new Date()))}T12:00:00.000Z`,
      });
      existingOpenTitles.add(key);
      created.push(row);
    }

    const skipped = [...skippedOpen, ...skippedCompleted];
    return {
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped,
      skippedOpen,
      skippedCompleted,
    };
  }

  async sendLeadDraftEmail(
    teamId: string,
    userId: string,
    leadId: string,
    subject: string | undefined,
    body: string,
  ) {
    const { lead } = await this.leadContext(teamId, leadId);
    const to = lead.contact?.email?.trim();
    if (!to) {
      throw new BadRequestException("Lead contact does not have an email address");
    }

    const subjectLine = (subject ?? "").trim() || "Quick follow-up";
    const bodyText = body.trim() || "Hi, following up on this opportunity.";
    const result = await this.mail.sendOutboundEmail({
      to,
      subject: subjectLine,
      text: bodyText,
    });
    if (!result.sent) {
      throw new HttpException(
        "Email provider is not configured or failed to send",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    await this.prisma.leadEmail.create({
      data: {
        teamId,
        leadId,
        contactId: lead.contactId,
        actorUserId: userId,
        emailTo: to,
        subject: subjectLine,
        bodyText,
        provider: "resend",
        providerMessageId: result.id ?? null,
        sentAt: new Date(),
      },
    });
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { aiSummaryVersion: { increment: 1 } },
    });
    await this.activities.append(teamId, userId, "LEAD", leadId, "email.sent", {
      to,
      subject: subjectLine,
      providerId: result.id ?? null,
    });
    return { sent: true, to, subject: subjectLine, id: result.id ?? null };
  }

  async logLinkedinDraftIntent(
    teamId: string,
    userId: string,
    leadId: string,
    message: string,
  ) {
    const { lead } = await this.leadContext(teamId, leadId);
    await this.activities.append(teamId, userId, "LEAD", leadId, "linkedin.draft.opened", {
      contactId: lead.contactId ?? null,
      messagePreview: message.slice(0, 240),
    });
    return { ok: true };
  }

  async predictWinProbability(teamId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, teamId, deletedAt: null },
      include: { stage: true, company: true, contact: true },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    const [notes, tasks, activities, settings] = await Promise.all([
      this.prisma.note.findMany({
        where: { teamId, deletedAt: null, parentType: "LEAD", parentId: leadId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { body: true },
      }),
      this.prisma.task.findMany({
        where: { teamId, deletedAt: null, parentType: "LEAD", parentId: leadId },
        select: { done: true },
      }),
      this.prisma.activity.findMany({
        where: { teamId, entityType: "LEAD", entityId: leadId },
        select: { id: true },
        take: 100,
      }),
      this.teamAiSettings(teamId),
    ]);

    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(lead.createdAt).getTime()) / 86_400_000,
    );
    const daysUntilClose = lead.expectedCloseDate
      ? Math.floor((new Date(lead.expectedCloseDate).getTime() - Date.now()) / 86_400_000)
      : undefined;

    const tagList = tagsFromJson(lead.tags);
    const prompt = buildWinProbabilityPrompt({
      leadTitle: lead.title,
      stageName: lead.stage.name,
      priority: lead.priority,
      status: lead.status,
      value: lead.value != null ? String(lead.value) : undefined,
      currency: lead.currency ?? undefined,
      description: lead.description ?? undefined,
      expectedCloseDate: lead.expectedCloseDate?.toISOString().slice(0, 10),
      source: lead.source ?? undefined,
      tags: tagList,
      companyName: lead.company?.name,
      contactName: lead.contact
        ? `${lead.contact.firstName} ${lead.contact.lastName}`
        : undefined,
      noteCount: notes.length,
      recentNotes: notes.map((n) => n.body),
      openTaskCount: tasks.filter((t) => !t.done).length,
      completedTaskCount: tasks.filter((t) => t.done).length,
      activityCount: activities.length,
      daysSinceCreated,
      daysUntilClose,
      businessContext: this.settingsContext(settings),
    });

    const text = await this.complete(
      "You are an expert B2B sales analyst. Return valid JSON only. No markdown or code fences.",
      prompt,
    );

    const parsed = this.parseJson<{
      score?: number;
      reasoning?: string;
      signals?: { positive?: string[]; negative?: string[] };
    }>(text);

    const score = typeof parsed?.score === "number"
      ? Math.min(100, Math.max(0, Math.round(parsed.score)))
      : null;

    if (score !== null) {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { probability: score },
      });
    }

    return {
      score,
      reasoning: parsed?.reasoning?.trim() ?? "",
      signals: {
        positive: parsed?.signals?.positive ?? [],
        negative: parsed?.signals?.negative ?? [],
      },
    };
  }

  /** Generate a daily sales intelligence briefing for the dashboard. */
  async generateDashboardBriefing(data: {
    totalLeads: number;
    openValue: number;
    currency: string;
    closingSoon: number;
    overdueTasks: number;
    dueTodayTasks: number;
    topLeads: Array<{ title: string; value: string | null; stageName: string }>;
    leadsByStage: Array<{ stageName: string; count: number }>;
    recentActions: string[];
  }): Promise<string> {
    const topLeadLines = data.topLeads
      .map((l) => `- "${l.title}" (${l.stageName}${l.value ? `, ${data.currency} ${l.value}` : ""})`)
      .join("\n");
    const stageLines = data.leadsByStage
      .map((s) => `- ${s.stageName}: ${s.count} lead${s.count !== 1 ? "s" : ""}`)
      .join("\n");
    const activitySummary = data.recentActions.slice(0, 5).join("; ");

    const userPrompt = `Pipeline snapshot as of today:
- Total open leads: ${data.totalLeads}
- Combined pipeline value: ${data.currency} ${data.openValue.toLocaleString()}
- Leads closing in next 7 days: ${data.closingSoon}
- Overdue tasks: ${data.overdueTasks}
- Tasks due today: ${data.dueTodayTasks}

Top leads by value:
${topLeadLines || "None"}

Pipeline by stage:
${stageLines || "No stages configured"}

Recent activity: ${activitySummary || "No recent activity"}`;

    return this.complete(
      "You are a concise B2B sales coach. Based on the pipeline data, write a 3-5 sentence daily briefing for the sales team. Highlight the top priority actions, flag any risks (overdue tasks, stalled deals), and end with one motivational insight. Be direct, actionable, and professional. Do not use bullet points — write in flowing prose.",
      userPrompt,
    );
  }
}

function extractEmailParts(draft: string, providedSubject?: string): { subjectLine: string; body: string } {
  const trimmed = draft.trim();
  const lines = trimmed.split("\n");
  const first = lines[0]?.trim() ?? "";
  if (/^subject\s*:/i.test(first)) {
    const subjectLine = first.replace(/^subject\s*:/i, "").trim() || "Quick follow-up";
    const body = lines.slice(1).join("\n").trim();
    return { subjectLine, body: body || "Hi, following up on this opportunity." };
  }
  return {
    subjectLine: (providedSubject ?? "").trim() || "Quick follow-up",
    body: trimmed || "Hi, following up on this opportunity.",
  };
}

function parseDraftToSubjectBody(
  draft: string,
  channel: "email" | "linkedin",
  preferredSubject?: string,
): { subject: string; body: string } {
  if (channel === "linkedin") {
    return { subject: "", body: draft.trim() };
  }
  const parsed = extractEmailParts(draft, preferredSubject);
  return {
    subject: parsed.subjectLine,
    body: parsed.body.replace(/^subject\s*:[^\n]*\n?/i, "").trim(),
  };
}

function normalizeDraftPayload(
  payload: {
    subject?: string;
    body?: string;
    email?: string | { subject?: string; body?: string };
    linkedin?: string | { body?: string };
    reasoning?: string;
  } | null,
  channel: "email" | "linkedin",
): { subject: string; body: string; reasoning: string } {
  if (!payload) return { subject: "", body: "", reasoning: "" };
  if (channel === "linkedin") {
    const body =
      typeof payload.body === "string"
        ? payload.body
        : typeof payload.linkedin === "string"
          ? payload.linkedin
          : payload.linkedin && typeof payload.linkedin === "object" && typeof payload.linkedin.body === "string"
            ? payload.linkedin.body
            : "";
    return { subject: "", body: body.trim(), reasoning: payload.reasoning?.trim() ?? "" };
  }
  const emailObj = payload.email && typeof payload.email === "object" ? payload.email : null;
  const body =
    typeof payload.body === "string"
      ? payload.body
      : typeof payload.email === "string"
        ? payload.email
        : emailObj?.body ?? "";
  const subject = payload.subject?.trim() || emailObj?.subject?.trim() || "";
  return { subject, body: body.trim(), reasoning: payload.reasoning?.trim() ?? "" };
}

function applyWorkspaceEmailSignature(
  body: string,
  settings: { defaultClosing: string | null; emailSignature: string | null },
): string {
  const trimmed = body.trim();
  const closing = settings.defaultClosing?.trim() ?? "";
  const signature = settings.emailSignature?.trim() ?? "";
  if (!closing && !signature) return trimmed;

  const lowerBody = trimmed.toLowerCase();
  const hasClosing = closing ? lowerBody.includes(closing.toLowerCase()) : false;
  const hasSignature = signature ? lowerBody.includes(signature.toLowerCase()) : false;
  if ((closing && hasClosing) || (signature && hasSignature)) return trimmed;

  const suffixParts = [closing, signature].filter(Boolean);
  if (!suffixParts.length) return trimmed;
  return `${trimmed}\n\n${suffixParts.join("\n")}`.trim();
}
