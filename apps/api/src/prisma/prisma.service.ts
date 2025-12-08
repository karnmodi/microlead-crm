import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err) {
      if (process.env.ALLOW_START_WITHOUT_DB === "1") {
        return;
      }
      // Local dev: keep HTTP up so /health and debugging work; first Prisma query will retry connect.
      if (process.env.NODE_ENV !== "production") {
         
        console.warn(
          "[Prisma] Database unreachable on startup (API still listening). Fix DATABASE_URL / network; health will show db:false.",
          err instanceof Error ? err.message : err,
        );
        return;
      }
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
