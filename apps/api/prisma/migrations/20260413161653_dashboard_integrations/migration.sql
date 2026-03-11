-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "company_number" TEXT,
ADD COLUMN     "enriched_at" TIMESTAMP(3),
ADD COLUMN     "enriched_data" JSONB,
ADD COLUMN     "enrichment_source" TEXT;

-- CreateTable
CREATE TABLE "integration_syncs" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "integration" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "last_run_at" TIMESTAMP(3),
    "last_error" TEXT,
    "records_updated" INTEGER NOT NULL DEFAULT 0,
    "api_key_encrypted" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_syncs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_briefing_cache" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_briefing_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integration_syncs_team_id_idx" ON "integration_syncs"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "integration_syncs_team_id_integration_key" ON "integration_syncs"("team_id", "integration");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_briefing_cache_team_id_key" ON "dashboard_briefing_cache"("team_id");

-- AddForeignKey
ALTER TABLE "integration_syncs" ADD CONSTRAINT "integration_syncs_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_briefing_cache" ADD CONSTRAINT "dashboard_briefing_cache_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
