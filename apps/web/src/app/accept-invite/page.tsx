"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  api,
  getPendingInviteToken,
  getStoredToken,
  setPendingInviteToken,
  setSession,
  setStoredTeamId,
} from "@/lib/api";

type AcceptResult = {
  team: { id: string; name: string };
  alreadyMember: boolean;
};

function AcceptInviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "done">("idle");
  const started = useRef(false);

  useEffect(() => {
    const fromUrl = searchParams.get("token");
    if (fromUrl) setPendingInviteToken(fromUrl);

    const token = fromUrl ?? getPendingInviteToken();
    if (!token) {
      setErr("Missing invite token. Open the link from your invitation email.");
      return;
    }

    if (!getStoredToken()) {
      setPendingInviteToken(token);
      router.replace(`/login?next=${encodeURIComponent("/accept-invite")}`);
      return;
    }

    if (started.current) return;
    started.current = true;

    let cancelled = false;
    (async () => {
      setStatus("working");
      try {
        const res = await api<AcceptResult>("/invites/accept", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        setPendingInviteToken(null);
        const t = getStoredToken();
        if (t) {
          setSession(t, res.team.id);
          setStoredTeamId(res.team.id);
        }
        setStatus("done");
        router.replace("/app");
      } catch (e) {
        started.current = false;
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Could not accept invite");
          setStatus("idle");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (err) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        {err}
      </div>
    );
  }

  if (status === "done") {
    return (
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">Redirecting…</p>
    );
  }

  return (
    <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">Accepting invitation…</p>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="text-center text-lg font-semibold">Workspace invitation</h1>
        <Suspense
          fallback={
            <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
          }
        >
          <AcceptInviteInner />
        </Suspense>
      </div>
    </div>
  );
}
