/**
 * Business-oriented view of UK Companies House company profile data.
 * Maps GET /company/{number} JSON into CRM-friendly field names.
 */

export const COMPANIES_HOUSE_SOURCE = "companies_house" as const;

/** Optional SIC 2007 descriptions — extend as needed for your ICP. */
const SIC_DESCRIPTIONS: Record<string, string> = {
  "47110":
    "Retail sale in non-specialised stores with food, beverages or tobacco predominating",
  "62020": "Information technology consultancy activities",
  "62012": "Business and domestic software development",
};

export type CompaniesHouseRegisteredOffice = {
  line1?: string;
  line2?: string;
  postTown?: string;
  postcode?: string;
  country?: string;
};

export type CompaniesHouseSicEntry = {
  code: string;
  description: string | null;
};

export type CompaniesHouseIndustryClassification = {
  sicCodes: string[];
  sicDescriptions: CompaniesHouseSicEntry[];
};

export type CompaniesHouseAccountsFiling = {
  nextAccountsDueOn: string | null;
  lastAccountsMadeUpTo: string | null;
  overdue: boolean | null;
};

export type CompaniesHouseConfirmationStatement = {
  nextDueOn: string | null;
  lastMadeUpTo: string | null;
  overdue: boolean | null;
};

export type CompaniesHousePreviousName = {
  name: string;
  effectiveFrom: string | null;
  ceasedOn: string | null;
};

export type CompaniesHouseOfficer = {
  name: string;
  /** Normalised display name: "FirstName Surname" (converted from CH "SURNAME, FirstName" format). */
  displayName: string;
  role: string;
  appointedOn: string | null;
  resignedOn: string | null;
  nationality: string | null;
  occupation: string | null;
  countryOfResidence: string | null;
};

export type CompaniesHouseBusinessProfile = {
  source: typeof COMPANIES_HOUSE_SOURCE;
  legalName: string;
  companyRegistrationNumber: string;
  tradingStatus: string;
  incorporatedOn: string | null;
  legalForm: string | null;
  jurisdiction: string | null;
  registeredOffice: CompaniesHouseRegisteredOffice | null;
  industryClassification: CompaniesHouseIndustryClassification;
  accounts: CompaniesHouseAccountsFiling | null;
  confirmationStatement: CompaniesHouseConfirmationStatement | null;
  previousNames: CompaniesHousePreviousName[];
  apiRetrievedAt: string;
};

/** Top-level profile groups teams can include in sync (excludes metadata keys). */
export const COMPANIES_HOUSE_ENRICHMENT_GROUP_KEYS = [
  "legalName",
  "companyRegistrationNumber",
  "tradingStatus",
  "incorporatedOn",
  "legalForm",
  "jurisdiction",
  "registeredOffice",
  "industryClassification",
  "accounts",
  "confirmationStatement",
  "previousNames",
  "officers",
] as const;

export type CompaniesHouseEnrichmentGroupKey = (typeof COMPANIES_HOUSE_ENRICHMENT_GROUP_KEYS)[number];

const ENRICHMENT_KEY_SET = new Set<string>(COMPANIES_HOUSE_ENRICHMENT_GROUP_KEYS);

/** Short labels for Integrations UI / API. */
export const COMPANIES_HOUSE_ENRICHMENT_GROUP_LABELS: Record<CompaniesHouseEnrichmentGroupKey, string> = {
  legalName: "Legal name",
  companyRegistrationNumber: "Company registration number (CRN)",
  tradingStatus: "Trading status",
  incorporatedOn: "Incorporation date",
  legalForm: "Legal form (e.g. ltd, plc)",
  jurisdiction: "Jurisdiction",
  registeredOffice: "Registered office address",
  industryClassification: "Industry (SIC codes)",
  accounts: "Accounts filing dates",
  confirmationStatement: "Confirmation statement",
  previousNames: "Previous company names",
  officers: "Active officers & directors",
};

/** Stored on Company.enrichedData — may omit groups per team/import prefs. */
export type CompaniesHouseEnrichmentPayload = Partial<
  Omit<CompaniesHouseBusinessProfile, "source" | "apiRetrievedAt">
> & {
  source: typeof COMPANIES_HOUSE_SOURCE;
  apiRetrievedAt: string;
  /** Active officers fetched from /company/{crn}/officers — included when "officers" group is selected. */
  officers?: CompaniesHouseOfficer[];
};

/**
 * Normalise requested field keys: only known groups, deduped.
 * Returns null when input is null/undefined/empty → meaning “all groups”.
 */
export function normalizeEnrichmentFieldKeys(
  input: string[] | null | undefined,
): string[] | null {
  if (input == null || !Array.isArray(input) || input.length === 0) return null;
  const seen = new Set<string>();
  for (const k of input) {
    if (typeof k === "string" && ENRICHMENT_KEY_SET.has(k)) seen.add(k);
  }
  if (seen.size === 0) return null;
  return COMPANIES_HOUSE_ENRICHMENT_GROUP_KEYS.filter((k) => seen.has(k));
}

/** Team allows these keys; null = all groups. */
export function teamAllowedKeys(stored: unknown): string[] | null {
  if (stored == null) return null;
  if (!Array.isArray(stored)) return null;
  return normalizeEnrichmentFieldKeys(stored as string[]);
}

/** Resolve keys to fetch/store: team ceiling ∩ (request or team). */
export function resolveEffectiveEnrichmentKeys(
  teamStored: unknown,
  requestFields?: string[],
): string[] {
  const all = [...COMPANIES_HOUSE_ENRICHMENT_GROUP_KEYS] as string[];
  const team = teamAllowedKeys(teamStored);
  const ceiling = team === null ? all : team.filter((k) => all.includes(k));
  if (requestFields == null || requestFields.length === 0) return ceiling;
  const req = normalizeEnrichmentFieldKeys(requestFields) ?? all;
  return req.filter((k) => ceiling.includes(k));
}

/** Strip profile to selected groups; always keeps source + apiRetrievedAt. */
export function filterBusinessProfileByKeys(
  profile: CompaniesHouseBusinessProfile,
  keys: string[],
): CompaniesHouseEnrichmentPayload {
  const use = new Set(keys);
  const out: CompaniesHouseEnrichmentPayload = {
    source: profile.source,
    apiRetrievedAt: profile.apiRetrievedAt,
  };
  for (const k of COMPANIES_HOUSE_ENRICHMENT_GROUP_KEYS) {
    if (!use.has(k)) continue;
    (out as Record<string, unknown>)[k] = (profile as unknown as Record<string, unknown>)[k];
  }
  return out;
}

type RawCompanyProfile = {
  company_name?: string;
  company_number?: string;
  company_status?: string;
  date_of_creation?: string;
  type?: string;
  jurisdiction?: string;
  registered_office_address?: {
    address_line_1?: string;
    address_line_2?: string;
    locality?: string;
    postal_code?: string;
    country?: string;
  };
  sic_codes?: string[];
  accounts?: {
    next_due?: string;
    overdue?: boolean;
    last_made_up_to?: string;
    last_accounts?: { made_up_to?: string };
    next_accounts?: { due_on?: string };
  };
  confirmation_statement?: {
    next_due?: string;
    last_made_up_to?: string;
    overdue?: boolean;
  };
  previous_company_names?: Array<{
    name?: string;
    effective_from?: string;
    ceased_on?: string;
  }>;
  errors?: unknown;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function sicDescriptionsForCodes(codes: string[]): CompaniesHouseSicEntry[] {
  return codes.map((code) => ({
    code,
    description: SIC_DESCRIPTIONS[code] ?? null,
  }));
}

/**
 * Map raw Companies House company profile JSON to a business-oriented profile.
 * @param apiRetrievedAt ISO timestamp of when the API response was received.
 */
export function mapCompaniesHouseResponseToBusinessProfile(
  raw: unknown,
  apiRetrievedAt: string,
): CompaniesHouseBusinessProfile | null {
  if (!isRecord(raw)) return null;
  const data = raw as RawCompanyProfile;
  if (data.errors) return null;

  const number = data.company_number?.trim();
  const name = data.company_name?.trim();
  if (!number && !name) return null;

  const sicCodes = Array.isArray(data.sic_codes) ? data.sic_codes.filter((c): c is string => typeof c === "string") : [];

  const addr = data.registered_office_address;
  const registeredOffice: CompaniesHouseRegisteredOffice | null = addr
    ? {
        line1: addr.address_line_1,
        line2: addr.address_line_2,
        postTown: addr.locality,
        postcode: addr.postal_code,
        country: addr.country,
      }
    : null;

  const acc = data.accounts;
  const accounts: CompaniesHouseAccountsFiling | null = acc
    ? {
        nextAccountsDueOn: acc.next_due ?? acc.next_accounts?.due_on ?? null,
        lastAccountsMadeUpTo: acc.last_accounts?.made_up_to ?? acc.last_made_up_to ?? null,
        overdue: typeof acc.overdue === "boolean" ? acc.overdue : null,
      }
    : null;

  const cs = data.confirmation_statement;
  const confirmationStatement: CompaniesHouseConfirmationStatement | null = cs
    ? {
        nextDueOn: cs.next_due ?? null,
        lastMadeUpTo: cs.last_made_up_to ?? null,
        overdue: typeof cs.overdue === "boolean" ? cs.overdue : null,
      }
    : null;

  const previousNames: CompaniesHousePreviousName[] = Array.isArray(data.previous_company_names)
    ? data.previous_company_names.map((p) => ({
        name: p.name ?? "",
        effectiveFrom: p.effective_from ?? null,
        ceasedOn: p.ceased_on ?? null,
      }))
    : [];

  return {
    source: COMPANIES_HOUSE_SOURCE,
    legalName: name ?? "",
    companyRegistrationNumber: number ?? "",
    tradingStatus: data.company_status ?? "unknown",
    incorporatedOn: data.date_of_creation ?? null,
    legalForm: data.type ?? null,
    jurisdiction: data.jurisdiction ?? null,
    registeredOffice,
    industryClassification: {
      sicCodes,
      sicDescriptions: sicDescriptionsForCodes(sicCodes),
    },
    accounts,
    confirmationStatement,
    previousNames,
    apiRetrievedAt,
  };
}

/**
 * Convert a CH officer name "SURNAME, FirstName MiddleName" to "FirstName MiddleName Surname".
 * Falls back to the original string when no comma is present.
 */
export function formatOfficerDisplayName(raw: string): string {
  const comma = raw.indexOf(",");
  if (comma === -1) return raw.trim();
  const surname = raw.slice(0, comma).trim();
  const forenames = raw.slice(comma + 1).trim();
  return forenames ? `${forenames} ${surname}` : surname;
}

type RawOfficerItem = {
  name?: string;
  officer_role?: string;
  appointed_on?: string;
  resigned_on?: string;
  nationality?: string;
  occupation?: string;
  country_of_residence?: string;
};

type RawOfficersList = {
  items?: RawOfficerItem[];
  active_count?: number;
};

/**
 * Parse the raw Companies House officers list response.
 * Filters to currently active officers only (no resigned_on date).
 */
export function mapOfficersResponse(raw: unknown): CompaniesHouseOfficer[] {
  if (!isRecord(raw)) return [];
  const data = raw as RawOfficersList;
  if (!Array.isArray(data.items)) return [];
  return data.items
    .filter((item): item is RawOfficerItem => isRecord(item) && !item.resigned_on)
    .map((item) => ({
      name: item.name ?? "",
      displayName: formatOfficerDisplayName(item.name ?? ""),
      role: item.officer_role ?? "unknown",
      appointedOn: item.appointed_on ?? null,
      resignedOn: null,
      nationality: item.nationality ?? null,
      occupation: item.occupation ?? null,
      countryOfResidence: item.country_of_residence ?? null,
    }));
}

/**
 * Static sample: TESCO PLC (00445790) — aligned with a real Companies House profile response.
 * Use for UI placeholders, tests, and documentation (no API key required).
 */
export const COMPANIES_HOUSE_BUSINESS_PROFILE_SAMPLE: CompaniesHouseBusinessProfile = {
  source: COMPANIES_HOUSE_SOURCE,
  legalName: "TESCO PLC",
  companyRegistrationNumber: "00445790",
  tradingStatus: "active",
  incorporatedOn: "1947-11-27",
  legalForm: "plc",
  jurisdiction: "england-wales",
  registeredOffice: {
    line1: "Tesco House, Shire Park",
    line2: "Kestrel Way",
    postTown: "Welwyn Garden City",
    postcode: "AL7 1GA",
    country: "United Kingdom",
  },
  industryClassification: {
    sicCodes: ["47110"],
    sicDescriptions: [
      {
        code: "47110",
        description: SIC_DESCRIPTIONS["47110"] ?? null,
      },
    ],
  },
  accounts: {
    nextAccountsDueOn: "2026-08-26",
    lastAccountsMadeUpTo: "2025-02-26",
    overdue: false,
  },
  confirmationStatement: {
    nextDueOn: "2026-07-02",
    lastMadeUpTo: "2025-06-18",
    overdue: false,
  },
  previousNames: [
    {
      name: "TESCO STORES (HOLDINGS) PUBLIC LIMITED COMPANY",
      effectiveFrom: "1947-11-27",
      ceasedOn: "1983-08-25",
    },
  ],
  apiRetrievedAt: "2026-04-13T12:00:00.000Z",
};
