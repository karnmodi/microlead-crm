/** Layout-preserving loading placeholders (pulse) instead of bare “Loading…” text. */

export function ListPageSkeleton({ title = "Loading" }: { title?: string }) {
  return (
    <div className="animate-pulse space-y-6" aria-busy aria-label={title}>
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-72 max-w-full rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="px-4 py-4">
            <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-3 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="animate-pulse space-y-8" aria-busy aria-label="Loading record">
      <div className="space-y-3">
        <div className="h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-2/3 max-w-md rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-full max-w-xl rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="space-y-2">
        <div className="h-6 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-24 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="space-y-2">
        <div className="h-6 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-32 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

export function KanbanPageSkeleton() {
  return (
    <div className="animate-pulse space-y-6" aria-busy aria-label="Loading pipeline">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-64 max-w-full rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="h-10 w-28 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="flex gap-4 overflow-hidden pb-2">
        {Array.from({ length: 4 }).map((_, c) => (
          <div
            key={c}
            className="w-72 shrink-0 space-y-2 rounded-xl border border-zinc-200 p-2 dark:border-zinc-800"
          >
            <div className="h-10 rounded bg-zinc-200 dark:bg-zinc-800" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Compact pulse block for secondary sections (e.g. activity timeline). */
export function TimelineSkeleton() {
  return (
    <div className="animate-pulse mt-4 space-y-3" aria-busy aria-label="Loading timeline">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      ))}
    </div>
  );
}

export function TasksPageSkeleton() {
  return (
    <div className="animate-pulse space-y-8" aria-busy aria-label="Loading tasks">
      <div className="space-y-2">
        <div className="h-8 w-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-56 rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="h-20 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-20 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-20 rounded-lg bg-zinc-200 dark:bg-zinc-800 sm:col-span-2" />
        </div>
      </div>
      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="h-14 px-4" />
        ))}
      </ul>
    </div>
  );
}
