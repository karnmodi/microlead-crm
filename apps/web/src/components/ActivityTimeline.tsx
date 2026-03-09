"use client";

type Actor = { id: string; name: string | null; email: string };

export type ActivityRow = {
  id: string;
  action: string;
  createdAt: string;
  metadata: unknown;
  actor: Actor;
};

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function renderChanges(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const changes = (metadata as { changes?: Record<string, { from?: unknown; to?: unknown }> }).changes;
  if (!changes || typeof changes !== "object") return null;
  const entries = Object.entries(changes);
  if (!entries.length) return null;
  return (
    <ul className="mt-1 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
      {entries.map(([field, diff]) => (
        <li key={field}>
          <span className="font-medium">{field}</span>: {String(diff.from ?? "empty")} {"->"}{" "}
          {String(diff.to ?? "empty")}
        </li>
      ))}
    </ul>
  );
}

export function ActivityTimeline({
  items,
  emptyLabel = "No activity yet.",
}: {
  items: ActivityRow[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ol className="space-y-4 border-l border-zinc-200 pl-4 dark:border-zinc-700">
      {items.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{a.action}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {a.actor.name ?? a.actor.email} · {formatWhen(a.createdAt)}
          </p>
          {renderChanges(a.metadata)}
        </li>
      ))}
    </ol>
  );
}
