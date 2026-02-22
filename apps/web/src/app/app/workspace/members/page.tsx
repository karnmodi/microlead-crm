"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, getStoredTeamId } from "@/lib/api";

type MemberRow = {
  id: string;
  role: string;
  user: { id: string; email: string; name: string | null };
};

export default function WorkspaceMembersPage() {
  const qc = useQueryClient();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);

  useEffect(() => {
    setTeamId(getStoredTeamId());
    setReady(true);
  }, []);

  const members = useQuery({
    queryKey: ["team-members", teamId],
    enabled: !!teamId,
    queryFn: () => api<MemberRow[]>(`/teams/${teamId}/members`),
  });

  const addMember = useMutation({
    mutationFn: () =>
      api<MemberRow>(`/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), role }),
      }),
    onSuccess: () => {
      setEmail("");
      setFormErr(null);
      void qc.invalidateQueries({ queryKey: ["team-members", teamId] });
      void qc.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (e: Error) => setFormErr(e.message),
  });

  const sendInvite = useMutation({
    mutationFn: () =>
      api<{ acceptUrl: string; emailSent: boolean }>(`/teams/${teamId}/invites`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      }),
    onSuccess: (data) => {
      setInviteLink(data.acceptUrl);
      setFormErr(null);
    },
    onError: (e: Error) => setFormErr(e.message),
  });

  if (!ready) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading workspace…</p>;
  }

  if (!teamId) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Select a workspace in the header, then return here.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Workspace members</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Add people who already have an account, or send an invitation link.
        </p>
      </div>

      {formErr && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {formErr}
        </div>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Members</h2>
        {members.isLoading && (
          <p className="mt-4 text-sm text-zinc-500">Loading…</p>
        )}
        {members.data && (
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {members.data.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {m.user.name ?? m.user.email}
                </span>
                <span className="text-zinc-500">{m.user.email}</span>
                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {m.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Add existing user
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          They must already have registered. Use the same email as their account.
        </p>
        <form
          className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            addMember.mutate();
          }}
        >
          <div className="min-w-0 flex-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={addMember.isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {addMember.isPending ? "Adding…" : "Add member"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Invite by email</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Creates a link to share. If{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">RESEND_API_KEY</code> is set on
          the API, an email is sent too.
        </p>
        <form
          className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setInviteLink(null);
            sendInvite.mutate();
          }}
        >
          <div className="min-w-0 flex-1">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER")}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={sendInvite.isPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {sendInvite.isPending ? "Creating…" : "Create invite"}
          </button>
        </form>
        {inviteLink && (
          <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-xs break-all dark:bg-zinc-950">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Invitation link: </span>
            {inviteLink}
          </div>
        )}
      </section>
    </div>
  );
}
