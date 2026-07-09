import { getAuthToken } from "@/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function getLeaderboard() {
  const token = await getAuthToken();
  if (!token) redirect("/login");

  const res = await fetch(`${API_URL}/factors/leaderboard?sort=overall_score&order=desc`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401) redirect("/login");
    return { items: [] };
  }
  return res.json();
}

export default async function DashboardPage() {
  const data = await getLeaderboard();
  const factors = data.items || [];

  const avgSharpe = factors.length
    ? (factors.reduce((s: number, f: any) => s + (f.sharpe ?? 0), 0) / factors.length).toFixed(2)
    : "—";

  const robustCount = factors.filter((f: any) => f.overall_score >= 0.8).length;

  return (
    <>
      {/* ─── Page header ─── */}
      <div className="main-header">
        <div>
          <div className="al-tag" style={{ marginBottom: "6px" }}>DASHBOARD</div>
          <h1 className="al-title-md">Factor Leaderboard</h1>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" className="search-input" placeholder="Search factors..." />
          </div>
          <div className="btn-export">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            Export
          </div>
          <Link href="/lab" style={{ textDecoration: "none" }}>
            <div className="btn-add">+ New experiment</div>
          </Link>
        </div>
      </div>

      {/* ─── Stat strip ─── */}
      <div className="charts-container">
        {/* Robustness bars */}
        <div className="chart-section">
          <div className="chart-header">
            <div className="chart-title">Robustness Performance</div>
            <div className="chart-controls">
              <div className="chart-btn">↗</div>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "6px" }}>
            {(factors.length > 0 ? factors.slice(0, 12) : Array(12).fill({ overall_score: Math.random() })).map((f: any, i: number) => {
              const h = Math.round((f.overall_score ?? Math.random()) * 100);
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: h >= 80 ? "#1a1c18" : "rgba(26,28,24,0.15)",
                    transition: "all 0.3s",
                    minHeight: "4px",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Sharpe overview */}
        <div className="chart-section">
          <div className="chart-header">
            <div className="chart-title">Avg. Sharpe Ratio</div>
            <div className="chart-controls">
              <div className="chart-btn">⇅</div>
            </div>
          </div>
          <div className="sales-number">
            {avgSharpe}
            <span className="sales-badge">
              {robustCount}/{factors.length} Robust ↗
            </span>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "16px", marginTop: "16px" }}>
            {["Mom", "Rev", "Val"].map((label, i) => {
              const heights = [[30, 45, 55], [20, 35, 28], [40, 22, 62]];
              return (
                <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "#1a1c18", marginBottom: "4px", letterSpacing: "0.5px" }}>{label}</div>
                  {heights[i].map((h, j) => (
                    <div key={j} style={{ height: `${h}px`, background: j === 0 ? "#d9d9d6" : j === 1 ? "#8a9085" : "#1a1c18" }} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Experiments table ─── */}
      <div>
        <div className="list-header">
          <div className="list-title">
            Experiments <span className="list-count">{factors.length}</span>
          </div>
          <div className="list-filters">
            <div className="pill-filter">Pending 0</div>
            <div className="pill-filter">Running 0</div>
            <div className="pill-filter active">Completed {factors.length}</div>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Factor ID</th>
              <th>Name</th>
              <th>Universe</th>
              <th>Evaluated</th>
              <th>Sharpe</th>
              <th>Robustness</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {factors.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "#8a9085", padding: "48px 16px" }}>
                  No experiments yet. <Link href="/lab" style={{ color: "#1a1c18", fontWeight: 600, textDecoration: "underline" }}>Run your first one →</Link>
                </td>
              </tr>
            ) : (
              factors.map((factor: any) => (
                <tr key={factor.id}>
                  <td style={{ color: "#8a9085", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                    #{factor.id.split("-")[0]}
                  </td>
                  <td style={{ fontWeight: 600 }}>{factor.name}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🇮🇳</span>
                      <span style={{ fontSize: "12px", color: "#5c6059" }}>NIFTY 50</span>
                    </div>
                  </td>
                  <td style={{ color: "#8a9085", fontSize: "12px" }}>
                    {new Date(factor.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ fontFamily: "var(--font-serif)", fontSize: "16px" }}>
                    {factor.sharpe !== null ? factor.sharpe.toFixed(2) : "—"}
                  </td>
                  <td>
                    <div className="status-pill">
                      <div className={`status-dot ${factor.overall_score >= 0.8 ? "green" : "orange"}`}></div>
                      {factor.overall_score >= 0.8 ? "Robust" : "Overfit"}
                    </div>
                  </td>
                  <td>
                    <Link href={`/history/${factor.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <div className="btn-more">See details</div>
                        <div className="btn-icon">⋯</div>
                      </div>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
