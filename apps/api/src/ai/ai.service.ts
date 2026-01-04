import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import OpenAI from "openai";
import {
  buildLeadSummaryPrompt,
  buildNextActionsPrompt,
  buildOutreachDraftPrompt,
} from "@microlead-crm/ai";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  private client() {
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: "AI_NOT_CONFIGURED",
          message: "AI provider is not configured.",
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return new OpenAI({ apiKey: key });
  }

  private async complete(system: string, user: string) {
    const openai = this.client();
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const res = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const text = res.choices[0]?.message?.content?.trim();
    if (!text) throw new BadGatewayException("Empty AI response");
    return text;
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
    if (!lead) throw new NotFoundException();
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
    const userPrompt = buildLeadSummaryPrompt({
      leadTitle: lead.title,
      stageName: lead.stage.name,
      companyName: lead.company?.name,
      contactName: lead.contact
        ? `${lead.contact.firstName} ${lead.contact.lastName}`
        : undefined,
      value: lead.value != null ? String(lead.value) : undefined,
      priority: lead.priority,
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
    if (!contact) throw new NotFoundException();
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
