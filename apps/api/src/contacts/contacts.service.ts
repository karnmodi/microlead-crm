import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ActivitiesService } from "../activities/activities.service";
import { paginate } from "../common/dto/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";

const CONTACT_COMPANY_LINKS_INCLUDE = {
  company: { select: { id: true, name: true, companyNumber: true } },
} as const;

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  async list(teamId: string, page: number, limit: number, q?: string, companyId?: string) {
    const { take, skip } = paginate(page, limit);
    const where: Prisma.ContactWhereInput = {
      teamId,
      deletedAt: null,
      ...(companyId
        ? {
            OR: [
              { companyId },
              { companyLinks: { some: { companyId } } },
            ],
          }
        : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        skip,
        include: {
          company: { select: { id: true, name: true } },
          companyLinks: {
            include: CONTACT_COMPANY_LINKS_INCLUDE,
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async get(teamId: string, id: string) {
    const row = await this.prisma.contact.findFirst({
      where: { id, teamId, deletedAt: null },
      include: {
        company: { select: { id: true, name: true, companyNumber: true } },
        companyLinks: {
          include: CONTACT_COMPANY_LINKS_INCLUDE,
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
      },
    });
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(
    teamId: string,
    userId: string,
    body: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      companyId?: string;
      jobTitle?: string;
      linkedinUrl?: string;
    },
  ) {
    if (body.companyId) {
      const c = await this.prisma.company.findFirst({
        where: { id: body.companyId, teamId, deletedAt: null },
      });
      if (!c) throw new NotFoundException("Company not found");
    }

    const row = await this.prisma.contact.create({
      data: {
        teamId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        companyId: body.companyId,
        jobTitle: body.jobTitle,
        linkedinUrl: body.linkedinUrl,
        ...(body.companyId
          ? {
              companyLinks: {
                create: {
                  companyId: body.companyId,
                  role: body.jobTitle,
                  isPrimary: true,
                },
              },
            }
          : {}),
      },
    });

    await this.activities.append(teamId, userId, "CONTACT", row.id, "contact.created", {
      name: `${row.firstName} ${row.lastName}`,
    });
    return row;
  }

  async update(
    teamId: string,
    userId: string,
    id: string,
    body: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      companyId: string | null;
      jobTitle: string | null;
      linkedinUrl: string | null;
    }>,
  ) {
    const existing = await this.get(teamId, id);
    if (body.companyId) {
      const c = await this.prisma.company.findFirst({
        where: { id: body.companyId, teamId, deletedAt: null },
      });
      if (!c) throw new NotFoundException("Company not found");
    }

    const row = await this.prisma.contact.update({
      where: { id },
      data: body,
    });

    // If primary company changed, sync the primary link
    if ("companyId" in body && body.companyId !== existing.companyId) {
      // Clear old primary flag
      await this.prisma.contactCompanyLink.updateMany({
        where: { contactId: id, isPrimary: true },
        data: { isPrimary: false },
      });
      if (body.companyId) {
        // Upsert new primary link
        await this.prisma.contactCompanyLink.upsert({
          where: { contactId_companyId: { contactId: id, companyId: body.companyId } },
          create: { contactId: id, companyId: body.companyId, role: body.jobTitle ?? existing.jobTitle, isPrimary: true },
          update: { isPrimary: true },
        });
      }
    }

    await this.activities.append(teamId, userId, "CONTACT", id, "contact.updated", body);
    return row;
  }

  async remove(teamId: string, userId: string, id: string) {
    await this.get(teamId, id);
    const row = await this.prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.activities.append(teamId, userId, "CONTACT", id, "contact.deleted", {});
    return row;
  }

  /** Link an additional company to this contact. */
  async linkCompany(
    teamId: string,
    contactId: string,
    companyId: string,
    role?: string,
    makePrimary = false,
  ) {
    const contact = await this.get(teamId, contactId);

    const company = await this.prisma.company.findFirst({
      where: { id: companyId, teamId, deletedAt: null },
    });
    if (!company) throw new NotFoundException("Company not found");

    const existing = await this.prisma.contactCompanyLink.findUnique({
      where: { contactId_companyId: { contactId, companyId } },
    });
    if (existing) {
      throw new BadRequestException("This contact is already linked to that company.");
    }

    // If making primary (or no primary yet), clear existing primary first
    const hasPrimary = contact.companyLinks.some((l) => l.isPrimary);
    const shouldBePrimary = makePrimary || !hasPrimary;

    if (shouldBePrimary) {
      await this.prisma.contactCompanyLink.updateMany({
        where: { contactId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const link = await this.prisma.contactCompanyLink.create({
      data: { contactId, companyId, role, isPrimary: shouldBePrimary },
      include: CONTACT_COMPANY_LINKS_INCLUDE,
    });

    // Sync contact.companyId with primary
    if (shouldBePrimary) {
      await this.prisma.contact.update({
        where: { id: contactId },
        data: { companyId },
      });
    }

    return link;
  }

  /** Unlink a company from this contact. */
  async unlinkCompany(teamId: string, contactId: string, companyId: string) {
    await this.get(teamId, contactId);

    const link = await this.prisma.contactCompanyLink.findUnique({
      where: { contactId_companyId: { contactId, companyId } },
    });
    if (!link) throw new NotFoundException("Link not found");

    await this.prisma.contactCompanyLink.delete({
      where: { contactId_companyId: { contactId, companyId } },
    });

    // If removed link was primary, promote the next link or clear contact.companyId
    if (link.isPrimary) {
      const next = await this.prisma.contactCompanyLink.findFirst({
        where: { contactId },
        orderBy: { createdAt: "asc" },
      });

      if (next) {
        await this.prisma.contactCompanyLink.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
        await this.prisma.contact.update({
          where: { id: contactId },
          data: { companyId: next.companyId },
        });
      } else {
        await this.prisma.contact.update({
          where: { id: contactId },
          data: { companyId: null },
        });
      }
    }

    return { ok: true };
  }

  /** Set a different linked company as the primary one. */
  async setPrimaryCompany(teamId: string, contactId: string, companyId: string) {
    await this.get(teamId, contactId);

    const link = await this.prisma.contactCompanyLink.findUnique({
      where: { contactId_companyId: { contactId, companyId } },
    });
    if (!link) throw new NotFoundException("Link not found — link the company first");

    await this.prisma.contactCompanyLink.updateMany({
      where: { contactId, isPrimary: true },
      data: { isPrimary: false },
    });

    await this.prisma.contactCompanyLink.update({
      where: { id: link.id },
      data: { isPrimary: true },
    });

    await this.prisma.contact.update({
      where: { id: contactId },
      data: { companyId },
    });

    return { ok: true };
  }
}
