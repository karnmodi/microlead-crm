"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api, setSession } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await api<{ accessToken: string; user: { preferredTeamId: string | null } }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
      setSession(res.accessToken, res.user.preferredTeamId);
      const next = searchParams.get("next");
      router.replace(next?.startsWith("/") ? next : "/app");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const next = searchParams.get("next");

  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-500">microlead-crm</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        No account?{" "}
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
          className="font-medium text-blue-600 dark:text-blue-400"
        >
          Register
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Suspense
        fallback={
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
