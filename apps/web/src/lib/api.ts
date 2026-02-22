/**
 * API origin only (scheme + host + optional port). No path, no `/v1`.
 * Strips a trailing `/v1` so misconfigured `NEXT_PUBLIC_API_URL=http://localhost:3001/v1`
 * does not produce `/v1/v1/...` (404 on Nest).
 */
export function getApiOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").trim();
  return raw.replace(/\/+$/, "").replace(/\/v1$/i, "");
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ml_token");
}

export function getStoredTeamId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ml_team_id");
}

export function setSession(token: string, teamId: string | null) {
  localStorage.setItem("ml_token", token);
  if (teamId) localStorage.setItem("ml_team_id", teamId);
}

export function setStoredTeamId(teamId: string) {
  localStorage.setItem("ml_team_id", teamId);
}

export const INVITE_TOKEN_KEY = "ml_invite_token";

export function getPendingInviteToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(INVITE_TOKEN_KEY);
}

export function setPendingInviteToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(INVITE_TOKEN_KEY, token);
  else localStorage.removeItem(INVITE_TOKEN_KEY);
}

export function clearSession() {
  localStorage.removeItem("ml_token");
  localStorage.removeItem("ml_team_id");
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const t = getStoredToken();
  if (t) headers.set("Authorization", `Bearer ${t}`);
  const team = getStoredTeamId();
  if (team) headers.set("X-Team-Id", team);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${getApiOrigin()}/v1${path}`, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    let msg = res.statusText;
    if (typeof data === "object" && data && "message" in data) {
      const m = (data as { message: unknown }).message;
      msg = Array.isArray(m) ? m.join(", ") : String(m);
    }
    const code =
      typeof data === "object" && data && "code" in data
        ? String((data as { code: unknown }).code)
        : "";
    const err = new Error(msg || `HTTP ${res.status}`) as Error & { code?: string };
    if (code) err.code = code;
    throw err;
  }
  return data as T;
}
