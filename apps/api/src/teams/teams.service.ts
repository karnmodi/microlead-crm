import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { TeamRole } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

const INVITE_TTL_DAYS = 14;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  listForUser(userId: string) {
    return this.prisma.teamMember.findMany({
      where: { userId },
      include: { team: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async create(userId: string, name: string) {
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({ data: { name } });
      await tx.teamMember.create({
        data: { teamId: team.id, userId, role: TeamRole.OWNER },
      });
      await tx.user.update({
        where: { id: userId },
        data: { preferredTeamId: team.id },
      });
      await tx.teamAiSettings.create({
        data: { teamId: team.id },
      });
      return team;
    });
  }

  async getAiSettings(teamId: string) {
    const settings = await this.prisma.teamAiSettings.findUnique({
      where: { teamId },
    });
    if (settings) return settings;
    return this.prisma.teamAiSettings.create({ data: { teamId } });
  }

  async upsertAiSettings(
    teamId: string,
    data: {
      businessFocus?: string | null;
      crmPurpose?: string | null;
      targetAudience?: string | null;
      toneGuidelines?: string | null;
      emailSignature?: string | null;
      defaultClosing?: string | null;
      languageStyle?: string | null;
      responseVerbosity?: number;
      reasoningDepth?: number;
      actionHorizonDays?: number;
    },
  ) {
    return this.prisma.teamAiSettings.upsert({
      where: { teamId },
      create: {
        teamId,
        ...data,
      },
      update: data,
    });
  }

  async listMembers(teamId: string) {
    return this.prisma.teamMember.findMany({
      where: { teamId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async addMember(actorUserId: string, teamId: string, email: string, role: TeamRole) {
    await this.assertOwnerOrAdmin(actorUserId, teamId);
    if (role === TeamRole.OWNER) {
      throw new UnprocessableEntityException("Cannot assign OWNER via this endpoint.");
    }

    const normalized = normalizeEmail(email);
    const target = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!target) {
      throw new UnprocessableEntityException(
        "No user with that email. Ask them to register first, or send an invite.",
      );
    }

    const existing = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: target.id, teamId } },
    });
    if (existing) {
      throw new ConflictException("User is already a member of this workspace.");
    }

    return this.prisma.teamMember.create({
      data: { teamId, userId: target.id, role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  async createInvite(
    actorUserId: string,
    teamId: string,
    email: string,
    role: TeamRole,
    webOrigin: string,
  ) {
    await this.assertOwnerOrAdmin(actorUserId, teamId);
    if (role === TeamRole.OWNER) {
      throw new UnprocessableEntityException("Cannot invite as OWNER.");
    }

    const normalized = normalizeEmail(email);
    const existingUser = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (existingUser) {
      const already = await this.prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: existingUser.id, teamId } },
      });
      if (already) {
        throw new ConflictException("User is already a member of this workspace.");
      }
    }

    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException("Workspace not found.");

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashInviteToken(token);
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.teamInvite.deleteMany({
      where: {
        teamId,
        email: normalized,
        acceptedAt: null,
      },
    });

    await this.prisma.teamInvite.create({
      data: {
        teamId,
        email: normalized,
        role,
        tokenHash,
        expiresAt,
        createdByUserId: actorUserId,
      },
    });

    const base = webOrigin.replace(/\/+$/, "");
    const acceptUrl = `${base}/accept-invite?token=${encodeURIComponent(token)}`;

    const { sent } = await this.mail.sendWorkspaceInvite({
      to: normalized,
      acceptUrl,
      teamName: team.name,
    });

    return { acceptUrl, emailSent: sent };
  }

  async acceptInvite(userId: string, userEmail: string, token: string) {
    const tokenHash = hashInviteToken(token.trim());
    const invite = await this.prisma.teamInvite.findUnique({
      where: { tokenHash },
      include: { team: true },
    });

    if (!invite || invite.acceptedAt) {
      throw new UnprocessableEntityException("Invalid or already used invite.");
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      throw new UnprocessableEntityException("This invite has expired.");
    }

    const normalizedUserEmail = normalizeEmail(userEmail);
    if (normalizeEmail(invite.email) !== normalizedUserEmail) {
      throw new ForbiddenException(
        "Sign in as the invited email address to accept this invitation.",
      );
    }

    const existing = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId: invite.teamId } },
    });
    if (existing) {
      await this.prisma.teamInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      return { team: invite.team, alreadyMember: true };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.teamMember.create({
        data: { teamId: invite.teamId, userId, role: invite.role },
      });
      await tx.teamInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
    });

    return { team: invite.team, alreadyMember: false };
  }

  private async assertOwnerOrAdmin(userId: string, teamId: string) {
    const m = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!m || (m.role !== TeamRole.OWNER && m.role !== TeamRole.ADMIN)) {
      throw new ForbiddenException("Only workspace owners and admins can perform this action.");
    }
  }
}
