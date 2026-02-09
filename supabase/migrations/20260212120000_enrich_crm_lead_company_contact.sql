-- Mirrors apps/api/prisma/migrations/20260212120000_enrich_crm_lead_company_contact

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('OPEN', 'WON', 'LOST');

-- AlterTable companies
ALTER TABLE "companies" ADD COLUMN "industry" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "employee_count" INTEGER;

-- AlterTable contacts
ALTER TABLE "contacts" ADD COLUMN "job_title" TEXT,
ADD COLUMN "linkedin_url" TEXT;

-- AlterTable leads
ALTER TABLE "leads" ADD COLUMN "description" TEXT,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN "probability" INTEGER,
ADD COLUMN "source" TEXT,
ADD COLUMN "status" "LeadStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN "expected_close_date" TIMESTAMP(3),
ADD COLUMN "closed_at" TIMESTAMP(3),
ADD COLUMN "lost_reason" TEXT,
ADD COLUMN "tags" JSONB;

-- CreateIndex
CREATE INDEX "leads_team_id_status_idx" ON "leads"("team_id", "status");

-- CreateIndex
CREATE INDEX "leads_team_id_expected_close_date_idx" ON "leads"("team_id", "expected_close_date");
