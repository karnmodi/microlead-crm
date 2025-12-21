import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ActivitiesService } from "../activities/activities.service";
import { paginate } from "../common/dto/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";

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
      ...(companyId ? { companyId } : {}),
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
        include: { company: true },
      }),
      this.prisma.contact.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
  }

  async get(teamId: string, id: string) {
    const row = await this.prisma.contact.findFirst({
      where: { id, teamId, deletedAt: null },
      include: { company: true },
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
    }>,
  ) {
    await this.get(teamId, id);
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
}
