-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "extracted_text" TEXT,
ADD COLUMN     "extraction_status" TEXT;

-- CreateIndex
CREATE INDEX "attachments_team_id_extraction_status_idx" ON "attachments"("team_id", "extraction_status");
