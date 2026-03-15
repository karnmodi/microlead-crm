"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { ContactForm, type ContactFormValues } from "@/components/ContactForm";

export default function NewContactPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const companies = useQuery({
    queryKey: ["companies", "options"],
    queryFn: () => api<{ data: Array<{ id: string; name: string }> }>("/companies?limit=200"),
  });

  const [values, setValues] = useState<ContactFormValues>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyId: "",
    jobTitle: "",
    linkedinUrl: "",
  });

  const create = useMutation({
    mutationFn: () =>
      api<{ id: string }>("/contacts", {
        method: "POST",
        body: JSON.stringify({
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim() || undefined,
          phone: values.phone.trim() || undefined,
          companyId: values.companyId || undefined,
          jobTitle: values.jobTitle.trim() || undefined,
          linkedinUrl: values.linkedinUrl.trim() || undefined,
        }),
      }),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["contacts"] });
      router.replace(`/app/contacts/${row.id}`);
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/app/contacts"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ←
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">New contact</h1>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <ContactForm
          mode="create"
          values={values}
          onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
          companies={companies.data?.data ?? []}
          onSubmit={() => create.mutate()}
          onCancel={() => router.push("/app/contacts")}
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
