import { getAuthToken } from "@/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import ClientDashboard from "./ClientDashboard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function getLeaderboard() {
  const token = await getAuthToken();
  if (!token) redirect("/login");

  const res = await fetch(`${API_URL}/factors/leaderboard?sort=overall_score&order=desc&page_size=100`, {
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

  return (
    <>
      {/* ─── Client Interactive Dashboard Widgets ─── */}
      <ClientDashboard factors={factors} />

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
