"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, getStoredTeamId, setStoredTeamId } from "@/lib/api";

type Membership = { team: { id: string; name: string } };

export function TeamSwitcher() {
  const qc = useQueryClient();
  const router = useRouter();
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(getStoredTeamId());
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: () => api<Membership[]>("/teams"),
  });

  const switchTeam = useMutation({
    mutationFn: (teamId: string) =>
      api("/users/me/preferred-team", {
        method: "PATCH",
        body: JSON.stringify({ teamId }),
      }),
    onSuccess: (_, teamId) => {
      setStoredTeamId(teamId);
      setCurrent(teamId);
      qc.clear();
      router.push("/app");
      router.refresh();
      setTimeout(() => window.location.reload(), 50);
    },
  });

  if (isLoading || !data?.length) {
    return (
      <span className="hidden text-xs text-zinc-500 md:inline">
        {current ? `Team ${current.slice(0, 8)}…` : "—"}
      </span>
    );
  }

  const label =
    data.find((m) => m.team.id === current)?.team.name ??
    data[0]?.team.name ??
    "Workspace";

  return (
    <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
      <span className="hidden md:inline">Workspace</span>
      <select
        value={current ?? data[0].team.id}
        onChange={(e) => switchTeam.mutate(e.target.value)}
        disabled={switchTeam.isPending}
        title={label}
        className="max-w-[10rem] truncate rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
      >
        {data.map((m) => (
          <option key={m.team.id} value={m.team.id}>
            {m.team.name}
          </option>
        ))}
      </select>
    </label>
  );
}
