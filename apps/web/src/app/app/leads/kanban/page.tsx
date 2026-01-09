"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

type KanbanResponse = {
  stages: Array<{
    stage: { id: string; name: string };
    leads: Array<{ id: string; title: string; stageId: string }>;
  }>;
};

export default function KanbanPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["leads", "kanban"],
    queryFn: () => api<KanbanResponse>("/leads/kanban"),
  });

  const move = useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      api(`/leads/${id}`, { method: "PATCH", body: JSON.stringify({ stageId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads", "kanban"] }),
  });

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading board…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-red-600">
        {error instanceof Error ? error.message : "Failed to load kanban"}
      </p>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Move cards between stages (PATCH lead). MVP: select new stage per card.
      </p>
      <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
        {data?.stages.map(({ stage, leads }) => (
          <section
            key={stage.id}
            className="w-72 shrink-0 rounded-xl border border-zinc-200 bg-zinc-100/50 dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <h2 className="border-b border-zinc-200 px-3 py-2 text-sm font-semibold dark:border-zinc-800">
              {stage.name}
              <span className="ml-2 font-normal text-zinc-500">({leads.length})</span>
            </h2>
            <ul className="space-y-2 p-2">
              {leads.map((lead) => (
                <li
                  key={lead.id}
                  className="rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-950"
                >
                  <p className="font-medium">{lead.title}</p>
                  <label className="mt-2 block text-xs text-zinc-500">
                    Move to
                    <select
                      className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                      value={lead.stageId}
                      onChange={(e) =>
                        move.mutate({ id: lead.id, stageId: e.target.value })
                      }
                      disabled={move.isPending}
                    >
                      {data.stages.map((s) => (
                        <option key={s.stage.id} value={s.stage.id}>
                          {s.stage.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </li>
              ))}
              {leads.length === 0 && (
                <li className="px-2 py-6 text-center text-xs text-zinc-400">No leads</li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
