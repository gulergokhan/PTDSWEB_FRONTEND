import { useEffect, useState } from "react";
import { api, type Stats } from "./api";

export default function DevDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState(60);
  const [logsPerStaff, setLogsPerStaff] = useState(10);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setMsg(null);
    try {
      const s = await api.getStats();
      setStats(s);
    } catch (e: any) {
      setMsg(e.message ?? "Stats cannot be shown.");
    }
  }

  useEffect(() => { load(); }, []);

  async function runSeed() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await api.seed(staff, logsPerStaff);
      setMsg(`Seed OK: staff=${r.staff}, logs=${r.totalLogs}`);
      await load();
    } catch (e: any) {
      setMsg(`Seed error: ${e.message ?? e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 560 }}>
      <h2>PTDS Dev Seed</h2>

      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <label>
          Staff:
          <input
            type="number"
            value={staff}
            onChange={(e) => setStaff(parseInt(e.target.value || "0", 10))}
            style={{ marginLeft: 6, width: 90 }}
          />
        </label>
        <label>
          Logs/Staff:
          <input
            type="number"
            value={logsPerStaff}
            onChange={(e) => setLogsPerStaff(parseInt(e.target.value || "0", 10))}
            style={{ marginLeft: 6, width: 90 }}
          />
        </label>
        <button onClick={runSeed} disabled={loading}>
          {loading ? "Seeding..." : "Run Seed"}
        </button>
      </div>

      {msg && <div style={{ marginBottom: 8 }}>{msg}</div>}

      <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
        <h3>Stats</h3>
        {stats ? (
          <ul>
            <li>Staff: {stats.staff}</li>
            <li>Attendance: {stats.attendance}</li>
          </ul>
        ) : (
          <div>Loading...</div>
        )}
      </div>
    </div>
  );
}
