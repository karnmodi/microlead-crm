const base = () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
  const res = await fetch(`${base()}/v1${path}`, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : res.statusText;
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return data as T;
}
