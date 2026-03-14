/** Partial CRM company form fields filled from Companies House lookup. */
export type CompanyFormChPatch = Partial<{
  name: string;
  website: string;
  companyNumber: string;
  industry: string;
  description: string;
  employeeCount: string;
}>;

/** Response shape from POST /integrations/companies-house/lookup */
export type CompaniesHouseFormSuggested = {
  name: string;
  companyNumber: string;
  description: string;
  industryHint: string;
};

const INDUSTRY_KEYWORDS: { re: RegExp; industry: string }[] = [
  { re: /software|saas|cloud|computer programming|information technology|it consultancy|data proces/i, industry: "Technology" },
  { re: /\bsaas\b|subscription software/i, industry: "SaaS" },
  { re: /bank|finance|insurance|investment|accounting/i, industry: "Finance" },
  { re: /health|medical|pharma|hospital|care home/i, industry: "Healthcare" },
  { re: /retail|shop|store|e-?commerce|mail order/i, industry: "E-commerce" },
  { re: /advertis|marketing|public relation|media agency/i, industry: "Marketing" },
  { re: /manufactur|engineering|machinery|production/i, industry: "Manufacturing" },
  { re: /education|school|university|training/i, industry: "Education" },
  { re: /real estate|property|letting|estate agent/i, industry: "Real Estate" },
  { re: /legal|solicitor|lawyer|barrister/i, industry: "Legal" },
  { re: /consult|advisory|management consultancy/i, industry: "Consulting" },
  { re: /publish|broadcast|film|television|news/i, industry: "Media" },
  { re: /wholesale|retail sale|supermarket|general store/i, industry: "Retail" },
];

/** Map Companies House SIC hint text to closest CRM industry dropdown value (or ""). */
export function guessIndustryFromChHint(hint: string): string {
  const h = hint.trim();
  if (!h) return "";
  for (const { re, industry } of INDUSTRY_KEYWORDS) {
    if (re.test(h)) return industry;
  }
  return "Other";
}

export function companiesHouseSuggestedToFormPatch(
  s: CompaniesHouseFormSuggested,
): CompanyFormChPatch {
  return {
    name: s.name,
    companyNumber: s.companyNumber,
    description: s.description,
    industry: guessIndustryFromChHint(s.industryHint),
  };
}
