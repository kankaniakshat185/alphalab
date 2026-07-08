import { getAuthToken } from "@/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import ClientCharts from "./ClientCharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function getFactorData(id: string) {
  const token = await getAuthToken();
  if (!token) redirect("/login");

  const headers = { Authorization: `Bearer ${token}` };

  const [detailRes, backtestRes, robustRes] = await Promise.all([
    fetch(`${API_URL}/factors/${id}`, { headers, cache: "no-store" }),
    fetch(`${API_URL}/factors/${id}/backtest`, { headers, cache: "no-store" }),
    fetch(`${API_URL}/factors/${id}/robustness`, { headers, cache: "no-store" }),
  ]);

  if (!detailRes.ok) throw new Error("Failed to load factor details");

  const detail = await detailRes.json();
  const backtest = backtestRes.ok ? await backtestRes.json() : null;
  const robustness = robustRes.ok ? await robustRes.json() : null;

  return { detail, backtest, robustness };
}

export default async function FactorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { detail, backtest, robustness } = await getFactorData(id);

  return (
    <div className="tab-panel active">
      <div style={{ marginBottom: "20px" }}>
        <Link href="/history" style={{ fontSize: "12px", color: "var(--text-muted)", textDecoration: "none" }}>
          ← Back to Leaderboard
        </Link>
        <h1 className="page-title" style={{ marginTop: "10px" }}>{detail.name}</h1>
        <p className="page-subtitle" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Formula: {detail.formula}
        </p>
      </div>

      <div className="grid-4" style={{ marginBottom: "24px" }}>
        <div className="metric-tile">
          <div className="metric-tile-label">Sharpe Ratio</div>
          <div className="metric-tile-val" style={{ color: detail.metrics.sharpe >= 1.0 ? "var(--green)" : "var(--text-primary)" }}>
            {detail.metrics.sharpe !== null ? detail.metrics.sharpe.toFixed(2) : "—"}
          </div>
        </div>
        <div className="metric-tile">
          <div className="metric-tile-label">Information Coefficient</div>
          <div className="metric-tile-val">
            {detail.metrics.ic !== null ? detail.metrics.ic.toFixed(3) : "—"}
          </div>
        </div>
        <div className="metric-tile">
          <div className="metric-tile-label">Max Drawdown</div>
          <div className="metric-tile-val" style={{ color: "var(--red)" }}>
            {detail.metrics.max_drawdown !== null ? `${(detail.metrics.max_drawdown * 100).toFixed(1)}%` : "—"}
          </div>
        </div>
        <div className="metric-tile">
          <div className="metric-tile-label">Robustness Score</div>
          <div className="metric-tile-val" style={{ color: detail.metrics.overall_score >= 0.8 ? "var(--green)" : "var(--red)" }}>
            {detail.metrics.overall_score !== null ? detail.metrics.overall_score.toFixed(2) : "—"}
          </div>
        </div>
      </div>

      {robustness && robustness.dominant_failure && (
        <div className="card" style={{ marginBottom: "24px", background: "var(--red-soft)", borderColor: "var(--red)", padding: "16px" }}>
          <h3 style={{ fontSize: "14px", color: "var(--red)", marginBottom: "8px" }}>
            ⚠ Robustness Failure: {robustness.dominant_failure}
          </h3>
          <p style={{ fontSize: "13px", color: "#7f1d1d" }}>{robustness.explanation}</p>
          {robustness.recommendations?.length > 0 && (
            <ul style={{ fontSize: "12px", color: "#7f1d1d", marginTop: "10px", paddingLeft: "20px" }}>
              {robustness.recommendations.map((rec: string, i: number) => <li key={i}>{rec}</li>)}
            </ul>
          )}
        </div>
      )}

      <ClientCharts 
        equityCurve={backtest?.equity_curve || []} 
        robustnessGrid={robustness?.grid || []} 
      />
    </div>
  );
}
