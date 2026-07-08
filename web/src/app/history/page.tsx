import { getAuthToken } from "@/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function getLeaderboard() {
  const token = await getAuthToken();
  if (!token) {
    redirect("/login");
  }

  const res = await fetch(`${API_URL}/factors/leaderboard?sort=overall_score&order=desc`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
    <div className="tab-panel active">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 className="page-title">Experiment History</h1>
          <p className="page-subtitle">Track your past factors and their backtest/robustness results.</p>
        </div>
        <Link href="/lab">
          <button className="btn btn-primary">Run new experiment</button>
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {factors.length === 0 ? (
          <div className="card" style={{ textAlign: "center", color: "var(--text-muted)" }}>
            No experiments found. Run your first one in the Lab!
          </div>
        ) : (
          factors.map((factor: any) => (
            <Link href={`/history/${factor.id}`} key={factor.id} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="history-row">
                <div className="history-icon" style={{ background: factor.overall_score >= 0.8 ? "var(--green-soft)" : "var(--red-soft)", color: factor.overall_score >= 0.8 ? "var(--green)" : "var(--red)" }}>
                  {factor.overall_score >= 0.8 ? "✓" : "⚠"}
                </div>
                <div>
                  <div className="history-name">{factor.name}</div>
                  <div className="history-formula">{factor.formula}</div>
                </div>
                <div className="history-metrics">
                  <div>
                    <div className="history-metric-val">{factor.sharpe !== null ? factor.sharpe.toFixed(2) : "—"}</div>
                    <div className="history-metric-lbl">Sharpe</div>
                  </div>
                  <div>
                    <div className="history-metric-val">{factor.ic !== null ? factor.ic.toFixed(3) : "—"}</div>
                    <div className="history-metric-lbl">IC</div>
                  </div>
                  <div>
                    <div className="history-metric-val" style={{ color: factor.overall_score >= 0.8 ? "var(--green)" : "var(--red)" }}>
                      {factor.overall_score !== null ? factor.overall_score.toFixed(2) : "—"}
                    </div>
                    <div className="history-metric-lbl">Robustness</div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
