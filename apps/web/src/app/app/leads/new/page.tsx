"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const priorities = ["LOW", "MEDIUM", "HIGH"] as const;

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

  const [title, setTitle] = useState("");
  const [stageId, setStageId] = useState("");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [value, setValue] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [probability, setProbability] = useState("");
  const [source, setSource] = useState("");
  const [tags, setTags] = useState("");
  const [expectedClose, setExpectedClose] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api<{ id: string }>("/leads", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          stageId,
          priority,
          value: value.trim() === "" ? undefined : Number(value),
          companyId: companyId || undefined,
          contactId: contactId || undefined,
          description: description.trim() || undefined,
          currency: currency.trim() || "USD",
          probability:
            probability.trim() === ""
              ? undefined
              : Math.min(100, Math.max(0, Number(probability))),
          source: source.trim() || undefined,
          tags: tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          expectedCloseDate: expectedClose ? `${expectedClose}T12:00:00.000Z` : undefined,
        }),
      }),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["leads", "kanban"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      router.replace(`/app/leads/${row.id}`);
    },
  });

  useEffect(() => {
    const first = stages.data?.[0]?.id;
    if (first && !stageId) setStageId(first);
  }, [stages.data, stageId]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">New lead</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Title
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Stage
          <select
            required
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          >
            {stages.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Priority
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          >
            {priorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Value (optional)
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Company
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          >
            <option value="">— None —</option>
            {companies.data?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Contact
          <select
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          >
            <option value="">— None —</option>
            {contacts.data?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Currency
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm uppercase dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Win probability (0–100)
            <input
              type="number"
              min={0}
              max={100}
              value={probability}
              onChange={(e) => setProbability(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
            />
          </label>
        </div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Source
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Expected close
          <input
            type="date"
            value={expectedClose}
            onChange={(e) => setExpectedClose(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Tags (comma-separated)
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
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
            disabled={create.isPending || !stageId}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {create.isPending ? "Creating…" : "Create"}
          </button>
          <Link
            href="/app/leads/kanban"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
