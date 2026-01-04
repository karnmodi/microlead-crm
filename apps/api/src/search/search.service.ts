import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async quickSearch(teamId: string, q: string, limit = 8) {
    if (!q.trim()) {
      return { leads: [], companies: [], contacts: [] };
    }
    const take = Math.min(limit, 20);
    const [leads, companies, contacts] = await Promise.all([
      this.prisma.lead.findMany({
        where: {
          teamId,
          deletedAt: null,
          title: { contains: q, mode: "insensitive" },
        },
        take,
        select: { id: true, title: true, stageId: true },
      }),
      this.prisma.company.findMany({
        where: {
          teamId,
          deletedAt: null,
          name: { contains: q, mode: "insensitive" },
        },
        take,
        select: { id: true, name: true },
      }),
      this.prisma.contact.findMany({
        where: {
          teamId,
          deletedAt: null,
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        take,
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
    ]);
    return { leads, companies, contacts };
  }
}
