import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  COMPANIES_HOUSE_ENRICHMENT_GROUP_KEYS,
  COMPANIES_HOUSE_ENRICHMENT_GROUP_LABELS,
  type CompaniesHouseEnrichmentPayload,
  type CompaniesHouseRegisteredOffice,
  filterBusinessProfileByKeys,
  normalizeEnrichmentFieldKeys,
  resolveEffectiveEnrichmentKeys,
} from "./companies-house-business-profile";
import { CompaniesHouseService } from "./companies-house.service";

export const INTEGRATION_NAMES = ["companies_house"] as const;
export type IntegrationName = (typeof INTEGRATION_NAMES)[number];

export type IntegrationStatus = {
  integration: IntegrationName;
  status: string;
  lastRunAt: string | null;
  lastError: string | null;
  recordsUpdated: number;
  configured: boolean;
};

function formatChRegisteredOffice(o: CompaniesHouseRegisteredOffice | null): string | null {
  if (!o) return null;
  const s = [o.line1, o.line2, o.postTown, o.postcode, o.country].filter(Boolean).join(", ");
  return s || null;
}

function buildAddressFields(o: CompaniesHouseRegisteredOffice | null): {
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressPostcode: string | null;
  addressCountry: string | null;
} {
  return {
    addressLine1: o?.line1 ?? null,
    addressLine2: o?.line2 ?? null,
    addressCity: o?.postTown ?? null,
    addressPostcode: o?.postcode ?? null,
    addressCountry: o?.country ?? null,
  };
}

/**
 * Split a display name ("James Alexander Smith") into firstName + lastName.
 * Last word becomes lastName; everything before it is firstName.
 */
function parseDisplayName(displayName: string): { firstName: string; lastName: string } {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

/** Capitalise each word (CH names come back in ALL-CAPS). */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatOfficerJobTitle(role: string): string {
  return role
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly companiesHouse: CompaniesHouseService,
  ) {}

  async getStatus(teamId: string): Promise<IntegrationStatus[]> {
    const rows = await this.prisma.integrationSync.findMany({
      where: { teamId },
    });

    return INTEGRATION_NAMES.map((name) => {
      const row = rows.find((r) => r.integration === name);
      return {
        integration: name,
        status: row?.status ?? "idle",
        lastRunAt: row?.lastRunAt?.toISOString() ?? null,
        lastError: row?.lastError ?? null,
        recordsUpdated: row?.recordsUpdated ?? 0,
        configured: name === "companies_house" ? this.companiesHouse.isConfigured() : false,
      };
    });
  }

  private async getCompaniesHouseSyncRow(teamId: string) {
    return this.prisma.integrationSync.findUnique({
      where: { teamId_integration: { teamId, integration: "companies_house" } },
    });
  }

  async getCompaniesHouseFieldPreferences(teamId: string) {
    const row = await this.getCompaniesHouseSyncRow(teamId);
    const stored = row?.enrichmentFieldKeys ?? null;
    const allKeys = [...COMPANIES_HOUSE_ENRICHMENT_GROUP_KEYS];
    const normalized = normalizeEnrichmentFieldKeys(
      Array.isArray(stored) ? (stored as string[]) : null,
    );
    const fields = normalized === null ? allKeys : normalized;
    const labels: Record<string, string> = {};
    for (const k of COMPANIES_HOUSE_ENRICHMENT_GROUP_KEYS) {
      labels[k] = COMPANIES_HOUSE_ENRICHMENT_GROUP_LABELS[k];
    }
    return { fields, allKeys, labels };
  }

  async setCompaniesHouseFieldPreferences(teamId: string, fields: string[]) {
    const n = normalizeEnrichmentFieldKeys(fields);
    const allKeys = [...COMPANIES_HOUSE_ENRICHMENT_GROUP_KEYS];
    const toStore: string[] | null =
      n === null || n.length === allKeys.length ? null : n;

    await this.prisma.integrationSync.upsert({
      where: { teamId_integration: { teamId, integration: "companies_house" } },
      create: {
        teamId,
        integration: "companies_house",
        ...(toStore !== null ? { enrichmentFieldKeys: toStore } : {}),
      },
      update: {
        enrichmentFieldKeys:
          toStore === null ? Prisma.DbNull : (toStore as Prisma.InputJsonValue),
      },
    });

    return this.getCompaniesHouseFieldPreferences(teamId);
  }

  async enrichCompany(teamId: string, companyId: string, requestFields?: string[]) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, teamId, deletedAt: null },
    });
    if (!company) throw new NotFoundException("Company not found");
    if (!company.companyNumber?.trim()) {
      throw new BadRequestException("Company has no UK company number — add a CRN first.");
    }
    if (!this.companiesHouse.isConfigured()) {
      throw new BadRequestException("Companies House is not configured (set COMPANIES_HOUSE_API_KEY).");
    }

    const row = await this.getCompaniesHouseSyncRow(teamId);
    const stored = row?.enrichmentFieldKeys ?? null;
    const effective = resolveEffectiveEnrichmentKeys(stored, requestFields);
    if (effective.length === 0) {
      throw new BadRequestException("No enrichment fields selected or allowed by team settings.");
    }

    const [full, officers] = await Promise.all([
      this.companiesHouse.fetchCompany(company.companyNumber),
      effective.includes("officers")
        ? this.companiesHouse.fetchOfficers(company.companyNumber)
        : Promise.resolve(null),
    ]);

    if (!full) {
      throw new BadRequestException("Companies House returned no data for this company number.");
    }

    const payload: CompaniesHouseEnrichmentPayload = filterBusinessProfileByKeys(full, effective);
    if (effective.includes("officers") && officers != null) {
      payload.officers = officers;
    }

    const addressFields = buildAddressFields(full.registeredOffice);

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        enrichedData: payload as object,
        enrichedAt: new Date(),
        enrichmentSource: "companies_house",
        ...addressFields,
      },
    });

    const contactsCreated =
      officers != null && officers.length > 0
        ? await this.upsertOfficerContacts(teamId, companyId, officers)
        : 0;

    return { ok: true, enrichedData: payload, contactsCreated };
  }

  /**
   * Read-only lookup for form autofill (create/edit company). Does not persist enrichedData.
   */
  async lookupCompaniesHouseForForm(_teamId: string, companyNumber: string) {
    const trimmed = companyNumber?.trim();
    if (!trimmed) {
      throw new BadRequestException("Enter a UK company number (CRN) first.");
    }
    if (!this.companiesHouse.isConfigured()) {
      throw new BadRequestException("Companies House is not configured (set COMPANIES_HOUSE_API_KEY).");
    }

    const full = await this.companiesHouse.fetchCompany(trimmed);
    if (!full) {
      throw new BadRequestException("Companies House returned no data for this company number.");
    }

    const addr = formatChRegisteredOffice(full.registeredOffice);
    const sicParts = full.industryClassification.sicDescriptions
      .map((s) => s.description ?? s.code)
      .filter(Boolean);
    const industryHint =
      sicParts.join("; ") || full.industryClassification.sicCodes.join(", ") || "";

    const descLines: string[] = [];
    if (full.tradingStatus && full.tradingStatus !== "unknown") {
      descLines.push(`Companies House status: ${full.tradingStatus}.`);
    }
    if (full.incorporatedOn) descLines.push(`Incorporated: ${full.incorporatedOn}.`);
    if (full.legalForm) descLines.push(`Legal form: ${full.legalForm}.`);
    if (addr) descLines.push(`Registered office: ${addr}.`);
    if (industryHint) descLines.push(`Industry (SIC): ${industryHint}.`);

    return {
      suggested: {
        name: full.legalName,
        companyNumber: full.companyRegistrationNumber || trimmed,
        description: descLines.join(" "),
        industryHint,
      },
    };
  }

  /**
   * For each active officer, ensure a Contact record exists linked to this company.
   * Skips if a contact with the same normalised first+last name already exists for the team.
   * Returns how many contacts were newly created.
   */
  private async upsertOfficerContacts(
    teamId: string,
    companyId: string,
    officers: import("./companies-house-business-profile").CompaniesHouseOfficer[],
  ): Promise<number> {
    if (officers.length === 0) return 0;

    const existing = await this.prisma.contact.findMany({
      where: { teamId, companyId, deletedAt: null },
      select: { firstName: true, lastName: true },
    });

    const existingNorms = new Set(
      existing.map((c) =>
        `${c.firstName.toLowerCase().trim()} ${c.lastName.toLowerCase().trim()}`.trim(),
      ),
    );

    let created = 0;
    for (const officer of officers) {
      const { firstName: rawFirst, lastName: rawLast } = parseDisplayName(officer.displayName);
      const firstName = titleCase(rawFirst);
      const lastName = titleCase(rawLast);
      const norm = `${firstName.toLowerCase()} ${lastName.toLowerCase()}`.trim();

      if (!firstName && !lastName) continue;
      if (existingNorms.has(norm)) continue;

      const jobTitle = formatOfficerJobTitle(officer.role);

      await this.prisma.contact.create({
        data: {
          teamId,
          companyId,
          firstName: firstName || lastName,
          lastName: firstName ? lastName : "",
          jobTitle,
          companyLinks: {
            create: {
              companyId,
              role: jobTitle,
              isPrimary: true,
            },
          },
        },
      });

      existingNorms.add(norm);
      created++;
    }

    this.logger.log(`upsertOfficerContacts: created ${created} contact(s) for company ${companyId}`);
    return created;
  }

  async runCompaniesHouseSync(teamId: string): Promise<{ recordsUpdated: number; errors: number }> {
    await this.prisma.integrationSync.upsert({
      where: { teamId_integration: { teamId, integration: "companies_house" } },
      create: { teamId, integration: "companies_house", status: "running" },
      update: { status: "running", lastError: null },
    });

    let updated = 0;
    let errors = 0;

    const row = await this.getCompaniesHouseSyncRow(teamId);
    const stored = row?.enrichmentFieldKeys ?? null;
    const effective = resolveEffectiveEnrichmentKeys(stored, undefined);

    try {
      const companies = await this.prisma.company.findMany({
        where: {
          teamId,
          deletedAt: null,
          companyNumber: { not: null },
        },
        select: { id: true, companyNumber: true },
      });

      const fetchOfficers = effective.includes("officers");

      for (const company of companies) {
        if (!company.companyNumber) continue;
        try {
          const [data, officers] = await Promise.all([
            this.companiesHouse.fetchCompany(company.companyNumber),
            fetchOfficers
              ? this.companiesHouse.fetchOfficers(company.companyNumber)
              : Promise.resolve(null),
          ]);
          if (!data) continue;

          const payload: CompaniesHouseEnrichmentPayload = filterBusinessProfileByKeys(data, effective);
          if (fetchOfficers && officers != null) {
            payload.officers = officers;
          }

          const addressFields = buildAddressFields(data.registeredOffice);

          await this.prisma.company.update({
            where: { id: company.id },
            data: {
              enrichedData: payload as object,
              enrichedAt: new Date(),
              enrichmentSource: "companies_house",
              ...addressFields,
            },
          });

          if (fetchOfficers && officers != null && officers.length > 0) {
            await this.upsertOfficerContacts(teamId, company.id, officers);
          }

          updated++;
        } catch (err) {
          this.logger.warn(`Failed to enrich company ${company.id}:`, err);
          errors++;
        }
      }

      await this.prisma.integrationSync.update({
        where: { teamId_integration: { teamId, integration: "companies_house" } },
        data: {
          status: "success",
          lastRunAt: new Date(),
          recordsUpdated: updated,
          lastError: errors > 0 ? `${errors} company enrichment(s) failed` : null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.integrationSync.update({
        where: { teamId_integration: { teamId, integration: "companies_house" } },
        data: { status: "error", lastRunAt: new Date(), lastError: message },
      });
      throw err;
    }

    return { recordsUpdated: updated, errors };
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailySync() {
    if (!this.companiesHouse.isConfigured()) return;

    this.logger.log("Running daily Companies House sync for all teams...");

    const teams = await this.prisma.team.findMany({
      where: {
        companies: {
          some: { deletedAt: null, companyNumber: { not: null } },
        },
      },
      select: { id: true },
    });

    for (const team of teams) {
      try {
        const result = await this.runCompaniesHouseSync(team.id);
        this.logger.log(`Team ${team.id}: updated ${result.recordsUpdated} companies`);
      } catch (err) {
        this.logger.error(`Daily sync failed for team ${team.id}:`, err);
      }
    }
  }
}
