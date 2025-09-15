const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export type Stats = { staff: number; attendance: number };

export const api = {
  getStats: () => request<Stats>("/api/dev/stats"),
  seed: (staff = 60, logsPerStaff = 10) =>
    request<{ staff: number; logsPerStaff: number; totalLogs: number }>(
      `/api/dev/seed?staff=${staff}&logsPerStaff=${logsPerStaff}`,
      { method: "POST" }
    ),
};
