import { getAuthToken } from "@/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import ClientFactorDetail from "./ClientFactorDetail";
import AutoRefresh from "./AutoRefresh";

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

  const isPending = !backtest || !robustness || robustness.overall_score == null;

  return (
    <>
      {/* ─── Page header ─── */}
      <div className="main-header">
        <div>
          <Link href="/history" style={{ fontSize: "11px", color: "#8a9085", textDecoration: "none", letterSpacing: "0.5px", fontWeight: 500 }}>
            ← HISTORY
          </Link>
          <h1 className="al-title-md" style={{ marginTop: "8px" }}>{detail.name}</h1>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#8a9085", marginTop: "4px" }}>
            {detail.formula}
          </p>
        </div>
        <Link href="/lab" style={{ textDecoration: "none" }}>
          <div className="btn-add">+ New experiment</div>
        </Link>
      </div>

      {isPending ? (
        <div style={{
          border: "1px solid #1a1c18",
          background: "#fff",
          padding: "80px 24px",
          textAlign: "center",
          marginBottom: "32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px"
        }}>
          <div className="spinner" style={{
            width: "32px",
            height: "32px",
            border: "3px solid #ddddd9",
            borderTop: "3px solid #1a1c18",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>

          <div className="al-tag">ANALYSIS IN PROGRESS</div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 500, margin: 0 }}>
            Evaluating Factor Alpha
          </h2>
          <p style={{ fontSize: "12px", color: "var(--ink-light)", maxWidth: "440px", lineHeight: 1.6, margin: 0 }}>
            Running walk-forward backtest on NIFTY 50 price data and executing synthetic robustness stress perturbations. Results will load automatically.
          </p>

          <AutoRefresh />
        </div>
      ) : (
        <ClientFactorDetail
          detail={detail}
          backtest={backtest}
          robustness={robustness}
        />
      )}
    </>
  );
}
