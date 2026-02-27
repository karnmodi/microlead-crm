"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";

export default function NewCompanyPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api<{ id: string }>("/companies", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          website: website.trim() || undefined,
          industry: industry.trim() || undefined,
          description: description.trim() || undefined,
          employeeCount:
            employeeCount.trim() === "" ? undefined : Math.max(0, Number(employeeCount)),
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
      <h1 className="text-2xl font-semibold tracking-tight">New company</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Website
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="example.com"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Industry
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Employee count (approx.)
          <input
            type="number"
            min={0}
            value={employeeCount}
            onChange={(e) => setEmployeeCount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          />
        </label>
        {create.isError && (
          <p className="text-sm text-red-600">
            {create.error instanceof Error ? create.error.message : "Failed"}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {create.isPending ? "Creating…" : "Create"}
          </button>
          <Link
            href="/app/companies"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
