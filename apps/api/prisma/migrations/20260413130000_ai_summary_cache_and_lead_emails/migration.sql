-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('OUTBOUND');

-- AlterTable
ALTER TABLE "leads"
ADD COLUMN "ai_summary_version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "lead_summary_cache" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "source_version" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lead_summary_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_emails" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "actor_user_id" TEXT NOT NULL,
    "direction" "EmailDirection" NOT NULL DEFAULT 'OUTBOUND',
    "email_to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_message_id" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_summary_cache_lead_id_key" ON "lead_summary_cache"("lead_id");

-- CreateIndex
CREATE INDEX "lead_summary_cache_team_id_lead_id_updated_at_idx" ON "lead_summary_cache"("team_id", "lead_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "lead_emails_team_id_lead_id_sent_at_idx" ON "lead_emails"("team_id", "lead_id", "sent_at" DESC);

-- CreateIndex
CREATE INDEX "lead_emails_team_id_contact_id_sent_at_idx" ON "lead_emails"("team_id", "contact_id", "sent_at" DESC);

-- AddForeignKey
ALTER TABLE "lead_summary_cache" ADD CONSTRAINT "lead_summary_cache_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_summary_cache" ADD CONSTRAINT "lead_summary_cache_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_emails" ADD CONSTRAINT "lead_emails_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_emails" ADD CONSTRAINT "lead_emails_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_emails" ADD CONSTRAINT "lead_emails_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lead_emails" ADD CONSTRAINT "lead_emails_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
