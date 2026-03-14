"use client";

import { useEffect } from "react";

const INPUT =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 transition focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-700";

const LABEL = "block text-xs font-medium text-zinc-500 dark:text-zinc-400";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
const SOURCES = ["", "Website", "Referral", "Cold outreach", "LinkedIn", "Conference", "Partner", "Other"];
const STATUSES = ["OPEN", "WON", "LOST"] as const;

export type LeadFormValues = {
  title: string;
  stageId: string;
  priority: string;
  status?: string;
  value: string;
  currency: string;
  companyId: string;
  contactId: string;
  description: string;
  source: string;
  tags: string;
  expectedClose: string;
  lostReason?: string;
};

type Props = {
  mode: "create" | "edit";
  values: LeadFormValues;
  onChange: (patch: Partial<LeadFormValues>) => void;
  stages: Array<{ id: string; name: string }>;
  companies: Array<{ id: string; name: string }>;
  contacts: Array<{ id: string; firstName: string; lastName: string }>;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  isError?: boolean;
  errorMessage?: string;
};

export function LeadForm({
  mode,
  values,
  onChange,
  stages,
  companies,
  contacts,
  onSubmit,
  onCancel,
  isPending,
  isError,
  errorMessage,
}: Props) {
  useEffect(() => {
    if (mode === "create" && stages.length > 0 && !values.stageId) {
      onChange({ stageId: stages[0].id });
    }
  }, [stages, mode, values.stageId, onChange]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      {/* Title — full width */}
      <div>
        <label className={LABEL}>
          Title <span className="text-red-500">*</span>
        </label>
        <input
          required
          value={values.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Acme Corp — Enterprise Plan"
          className={INPUT}
        />
      </div>

      {/* Stage + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>
            Stage <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={values.stageId}
            onChange={(e) => onChange({ stageId: e.target.value })}
            className={INPUT}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Priority</label>
          <select
            value={values.priority}
            onChange={(e) => onChange({ priority: e.target.value })}
            className={INPUT}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status (edit only) */}
      {mode === "edit" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Status</label>
            <select
              value={values.status ?? "OPEN"}
              onChange={(e) => onChange({ status: e.target.value })}
              className={INPUT}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          {values.status === "LOST" && (
            <div>
              <label className={LABEL}>Lost reason</label>
              <input
                value={values.lostReason ?? ""}
                onChange={(e) => onChange({ lostReason: e.target.value })}
                placeholder="Why was it lost?"
                className={INPUT}
              />
            </div>
          )}
        </div>
      )}

      {/* Deal Value + Currency */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={LABEL}>Deal value</label>
          <input
            type="number"
            min={0}
            value={values.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="0"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Currency</label>
          <input
            value={values.currency}
            onChange={(e) => onChange({ currency: e.target.value.toUpperCase() })}
            maxLength={3}
            className={INPUT + " uppercase"}
          />
        </div>
      </div>

      {/* Company + Contact */}
      <div className="grid grid-cols-2 gap-3">
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
        <div>
          <label className={LABEL}>Contact</label>
          <select
            value={values.contactId}
            onChange={(e) => onChange({ contactId: e.target.value })}
            className={INPUT}
          >
            <option value="">— None —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Source + Expected Close */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Source</label>
          <select
            value={values.source}
            onChange={(e) => onChange({ source: e.target.value })}
            className={INPUT}
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s || "— None —"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Expected close</label>
          <input
            type="date"
            value={values.expectedClose}
            onChange={(e) => onChange({ expectedClose: e.target.value })}
            className={INPUT}
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className={LABEL}>Tags</label>
        <input
          value={values.tags}
          onChange={(e) => onChange({ tags: e.target.value })}
          placeholder="enterprise, hot, q2 (comma-separated)"
          className={INPUT}
        />
      </div>

      {/* Description */}
      <div>
        <label className={LABEL}>Description</label>
        <textarea
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          placeholder="Deal context, background info…"
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
          disabled={isPending || !values.stageId}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create lead"
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
