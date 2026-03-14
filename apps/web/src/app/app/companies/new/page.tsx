"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CompanyForm, type CompanyFormValues } from "@/components/CompanyForm";
import { api } from "@/lib/api";
import {
  companiesHouseSuggestedToFormPatch,
  type CompaniesHouseFormSuggested,
} from "@/lib/ch-form-lookup";
import { integrationsStatusQuery } from "@/lib/dashboard-stats";

export default function NewCompanyPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [values, setValues] = useState<CompanyFormValues>({
    name: "",
    website: "",
    companyNumber: "",
    industry: "",
    description: "",
    employeeCount: "",
  });

  const integrations = useQuery(integrationsStatusQuery);
  const chConfigured =
    integrations.data?.find((s) => s.integration === "companies_house")?.configured ?? false;

  const chFormLookup = useMutation({
    mutationFn: async (crn: string) => {
      const res = await api<{ suggested: CompaniesHouseFormSuggested }>(
        "/integrations/companies-house/lookup",
        { method: "POST", body: JSON.stringify({ companyNumber: crn }) },
      );
      return companiesHouseSuggestedToFormPatch(res.suggested);
    },
  });

  const create = useMutation({
    mutationFn: () =>
      api<{ id: string }>("/companies", {
        method: "POST",
        body: JSON.stringify({
          name: values.name.trim(),
          website: values.website.trim() || undefined,
          companyNumber: values.companyNumber.trim() || undefined,
          industry: values.industry.trim() || undefined,
          description: values.description.trim() || undefined,
          employeeCount:
            values.employeeCount.trim() === ""
              ? undefined
              : Math.max(0, Number(values.employeeCount)),
        }),
      }),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["companies"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.replace(`/app/companies/${row.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/app/companies"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ←
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">New company</h1>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <CompanyForm
          mode="create"
          values={values}
          onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
          onSubmit={() => create.mutate()}
          onCancel={() => router.push("/app/companies")}
          isPending={create.isPending}
          isError={create.isError}
          errorMessage={
            create.error instanceof Error ? create.error.message : undefined
          }
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
    </div>
  );
}
