"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiOrigin, getStoredTeamId, getStoredToken } from "@/lib/api";

type Row = { id: string; filename: string | null; size: number; mimeType: string; createdAt: string };

export function AttachmentSection({
  parentType,
  parentId,
  queryKey,
}: {
  parentType: "LEAD" | "CONTACT" | "COMPANY";
  parentId: string;
  queryKey: unknown[];
}) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: [...queryKey, "attachments"],
    queryFn: async () => {
      const t = getStoredToken();
      const team = getStoredTeamId();
      const res = await fetch(
        `${getApiOrigin()}/v1/attachments?parentType=${parentType}&parentId=${encodeURIComponent(parentId)}`,
        { headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(team ? { "X-Team-Id": team } : {}) } },
      );
      if (!res.ok) throw new Error("Failed to load attachments");
      return res.json() as Promise<Row[]>;
    },
    enabled: !!parentId,
  });

  const remove = useMutation({
    mutationFn: (id: string) => {
      const t = getStoredToken();
      const team = getStoredTeamId();
      return fetch(`${getApiOrigin()}/v1/attachments/${id}`, {
        method: "DELETE",
        headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(team ? { "X-Team-Id": team } : {}) },
      }).then((r) => {
        if (!r.ok) throw new Error("Delete failed");
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const t = getStoredToken();
    const team = getStoredTeamId();
    const fd = new FormData();
    fd.append("file", file);
    fd.append("parentType", parentType);
    fd.append("parentId", parentId);
    const res = await fetch(`${getApiOrigin()}/v1/attachments/upload`, {
      method: "POST",
      headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(team ? { "X-Team-Id": team } : {}) },
      body: fd,
    });
    if (!res.ok) throw new Error("Upload failed");
    void qc.invalidateQueries({ queryKey });
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Attachments</h2>
      <label className="mt-3 inline-block">
        <span className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:hover:bg-zinc-900">
          Upload file
        </span>
        <input type="file" className="sr-only" onChange={(e) => void onFile(e)} />
      </label>
      <ul className="mt-4 space-y-2">
        {list.data?.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
          >
            <button
              type="button"
              className="text-left text-blue-600 hover:underline dark:text-blue-400"
              onClick={async () => {
                const t = getStoredToken();
                const team = getStoredTeamId();
                const res = await fetch(`${getApiOrigin()}/v1/attachments/${a.id}/download`, {
                  headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(team ? { "X-Team-Id": team } : {}) },
                });
                if (!res.ok) return;
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const el = document.createElement("a");
                el.href = url;
                el.download = a.filename ?? "download";
                el.click();
                URL.revokeObjectURL(url);
              }}
            >
              {a.filename ?? "file"}
            </button>
            <span className="text-xs text-zinc-500">{Math.round(a.size / 1024)} KB</span>
            <button
              type="button"
              className="text-xs text-red-600 hover:underline"
              onClick={() => remove.mutate(a.id)}
            >
              Remove
            </button>
          </li>
        ))}
        {list.data?.length === 0 && <li className="text-sm text-zinc-500">No files yet.</li>}
      </ul>
    </section>
  );
}
