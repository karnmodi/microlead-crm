"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { LeadForm, type LeadFormValues } from "@/components/LeadForm";

export default function NewLeadPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const stages = useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: () => api<Array<{ id: string; name: string }>>("/pipeline-stages"),
  });

  const companies = useQuery({
    queryKey: ["companies", "options"],
    queryFn: () => api<{ data: Array<{ id: string; name: string }> }>("/companies?limit=200"),
  });

  const contacts = useQuery({
    queryKey: ["contacts", "options"],
    queryFn: () =>
      api<{ data: Array<{ id: string; firstName: string; lastName: string }> }>(
        "/contacts?limit=200",
      ),
  });

  const [values, setValues] = useState<LeadFormValues>({
    title: "",
    stageId: "",
    priority: "MEDIUM",
    value: "",
    currency: "USD",
    companyId: "",
    contactId: "",
    description: "",
    source: "",
    tags: "",
    expectedClose: "",
  });

  const create = useMutation({
    mutationFn: () =>
      api<{ id: string }>("/leads", {
        method: "POST",
        body: JSON.stringify({
          title: values.title.trim(),
          stageId: values.stageId,
          priority: values.priority,
          value: values.value.trim() === "" ? undefined : Number(values.value),
          companyId: values.companyId || undefined,
          contactId: values.contactId || undefined,
          description: values.description.trim() || undefined,
          currency: values.currency.trim() || "USD",
          source: values.source.trim() || undefined,
          tags: values.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          expectedCloseDate: values.expectedClose
            ? `${values.expectedClose}T12:00:00.000Z`
            : undefined,
        }),
      }),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["leads", "kanban"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.replace(`/app/leads/${row.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/app/leads/kanban"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ←
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">New lead</h1>
          <p className="text-xs text-zinc-500">
            Win probability will be computed by AI once the lead is created.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <LeadForm
          mode="create"
          values={values}
          onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
          stages={stages.data ?? []}
          companies={companies.data?.data ?? []}
          contacts={contacts.data?.data ?? []}
          onSubmit={() => create.mutate()}
          onCancel={() => router.push("/app/leads/kanban")}
          isPending={create.isPending}
          isError={create.isError}
          errorMessage={
            create.error instanceof Error ? create.error.message : undefined
          }
        />
      </div>
    </div>
  );
}
