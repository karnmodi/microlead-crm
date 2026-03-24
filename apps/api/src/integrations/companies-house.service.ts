import { Injectable, Logger } from "@nestjs/common";
import {
  mapCompaniesHouseResponseToBusinessProfile,
  mapOfficersResponse,
  type CompaniesHouseBusinessProfile,
  type CompaniesHouseOfficer,
} from "./companies-house-business-profile";
import type { FetchHttpResponse } from "../fetch-http-response";

const DEFAULT_COMPANIES_HOUSE_BASE_URL = "https://api.company-information.service.gov.uk";

@Injectable()
export class CompaniesHouseService {
  private readonly logger = new Logger(CompaniesHouseService.name);

  private getBaseUrl(): string {
    const raw = process.env.COMPANIES_HOUSE_API_BASE_URL?.trim();
    if (!raw) return DEFAULT_COMPANIES_HOUSE_BASE_URL;
    return raw.replace(/\/+$/, "");
  }

  private getApiKey(): string | null {
    return process.env.COMPANIES_HOUSE_API_KEY?.trim() ?? null;
  }

  isConfigured(): boolean {
    return !!this.getApiKey();
  }

  async fetchOfficers(companyNumber: string): Promise<CompaniesHouseOfficer[] | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const normalized = companyNumber.trim().toUpperCase().padStart(8, "0");
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/company/${normalized}/officers`;
    const credentials = Buffer.from(`${apiKey}:`).toString("base64");

    try {
      const res = (await fetch(url, {
        headers: { Authorization: `Basic ${credentials}` },
      })) as FetchHttpResponse;

      if (res.status === 404) return [];
      if (!res.ok) {
        this.logger.warn(`Companies House officers API error ${res.status} for ${normalized}`);
        return null;
      }

      const data: unknown = await res.json();
      return mapOfficersResponse(data);
    } catch (err) {
      this.logger.error(`Failed to fetch officers for ${normalized}:`, err);
      return null;
    }
  }

  async fetchCompany(companyNumber: string): Promise<CompaniesHouseBusinessProfile | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      this.logger.warn("COMPANIES_HOUSE_API_KEY not set — skipping enrichment");
      return null;
    }

    const normalized = companyNumber.trim().toUpperCase().padStart(8, "0");
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/company/${normalized}`;
    const credentials = Buffer.from(`${apiKey}:`).toString("base64");
    const apiRetrievedAt = new Date().toISOString();

    try {
      const res = (await fetch(url, {
        headers: { Authorization: `Basic ${credentials}` },
      })) as FetchHttpResponse;

      if (res.status === 404) return null;
      if (!res.ok) {
        this.logger.warn(`Companies House API error ${res.status} for ${normalized}`);
        return null;
      }

      const data: unknown = await res.json();
      return mapCompaniesHouseResponseToBusinessProfile(data, apiRetrievedAt);
    } catch (err) {
      this.logger.error(`Failed to fetch company ${normalized}:`, err);
      return null;
    }
  }
}
