"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityTimeline, type ActivityRow } from "@/components/ActivityTimeline";
import { DetailPageSkeleton } from "@/components/page-skeletons";
import { AttachmentSection } from "@/components/AttachmentSection";
import { CompanyForm, type CompanyFormValues } from "@/components/CompanyForm";
import { api } from "@/lib/api";
import {
  companiesHouseSuggestedToFormPatch,
  type CompaniesHouseFormSuggested,
} from "@/lib/ch-form-lookup";
import { integrationsStatusQuery } from "@/lib/dashboard-stats";

// ─── Types ──────────────────────────────────────────────────────────────────

type CompanyContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  jobTitle: string | null;
};

type CompanyDetail = {
  id: string;
  name: string;
  website: string | null;
  industry: string | null;
  description: string | null;
  employeeCount: number | null;
  companyNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressPostcode: string | null;
  addressCountry: string | null;
  enrichedData: unknown;
  enrichedAt: string | null;
  enrichmentSource: string | null;
  contacts: CompanyContact[];
};

type ActivitiesRes = { data: ActivityRow[] };
type NotesRes = { data: Array<{ id: string; body: string }> };

type ChPrefs = {
  fields: string[];
  allKeys: string[];
  labels: Record<string, string>;
};

type ChOfficer = {
  name: string;
  displayName: string;
  role: string;
  appointedOn: string | null;
  resignedOn: string | null;
  nationality: string | null;
  occupation: string | null;
  countryOfResidence: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function roleBadgeClass(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("director")) return "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300";
  if (r.includes("secretary")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
  if (r.includes("llp")) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "active") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (s === "dormant") return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  if (s === "dissolved" || s === "liquidation") return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";
}

function formatRole(role: string): string {
  return role
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Normalise a name to lowercase words for fuzzy matching. */
function normaliseName(n: string): string {
  return n.toLowerCase().replace(/[^a-z\s]/g, "").trim();
}

function matchContactToOfficer(
  officer: ChOfficer,
  contacts: CompanyContact[],
): CompanyContact | null {
  const officerNorm = normaliseName(officer.displayName);
  for (const c of contacts) {
    const contactNorm = normaliseName(`${c.firstName} ${c.lastName}`);
    if (officerNorm === contactNorm) return c;
    // Partial match — last name + first word of first name
    const officerWords = officerNorm.split(/\s+/);
    const contactWords = contactNorm.split(/\s+/);
    if (
      officerWords.length >= 2 &&
      contactWords.length >= 2 &&
      officerWords[officerWords.length - 1] === contactWords[contactWords.length - 1] &&
      officerWords[0] === contactWords[0]
    ) {
      return c;
    }
  }
  return null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AddressCard({ data, crn }: { data: Record<string, unknown>; crn: string | null }) {
  const office = isRecord(data.registeredOffice) ? data.registeredOffice : null;
  if (!office) return null;

  const lines = [
    office.line1,
    office.line2,
    office.postTown,
    office.postcode,
    office.country,
  ].filter((l): l is string => typeof l === "string" && !!l);

  if (lines.length === 0) return null;

  const chUrl = crn
    ? `https://find-and-update.company-information.service.gov.uk/company/${crn.trim().toUpperCase().padStart(8, "0")}`
    : null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-zinc-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </span>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Registered Office</h3>
      </div>
      <address className="not-italic text-sm text-zinc-700 dark:text-zinc-300 leading-6">
        {lines.map((line, i) => (
          <span key={i} className="block">{line}</span>
        ))}
      </address>
      {chUrl && (
        <a
          href={chUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-violet-600 hover:underline dark:text-violet-400"
        >
          View on Companies House
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      )}
    </div>
  );
}

function CompanyInfoCard({ data }: { data: Record<string, unknown> }) {
  const industry = isRecord(data.industryClassification) ? data.industryClassification : null;
  const sicCodes = Array.isArray(industry?.sicCodes)
    ? (industry.sicCodes as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const sicDescs = Array.isArray(industry?.sicDescriptions)
    ? (industry.sicDescriptions as unknown[]).filter(isRecord)
    : [];

  const hasContent =
    data.tradingStatus ||
    data.legalForm ||
    data.incorporatedOn ||
    data.jurisdiction ||
    sicCodes.length > 0;

  if (!hasContent) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-zinc-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        </span>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Company Details</h3>
      </div>
      <dl className="space-y-2 text-sm">
        {typeof data.tradingStatus === "string" && data.tradingStatus && (
          <div className="flex items-center gap-2">
            <dt className="w-32 shrink-0 text-zinc-500">Status</dt>
            <dd>
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(data.tradingStatus)}`}>
                {data.tradingStatus}
              </span>
            </dd>
          </div>
        )}
        {typeof data.legalForm === "string" && data.legalForm && (
          <div className="flex items-center gap-2">
            <dt className="w-32 shrink-0 text-zinc-500">Legal form</dt>
            <dd className="uppercase font-medium text-zinc-800 dark:text-zinc-200">{data.legalForm}</dd>
          </div>
        )}
        {typeof data.incorporatedOn === "string" && data.incorporatedOn && (
          <div className="flex items-center gap-2">
            <dt className="w-32 shrink-0 text-zinc-500">Incorporated</dt>
            <dd className="text-zinc-800 dark:text-zinc-200">{data.incorporatedOn}</dd>
          </div>
        )}
        {typeof data.jurisdiction === "string" && data.jurisdiction && (
          <div className="flex items-center gap-2">
            <dt className="w-32 shrink-0 text-zinc-500">Jurisdiction</dt>
            <dd className="text-zinc-800 dark:text-zinc-200 capitalize">{data.jurisdiction.replace(/-/g, " ")}</dd>
          </div>
        )}
        {typeof data.legalName === "string" && data.legalName && (
          <div className="flex items-center gap-2">
            <dt className="w-32 shrink-0 text-zinc-500">Legal name</dt>
            <dd className="text-zinc-800 dark:text-zinc-200">{data.legalName}</dd>
          </div>
        )}
        {sicCodes.length > 0 && (
          <div className="flex items-start gap-2 pt-1">
            <dt className="w-32 shrink-0 text-zinc-500 pt-0.5">SIC codes</dt>
            <dd className="space-y-1">
              {sicDescs.length > 0
                ? sicDescs.map((d, i) => (
                    <div key={i} className="text-zinc-800 dark:text-zinc-200">
                      <span className="font-mono text-xs text-zinc-500">{typeof d.code === "string" ? d.code : sicCodes[i]}</span>
                      {typeof d.description === "string" && d.description && (
                        <span className="ml-2">{d.description}</span>
                      )}
                    </div>
                  ))
                : sicCodes.map((c) => (
                    <span key={c} className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{c}</span>
                  ))}
            </dd>
          </div>
        )}
      </dl>

      {Array.isArray(data.previousNames) && (data.previousNames as unknown[]).length > 0 && (
        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">Previous names</p>
          <ul className="space-y-1">
            {(data.previousNames as unknown[]).filter(isRecord).map((p, i) => (
              <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300">
                {typeof p.name === "string" ? p.name : ""}
                {typeof p.ceasedOn === "string" && p.ceasedOn && (
                  <span className="ml-2 text-xs text-zinc-400">until {p.ceasedOn}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FilingDatesCard({ data }: { data: Record<string, unknown> }) {
  const accounts = isRecord(data.accounts) ? data.accounts : null;
  const conf = isRecord(data.confirmationStatement) ? data.confirmationStatement : null;

  if (!accounts && !conf) return null;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-zinc-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </span>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Filing Dates</h3>
      </div>
      <dl className="space-y-3 text-sm">
        {accounts && (
          <div>
            <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Accounts</dt>
            <dd className="space-y-0.5">
              {typeof accounts.nextAccountsDueOn === "string" && (
                <p className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                  Next due: <span className="font-medium">{accounts.nextAccountsDueOn}</span>
                  {accounts.overdue === true && (
                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      Overdue
                    </span>
                  )}
                </p>
              )}
              {typeof accounts.lastAccountsMadeUpTo === "string" && (
                <p className="text-xs text-zinc-500">Last made up to {accounts.lastAccountsMadeUpTo}</p>
              )}
            </dd>
          </div>
        )}
        {conf && (
          <div>
            <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Confirmation Statement</dt>
            <dd className="space-y-0.5">
              {typeof conf.nextDueOn === "string" && (
                <p className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                  Next due: <span className="font-medium">{conf.nextDueOn}</span>
                  {conf.overdue === true && (
                    <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      Overdue
                    </span>
                  )}
                </p>
              )}
              {typeof conf.lastMadeUpTo === "string" && (
                <p className="text-xs text-zinc-500">Last made up to {conf.lastMadeUpTo}</p>
              )}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function DirectorsTree({
  officers,
  companyName,
  contacts,
}: {
  officers: ChOfficer[];
  companyName: string;
  contacts: CompanyContact[];
}) {
  if (officers.length === 0) return null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Officers &amp; Directors</h2>
      <p className="mb-6 text-sm text-zinc-500">
        Active officers from Companies House. Linked badges indicate a matching CRM contact.
      </p>

      {/* Root node */}
      <div className="flex flex-col items-center">
        <div className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-md">
          {companyName}
        </div>

        {/* Vertical stem */}
        <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-600" />

        {/* Horizontal bar */}
        <div
          className="relative h-px bg-zinc-300 dark:bg-zinc-600"
          style={{ width: `${Math.min(officers.length * 220, 900)}px`, maxWidth: "100%" }}
        />

        {/* Officer cards row */}
        <div className="flex flex-wrap justify-center gap-4 pt-0">
          {officers.map((officer, idx) => {
            const matched = matchContactToOfficer(officer, contacts);
            return (
              <div key={idx} className="flex flex-col items-center">
                {/* Drop stem */}
                <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-600" />
                <div className="w-52 rounded-xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/60">
                  <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 leading-tight">
                    {officer.displayName || officer.name}
                  </p>
                  <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass(officer.role)}`}>
                    {formatRole(officer.role)}
                  </span>
                  {officer.appointedOn && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Appointed {officer.appointedOn}
                    </p>
                  )}
                  {officer.occupation && (
                    <p className="mt-1 text-xs text-zinc-400 truncate" title={officer.occupation}>
                      {officer.occupation}
                    </p>
                  )}
                  {matched && (
                    <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                      <Link
                        href={`/app/contacts/${matched.id}`}
                        className="flex items-start gap-2 group"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-700 dark:text-emerald-400">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-emerald-700 group-hover:underline dark:text-emerald-400">
                            CRM Contact
                          </span>
                          {matched.email && (
                            <span className="block truncate text-xs text-zinc-500" title={matched.email}>
                              {matched.email}
                            </span>
                          )}
                          {matched.jobTitle && (
                            <span className="block truncate text-xs text-zinc-400" title={matched.jobTitle}>
                              {matched.jobTitle}
                            </span>
                          )}
                        </span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompanyDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const qc = useQueryClient();

  const company = useQuery({
    queryKey: ["company", id],
    queryFn: () => api<CompanyDetail>(`/companies/${id}`),
    enabled: !!id,
  });

  const integrations = useQuery(integrationsStatusQuery);
  const chConfigured = integrations.data?.find((s) => s.integration === "companies_house")?.configured ?? false;

  const activities = useQuery({
    queryKey: ["activities", "COMPANY", id],
    queryFn: () =>
      api<ActivitiesRes>(`/activities?entityType=COMPANY&entityId=${encodeURIComponent(id)}&limit=50`),
    enabled: !!id,
  });

  const notes = useQuery({
    queryKey: ["notes", "COMPANY", id],
    queryFn: () =>
      api<NotesRes>(`/notes?parentType=COMPANY&parentId=${encodeURIComponent(id)}&limit=30`),
    enabled: !!id,
  });

  const [noteText, setNoteText] = useState("");
  const addNote = useMutation({
    mutationFn: () =>
      api("/notes", {
        method: "POST",
        body: JSON.stringify({ parentType: "COMPANY", parentId: id, text: noteText }),
      }),
    onMutate: () => {
      setNoteText("");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notes", "COMPANY", id] });
      void qc.invalidateQueries({ queryKey: ["activities", "COMPANY", id] });
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [enrichFields, setEnrichFields] = useState<Set<string>>(new Set());

  const chPrefs = useQuery({
    queryKey: ["integrations", "companies-house-preferences"],
    queryFn: () => api<ChPrefs>("/integrations/companies-house/preferences"),
    enabled: enrichOpen && chConfigured,
  });

  useEffect(() => {
    if (enrichOpen && chPrefs.data?.fields) {
      setEnrichFields(new Set(chPrefs.data.fields));
    }
  }, [enrichOpen, chPrefs.data?.fields]);

  const [editValues, setEditValues] = useState<CompanyFormValues>({
    name: "",
    website: "",
    companyNumber: "",
    industry: "",
    description: "",
    employeeCount: "",
  });

  function openEdit() {
    if (!company.data) return;
    chFormLookup.reset();
    setEditValues({
      name: company.data.name,
      website: company.data.website ?? "",
      companyNumber: company.data.companyNumber ?? "",
      industry: company.data.industry ?? "",
      description: company.data.description ?? "",
      employeeCount:
        company.data.employeeCount != null ? String(company.data.employeeCount) : "",
    });
    setEditOpen(true);
  }

  const save = useMutation({
    mutationFn: () =>
      api(`/companies/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editValues.name.trim(),
          website: editValues.website.trim() || undefined,
          companyNumber:
            editValues.companyNumber.trim() === "" ? null : editValues.companyNumber.trim(),
          industry: editValues.industry.trim() || undefined,
          description: editValues.description.trim() || undefined,
          employeeCount:
            editValues.employeeCount.trim() === ""
              ? undefined
              : Math.max(0, Number(editValues.employeeCount)),
        }),
      }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["company", id] });
      const prev = qc.getQueryData<CompanyDetail>(["company", id]);
      qc.setQueryData<CompanyDetail>(["company", id], (old) =>
        old
          ? {
              ...old,
              name: editValues.name.trim(),
              website: editValues.website.trim() || null,
              companyNumber:
                editValues.companyNumber.trim() === "" ? null : editValues.companyNumber.trim(),
              industry: editValues.industry.trim() || null,
              description: editValues.description.trim() || null,
              employeeCount:
                editValues.employeeCount.trim() === ""
                  ? null
                  : Math.max(0, Number(editValues.employeeCount)),
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["company", id], ctx.prev);
    },
    onSuccess: () => {
      setEditOpen(false);
      void qc.invalidateQueries({ queryKey: ["company", id] });
      void qc.invalidateQueries({ queryKey: ["companies"] });
      void qc.invalidateQueries({ queryKey: ["activities", "COMPANY", id] });
    },
  });

  const chFormLookup = useMutation({
    mutationFn: async (crn: string) => {
      const res = await api<{ suggested: CompaniesHouseFormSuggested }>(
        "/integrations/companies-house/lookup",
        { method: "POST", body: JSON.stringify({ companyNumber: crn }) },
      );
      return companiesHouseSuggestedToFormPatch(res.suggested);
    },
  });

  const enrich = useMutation({
    mutationFn: () =>
      api("/integrations/companies-house/enrich", {
        method: "POST",
        body: JSON.stringify({
          companyId: id,
          fields: enrichFields.size > 0 ? [...enrichFields] : undefined,
        }),
      }),
    onSuccess: () => {
      setEnrichOpen(false);
      void qc.invalidateQueries({ queryKey: ["company", id] });
      void qc.invalidateQueries({ queryKey: ["activities", "COMPANY", id] });
    },
  });

  const remove = useMutation({
    mutationFn: () => api(`/companies/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["companies"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.replace("/app/companies");
    },
  });

  if (company.isLoading) return <DetailPageSkeleton />;
  if (company.error || !company.data) {
    return (
      <p className="text-sm text-red-600">
        {company.error instanceof Error ? company.error.message : "Not found"}
      </p>
    );
  }

  const C = company.data;
  const hasEnrichment =
    C.enrichedData != null && isRecord(C.enrichedData) && C.enrichedData.source === "companies_house";
  const enrichData = hasEnrichment ? (C.enrichedData as Record<string, unknown>) : null;

  const officers: ChOfficer[] = enrichData && Array.isArray(enrichData.officers)
    ? (enrichData.officers as unknown[]).filter(isRecord).map((o) => ({
        name: typeof o.name === "string" ? o.name : "",
        displayName: typeof o.displayName === "string" ? o.displayName : (typeof o.name === "string" ? o.name : ""),
        role: typeof o.role === "string" ? o.role : "unknown",
        appointedOn: typeof o.appointedOn === "string" ? o.appointedOn : null,
        resignedOn: typeof o.resignedOn === "string" ? o.resignedOn : null,
        nationality: typeof o.nationality === "string" ? o.nationality : null,
        occupation: typeof o.occupation === "string" ? o.occupation : null,
        countryOfResidence: typeof o.countryOfResidence === "string" ? o.countryOfResidence : null,
      }))
    : [];

  const addressParts = [
    C.addressLine1,
    C.addressLine2,
    C.addressCity,
    C.addressPostcode,
    C.addressCountry,
  ].filter(Boolean);
  const hasAddress = addressParts.length > 0;

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Company</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{C.name}</h1>
          {C.companyNumber && (
            <p className="mt-1 text-sm text-zinc-500">
              UK company no.{" "}
              <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                {C.companyNumber}
              </span>
            </p>
          )}
          {hasAddress && (
            <p className="mt-1.5 flex items-start gap-1.5 text-sm text-zinc-500">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0 text-zinc-400">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {addressParts.join(", ")}
            </p>
          )}
          {C.website && (
            <a
              href={C.website.startsWith("http") ? C.website : `https://${C.website}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {C.website}
            </a>
          )}
          {(C.industry || C.employeeCount != null) && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {[C.industry, C.employeeCount != null ? `${C.employeeCount} employees` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {C.description && (
            <p className="mt-3 max-w-2xl text-sm text-zinc-700 whitespace-pre-wrap dark:text-zinc-300">
              {C.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openEdit}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this company?")) remove.mutate();
            }}
            disabled={remove.isPending}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400"
          >
            Delete
          </button>
          <Link
            href="/app/companies"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-600"
          >
            All companies
          </Link>
        </div>
      </div>

      {/* ── Companies House enrichment section ── */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Companies House
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Official register data linked to this company&apos;s CRN.
            </p>
            {C.enrichedAt && (
              <p className="mt-0.5 text-xs text-zinc-400">
                Last synced {new Date(C.enrichedAt).toLocaleString()}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={!C.companyNumber?.trim() || !chConfigured || enrich.isPending}
            title={
              !chConfigured
                ? "Set COMPANIES_HOUSE_API_KEY on the server"
                : !C.companyNumber?.trim()
                  ? "Add a UK company number (CRN) first"
                  : "Fetch selected fields from Companies House"
            }
            onClick={() => setEnrichOpen(true)}
            className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-40"
          >
            Fetch from Companies House
          </button>
        </div>

        {hasEnrichment && enrichData ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AddressCard data={enrichData} crn={C.companyNumber} />
            <CompanyInfoCard data={enrichData} />
            <FilingDatesCard data={enrichData} />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
            <p className="text-sm text-zinc-400">
              No enrichment yet. Add a CRN and click &ldquo;Fetch from Companies House&rdquo; to pull in official register data.
            </p>
          </div>
        )}
      </section>

      {/* ── Officers & Directors Tree ── */}
      {officers.length > 0 && (
        <DirectorsTree officers={officers} companyName={C.name} contacts={C.contacts ?? []} />
      )}

      {/* ── Enrich modal ── */}
      {enrichOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Fields to import
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Only groups your team allows in Integrations can be selected. Uncheck any you do not want on this
              import.
            </p>
            {chPrefs.isLoading ? (
              <p className="mt-4 text-sm text-zinc-400">Loading preferences…</p>
            ) : chPrefs.error ? (
              <p className="mt-4 text-sm text-red-600">Could not load field preferences.</p>
            ) : (
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                {(chPrefs.data?.allKeys ?? []).map((key) => {
                  const label = chPrefs.data?.labels[key] ?? key;
                  const allowed = chPrefs.data?.fields.includes(key);
                  const checked = enrichFields.has(key);
                  return (
                    <li key={key}>
                      <label
                        className={`flex cursor-pointer items-start gap-2 text-sm ${
                          !allowed ? "opacity-40" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked && allowed}
                          disabled={!allowed}
                          onChange={() => {
                            setEnrichFields((prev) => {
                              const next = new Set(prev);
                              if (next.has(key)) next.delete(key);
                              else if (allowed) next.add(key);
                              return next;
                            });
                          }}
                          className="mt-0.5 rounded border-zinc-300"
                        />
                        <span className="text-zinc-700 dark:text-zinc-300">{label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            {enrich.isError && (
              <p className="mt-3 text-sm text-red-600">
                {enrich.error instanceof Error ? enrich.error.message : "Enrichment failed"}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEnrichOpen(false)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={enrich.isPending || enrichFields.size === 0 || chPrefs.isLoading}
                onClick={() => enrich.mutate()}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
              >
                {enrich.isPending ? "Fetching…" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit panel ── */}
      {editOpen && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold">Edit company</h2>
          <CompanyForm
            mode="edit"
            values={editValues}
            onChange={(patch) => setEditValues((v) => ({ ...v, ...patch }))}
            onSubmit={() => save.mutate()}
            onCancel={() => setEditOpen(false)}
            isPending={save.isPending}
            isError={save.isError}
            errorMessage={save.error instanceof Error ? save.error.message : undefined}
            companiesHouseLookup={{
              configured: chConfigured,
              isPending: chFormLookup.isPending,
              errorMessage:
                chFormLookup.isError && chFormLookup.error instanceof Error
                  ? chFormLookup.error.message
                  : null,
              onFetch: (crn) => chFormLookup.mutateAsync(crn),
            }}
          />
        </div>
      )}

      <AttachmentSection
        parentType="COMPANY"
        parentId={id}
        queryKey={["company", id]}
      />

      {/* ── Notes ── */}
      <section>
        <h2 className="text-lg font-semibold">Notes</h2>
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!noteText.trim()) return;
            addNote.mutate();
          }}
        >
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={addNote.isPending || !noteText.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add note
          </button>
        </form>
        <ul className="mt-6 space-y-3">
          {notes.data?.data.map((n) => (
            <li
              key={n.id}
              className="rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <p className="whitespace-pre-wrap">{n.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Activity ── */}
      <section>
        <h2 className="text-lg font-semibold">Activity</h2>
        <div className="mt-4">
          <ActivityTimeline items={activities.data?.data ?? []} />
        </div>
      </section>
    </div>
  );
}
