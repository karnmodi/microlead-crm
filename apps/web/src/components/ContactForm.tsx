"use client";

const INPUT =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-700";

const LABEL = "block text-xs font-medium text-zinc-500 dark:text-zinc-400";

export type ContactFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyId: string;
  jobTitle: string;
  linkedinUrl: string;
};

type Props = {
  mode: "create" | "edit";
  values: ContactFormValues;
  onChange: (patch: Partial<ContactFormValues>) => void;
  companies: Array<{ id: string; name: string }>;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  isError?: boolean;
  errorMessage?: string;
};

export function ContactForm({
  mode,
  values,
  onChange,
  companies,
  onSubmit,
  onCancel,
  isPending,
  isError,
  errorMessage,
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      {/* First + Last name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>
            First name <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={values.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            placeholder="Jane"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>
            Last name <span className="text-red-500">*</span>
          </label>
          <input
            required
            value={values.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            placeholder="Smith"
            className={INPUT}
          />
        </div>
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Email</label>
          <input
            type="email"
            value={values.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="jane@example.com"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Phone</label>
          <input
            type="tel"
            value={values.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="+1 555 000 0000"
            className={INPUT}
          />
        </div>
      </div>

      {/* Company — full width */}
      <div>
        <label className={LABEL}>Company</label>
        <select
          value={values.companyId}
          onChange={(e) => onChange({ companyId: e.target.value })}
          className={INPUT}
        >
          <option value="">— None —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Job title + LinkedIn */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Job title</label>
          <input
            value={values.jobTitle}
            onChange={(e) => onChange({ jobTitle: e.target.value })}
            placeholder="Head of Sales"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>LinkedIn</label>
          <input
            type="url"
            value={values.linkedinUrl}
            onChange={(e) => onChange({ linkedinUrl: e.target.value })}
            placeholder="https://linkedin.com/in/…"
            className={INPUT}
          />
        </div>
      </div>

      {isError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {errorMessage ?? "Something went wrong. Please try again."}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create contact"
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
