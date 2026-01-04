import { Injectable } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async health() {
    let db = false;
    try {
      await this.prisma.$connect();
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    return { status: "ok", service: "microlead-crm-api", db };
  }
}
