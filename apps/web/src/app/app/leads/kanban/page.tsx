"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KanbanPageSkeleton } from "@/components/page-skeletons";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type Owner = { id: string; name: string | null; email: string };
type LeadRow = {
  id: string;
  title: string;
  stageId: string;
  value: string | number | null;
  currency: string;
  priority: string;
  expectedCloseDate: string | null;
  probability: number | null;
  source: string | null;
  company: { id: string; name: string } | null;
  owner: Owner | null;
};

type KanbanResponse = {
  stages: Array<{
    stage: { id: string; name: string };
    leads: LeadRow[];
  }>;
};

function applyKanbanMove(data: KanbanResponse, leadId: string, targetStageId: string): KanbanResponse {
  let moved: LeadRow | undefined;
  const without = data.stages.map((block) => {
    const idx = block.leads.findIndex((l) => l.id === leadId);
    if (idx === -1) return block;
    moved = { ...block.leads[idx], stageId: targetStageId };
    return { ...block, leads: block.leads.filter((l) => l.id !== leadId) };
  });
  if (!moved) return data;
  return {
    stages: without.map((block) =>
      block.stage.id === targetStageId ? { ...block, leads: [...block.leads, moved!] } : block,
    ),
  };
}

function formatMoney(v: string | number | null, currency: string) {
  if (v == null || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return String(v);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(n);
  } catch {
    return `${currency} ${n}`;
  }
}

function initials(owner: Owner | null) {
  if (!owner?.name && !owner?.email) return "?";
  const s = owner.name ?? owner.email ?? "";
  const parts = s.split(/[\s@]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

function DroppableColumn({
  id,
  children,
  totalValue,
}: {
  id: string;
  children: React.ReactNode;
  totalValue: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${id}` });
  return (
    <section
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-zinc-100/50 dark:bg-zinc-900/50 ${
        isOver ? "border-blue-400 ring-2 ring-blue-400/30" : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {children}
      {totalValue && (
        <p className="border-t border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800">
          Sum: {totalValue}
        </p>
      )}
    </section>
  );
}

function DraggableLead({
  lead,
  stages,
  onMove,
}: {
  lead: LeadRow;
  stages: KanbanResponse["stages"];
  onMove: (leadId: string, stageId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lead-${lead.id}`,
    data: { lead },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const val = formatMoney(lead.value, lead.currency);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-950 ${
        isDragging ? "opacity-60" : ""
      }`}
      {...listeners}
      {...attributes}
    >
      <Link
        href={`/app/leads/${lead.id}`}
        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
        onClick={(e) => e.stopPropagation()}
      >
        {lead.title}
      </Link>
      <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
        {val && <span>{val}</span>}
        {lead.company && <span className="truncate">{lead.company.name}</span>}
        {lead.source && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700 dark:bg-blue-950 dark:text-blue-200">{lead.source}</span>}
        {lead.probability != null && <span>{lead.probability}%</span>}
        {lead.expectedCloseDate && <span>Close {formatDate(lead.expectedCloseDate)}</span>}
        <span
          className={`rounded px-1.5 py-0.5 font-medium ${
            lead.priority === "HIGH"
              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
              : lead.priority === "LOW"
                ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          }`}
        >
          {lead.priority}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold dark:bg-zinc-700"
          title={lead.owner?.name ?? lead.owner?.email ?? ""}
        >
          {initials(lead.owner)}
        </span>
        <label className="text-xs text-zinc-500" onClick={(e) => e.stopPropagation()}>
          Move
          <select
            className="ml-1 max-w-[7rem] rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            value={lead.stageId}
            onChange={(e) => {
              const stageId = e.target.value;
              onMove(lead.id, stageId);
            }}
          >
            {stages.map((s) => (
              <option key={s.stage.id} value={s.stage.id}>
                {s.stage.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </li>
  );
}

export default function KanbanPage() {
  const qc = useQueryClient();
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null);
  const [sortBy, setSortBy] = useState<
    "updatedAt" | "value" | "priority" | "expectedCloseDate" | "title"
  >("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { data, isLoading, error } = useQuery({
    queryKey: ["leads", "kanban", sortBy, sortOrder],
    queryFn: () => api<KanbanResponse>(`/leads/kanban?sortBy=${sortBy}&sortOrder=${sortOrder}`),
  });

  const move = useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      api(`/leads/${id}`, { method: "PATCH", body: JSON.stringify({ stageId }) }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["leads", "kanban", sortBy, sortOrder] });
      const previous = qc.getQueryData<KanbanResponse>(["leads", "kanban", sortBy, sortOrder]);
      if (previous) {
        qc.setQueryData<KanbanResponse>(["leads", "kanban", sortBy, sortOrder], (old) =>
          old ? applyKanbanMove(old, vars.id, vars.stageId) : old,
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["leads", "kanban", sortBy, sortOrder], ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["leads", "kanban"] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function onDragEnd(e: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith("stage-")) return;
    const stageId = overId.replace(/^stage-/, "");
    const leadId = String(active.id).replace(/^lead-/, "");
    const lead = data?.stages.flatMap((s) => s.leads).find((l) => l.id === leadId);
    if (!lead || lead.stageId === stageId) return;
    move.mutate({ id: leadId, stageId });
  }

  if (isLoading) {
    return <KanbanPageSkeleton />;
  }
  if (error) {
    return (
      <p className="text-sm text-red-600">
        {error instanceof Error ? error.message : "Failed to load kanban"}
      </p>
    );
  }

  const totalLeads = data?.stages.reduce((n, s) => n + s.leads.length, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Drag deals between stages or use Move. Open deals only (status OPEN)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-zinc-500">
              Sort
              <select
                className="ml-2 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as "updatedAt" | "value" | "priority" | "expectedCloseDate" | "title",
                  )
                }
              >
                <option value="updatedAt">Updated time</option>
                <option value="value">Deal value</option>
                <option value="priority">Priority</option>
                <option value="expectedCloseDate">Expected close</option>
                <option value="title">Lead title</option>
              </select>
            </label>
            <label className="text-xs text-zinc-500">
              Order
              <select
                className="ml-2 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>
            <Link href="/app/leads/new">
              <Button variant="primary" size="md">
                New lead
              </Button>
            </Link>
          </div>
        }
      />

      {totalLeads === 0 && (
        <div className="mt-8">
          <EmptyState
            title="No open leads yet"
            description="Create a lead to see your pipeline. Closed or won deals stay on the lead record but are hidden here."
            actionHref="/app/leads/new"
            actionLabel="Create lead"
          />
        </div>
      )}

      {totalLeads > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e) => {
            const id = String(e.active.id).replace(/^lead-/, "");
            const lead = data?.stages.flatMap((s) => s.leads).find((l) => l.id === id);
            setActiveLead(lead ?? null);
          }}
          onDragEnd={onDragEnd}
        >
          <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
            {data?.stages.map(({ stage, leads }) => {
              let sum = 0;
              let cur = "USD";
              for (const l of leads) {
                cur = l.currency || "USD";
                if (l.value != null) {
                  const n = typeof l.value === "string" ? parseFloat(l.value) : Number(l.value);
                  if (!Number.isNaN(n)) sum += n;
                }
              }
              const sumLabel = leads.length ? formatMoney(sum, cur) : null;
              return (
                <DroppableColumn key={stage.id} id={stage.id} totalValue={sumLabel}>
                  <h2 className="border-b border-zinc-200 px-3 py-2 text-sm font-semibold dark:border-zinc-800">
                    {stage.name}
                    <span className="ml-2 font-normal text-zinc-500">({leads.length})</span>
                  </h2>
                  <ul className="max-h-[70vh] space-y-2 overflow-y-auto p-2">
                    {leads.map((lead) => (
                      <DraggableLead
                        key={lead.id}
                        lead={lead}
                        stages={data!.stages}
                        onMove={(leadId, stageId) => move.mutate({ id: leadId, stageId })}
                      />
                    ))}
                    {leads.length === 0 && (
                      <li className="px-2 py-6 text-center text-xs text-zinc-400">Drop leads here</li>
                    )}
                  </ul>
                </DroppableColumn>
              );
            })}
          </div>
          <DragOverlay>
            {activeLead ? (
              <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
                <p className="font-medium">{activeLead.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
