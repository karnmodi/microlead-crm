-- CreateTable
CREATE TABLE "contact_company_links" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "role" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_company_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_company_links_contact_id_idx" ON "contact_company_links"("contact_id");

-- CreateIndex
CREATE INDEX "contact_company_links_company_id_idx" ON "contact_company_links"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_company_links_contact_id_company_id_key" ON "contact_company_links"("contact_id", "company_id");

-- AddForeignKey
ALTER TABLE "contact_company_links" ADD CONSTRAINT "contact_company_links_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_company_links" ADD CONSTRAINT "contact_company_links_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
