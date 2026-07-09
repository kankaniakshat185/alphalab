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
    throw new Error("Failed to fetch leaderboard");
  }
  return res.json();
}

export default async function HistoryPage() {
  const data = await getLeaderboard();
  const factors = data.items || [];

  return (
    <>
      {/* Page header */}
      <div className="main-header">
        <div>
          <div className="al-tag" style={{ marginBottom: "6px" }}>EXPERIMENT HISTORY</div>
          <h1 className="al-title-md">All Experiments</h1>
          <p className="page-subtitle">Track past alpha factors and their backtest & robustness results.</p>
        </div>
        <Link href="/lab" style={{ textDecoration: "none" }}>
          <div className="btn-add">+ New experiment</div>
        </Link>
      </div>

      {/* Table header strip */}
      <div style={{ border: "1px solid #1a1c18", borderBottom: "none", background: "#fbfbfa" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px 120px", padding: "10px 16px", gap: "16px" }}>
          <span className="al-tag">Factor</span>
          <span className="al-tag">Formula</span>
          <span className="al-tag">Evaluated</span>
          <span className="al-tag">Sharpe / IC</span>
          <span className="al-tag">Robustness</span>
        </div>
      </div>

      {/* Rows */}
      <div>
        {factors.length === 0 ? (
          <div style={{
            border: "1px solid #1a1c18",
            background: "#fff",
            padding: "60px 20px",
            textAlign: "center",
            color: "#8a9085",
            fontSize: "13px",
          }}>
            No experiments yet.{" "}
            <Link href="/lab" style={{ color: "#1a1c18", fontWeight: 600, textDecoration: "underline" }}>
              Run your first one →
            </Link>
          </div>
        ) : (
          factors.map((factor: any) => (
            <Link href={`/history/${factor.id}`} key={factor.id} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="history-row" style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 120px 120px",
                gap: "16px",
                padding: "16px",
                border: "1px solid #ddddd9",
                borderTop: "1px solid #1a1c18",
                background: "#fff",
                transition: "background 0.15s",
                alignItems: "center",
              }}>
                {/* Name + ID */}
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "2px" }}>{factor.name}</div>
                  <div style={{ fontSize: "10px", color: "#8a9085", fontFamily: "var(--font-mono)" }}>#{factor.id.split("-")[0]}</div>
                </div>

                {/* Formula */}
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#5c6059", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {factor.formula || "—"}
                </div>

                {/* Date */}
                <div style={{ fontSize: "12px", color: "#8a9085" }}>
                  {new Date(factor.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>

                {/* Metrics */}
                <div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "18px", color: "#1a1c18" }}>
                    {factor.sharpe !== null ? factor.sharpe.toFixed(2) : "—"}
                  </div>
                  <div style={{ fontSize: "9px", letterSpacing: "1px", textTransform: "uppercase", color: "#8a9085", marginTop: "1px" }}>
                    Sharpe
                  </div>
                </div>

                {/* Robustness */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: factor.overall_score >= 0.8 ? "#22c55e" : "#f97316",
                    }} />
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#1a1c18" }}>
                      {factor.overall_score >= 0.8 ? "Robust" : "Overfit"}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#8a9085", marginTop: "2px" }}>
                    {factor.overall_score !== null ? (factor.overall_score * 100).toFixed(0) + "%" : "—"}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
