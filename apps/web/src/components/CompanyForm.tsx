"use client";

const INPUT =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-700";

const LABEL = "block text-xs font-medium text-zinc-500 dark:text-zinc-400";

const INDUSTRIES = [
  "",
  "Technology",
  "SaaS",
  "Finance",
  "Healthcare",
  "E-commerce",
  "Marketing",
  "Manufacturing",
  "Education",
  "Real Estate",
  "Legal",
  "Consulting",
  "Media",
  "Retail",
  "Other",
];

export type CompanyFormValues = {
  name: string;
  website: string;
  companyNumber: string;
  industry: string;
  description: string;
  employeeCount: string;
};

export type CompaniesHouseFormLookupProps = {
  /** When false, the fetch button is disabled (e.g. API key not set on server). */
  configured: boolean;
  isPending: boolean;
  errorMessage?: string | null;
  /** Fetch by CRN and return fields to merge into the form (name, description, industry, etc.). */
  onFetch: (companyNumber: string) => Promise<Partial<CompanyFormValues>>;
};

type Props = {
  mode: "create" | "edit";
  values: CompanyFormValues;
  onChange: (patch: Partial<CompanyFormValues>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  isError?: boolean;
  errorMessage?: string;
  companiesHouseLookup?: CompaniesHouseFormLookupProps;
};

export function CompanyForm({
  mode,
  values,
  onChange,
  onSubmit,
  onCancel,
  isPending,
  isError,
  errorMessage,
  companiesHouseLookup,
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      {/* Name + Website */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>
            Company name <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Acme Corp"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Website</label>
          <input
            value={values.website}
            onChange={(e) => onChange({ website: e.target.value })}
            placeholder="acme.com"
            className={INPUT}
          />
        </div>
      </div>

      <div>
        <label className={LABEL}>UK company number (CRN)</label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <input
            value={values.companyNumber}
            onChange={(e) => onChange({ companyNumber: e.target.value })}
            placeholder="00445790"
            className={INPUT + " min-w-0 flex-1"}
          />
          {companiesHouseLookup && (
            <button
              type="button"
              title={
                !companiesHouseLookup.configured
                  ? "Companies House is not configured on the server"
                  : !values.companyNumber.trim()
                    ? "Enter a company number first"
                    : "Fill name, industry, and description from Companies House"
              }
              disabled={
                !companiesHouseLookup.configured ||
                !values.companyNumber.trim() ||
                companiesHouseLookup.isPending
              }
              onClick={async () => {
                const crn = values.companyNumber.trim();
                if (!crn) return;
                try {
                  const patch = await companiesHouseLookup.onFetch(crn);
                  onChange(patch);
                } catch {
                  /* Parent surfaces error via companiesHouseLookup.errorMessage */
                }
              }}
              className="shrink-0 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-900 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/70"
            >
              {companiesHouseLookup.isPending ? "Fetching…" : "Fetch from CH"}
            </button>
          )}
        </div>
        <p className="mt-1 text-[11px] text-zinc-400">
          Companies House registration number — use Fetch from CH to autofill name and details, or save and import
          enrichment from the company page.
        </p>
        {companiesHouseLookup?.errorMessage ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{companiesHouseLookup.errorMessage}</p>
        ) : null}
      </div>

      {/* Industry + Employee count */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Industry</label>
          <select
            value={values.industry}
            onChange={(e) => onChange({ industry: e.target.value })}
            className={INPUT}
          >
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i || "— Select —"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Employee count</label>
          <input
            type="number"
            min={0}
            value={values.employeeCount}
            onChange={(e) => onChange({ employeeCount: e.target.value })}
            placeholder="50"
            className={INPUT}
          />
        </div>
      </div>

      {/* Description — full width */}
      <div>
        <label className={LABEL}>Description</label>
        <textarea
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          placeholder="What does this company do? Any relevant context…"
          className={INPUT + " resize-none"}
        />
      </div>

      {isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {errorMessage ?? "Something went wrong. Please try again."}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending || !values.name.trim()}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create company"
              : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
