import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Distinct styling for AI-generated content vs. regular notes. */

const variants = {
  summary: {
    wrap: "border-violet-200/80 bg-violet-50/80 dark:border-violet-900/60 dark:bg-violet-950/35",
    label: "text-violet-700 dark:text-violet-300",
  },
  actions: {
    wrap: "border-sky-200/80 bg-sky-50/80 dark:border-sky-900/60 dark:bg-sky-950/35",
    label: "text-sky-800 dark:text-sky-200",
  },
  draft: {
    wrap: "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/35",
    label: "text-emerald-800 dark:text-emerald-200",
  },
} as const;

export type AiPanelVariant = keyof typeof variants;

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
      />
    </svg>
  );
}

export function AiSectionTitle({
  title,
  subtitle,
  loading = false,
}: {
  title: string;
  subtitle?: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <SparklesIcon className="mt-0.5 h-5 w-5 shrink-0 text-violet-500 dark:text-violet-400" />
      <div>
        <h2 className={`text-lg font-semibold tracking-tight ${loading ? "ai-title-shimmer" : ""}`}>{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function AiResponsePanel({
  variant,
  label,
  children,
  loading,
  markdown,
}: {
  variant: AiPanelVariant;
  label: string;
  children: ReactNode;
  loading?: boolean;
  markdown?: string | null;
}) {
  const v = variants[variant];
  return (
    <div
      className={`rounded-lg border p-4 text-sm ${v.wrap}`}
      aria-busy={loading}
    >
      <p className={`text-xs font-semibold uppercase tracking-wide ${v.label}`}>{label}</p>
      {loading ? (
        <div className="mt-3 space-y-2" role="status">
          <div className="h-3 w-full animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-600/50" />
          <div className="h-3 w-[92%] animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-600/50" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-600/50" />
          <p className="pt-1 text-xs text-zinc-600 dark:text-zinc-400">Generating…</p>
        </div>
      ) : (
        <div className="mt-2 text-zinc-800 dark:text-zinc-200">
          {typeof markdown === "string" ? (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-li:my-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{children}</div>
          )}
        </div>
      )}
    </div>
  );
}
