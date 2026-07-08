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
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401) redirect("/login");
    // Don't crash, just return empty so UI renders
    return { items: [] }; 
  }

  return res.json();
}

export default async function DashboardPage() {
  const data = await getLeaderboard();
  const factors = data.items || [];

  return (
    <>
      <div className="main-header">
        <div className="search-box">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input type="text" className="search-input" placeholder="Search experiment..." />
        </div>
        <div className="header-actions">
          <div className="btn-export">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            Export
          </div>
          <Link href="/lab" style={{ textDecoration: 'none' }}>
            <div className="btn-add">
              <span>+</span> Add new experiment
            </div>
          </Link>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-section" style={{ borderRight: "1px solid rgba(0,0,0,0.05)", paddingRight: "32px" }}>
          <div className="chart-header">
            <div className="chart-title">Robustness Performance</div>
            <div className="chart-controls">
              <div className="chart-btn">📅</div>
              <div className="chart-btn">↗</div>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "8px", position: "relative" }}>
            {/* Dummy Bar Chart visually matching the reference */}
            <div style={{ width: "100%", height: "1px", background: "rgba(0,0,0,0.1)", position: "absolute", bottom: "50%" }}></div>
            {[40, 60, 30, 80, 45, 100, 20, 70, 50, 90, 60].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, background: h === 100 ? "#111827" : "rgba(17,24,39,0.15)", borderRadius: "4px 4px 0 0", transition: "all 0.3s" }}></div>
            ))}
          </div>
        </div>
        
        <div className="chart-section">
          <div className="chart-header">
            <div className="chart-title">Avg. Sharpe Overview</div>
            <div className="chart-controls">
              <div className="chart-btn">⚯</div>
              <div className="chart-btn">⇅</div>
            </div>
          </div>
          <div className="sales-number">
            1.84 <span className="sales-badge">Top 5% ↗</span>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "20px", marginTop: "20px" }}>
             {/* Dummy Stacked blocks matching the right chart in the reference */}
             <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
               <div style={{ fontSize: "11px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Mom</div>
               <div style={{ height: "30px", background: "#d1d5db", borderRadius: "4px" }}></div>
               <div style={{ height: "40px", background: "#4b5563", borderRadius: "4px" }}></div>
               <div style={{ height: "50px", background: "#111827", borderRadius: "4px" }}></div>
             </div>
             <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
               <div style={{ fontSize: "11px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Rev</div>
               <div style={{ height: "20px", background: "#d1d5db", borderRadius: "4px" }}></div>
               <div style={{ height: "30px", background: "#4b5563", borderRadius: "4px" }}></div>
               <div style={{ height: "25px", background: "#111827", borderRadius: "4px" }}></div>
             </div>
             <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
               <div style={{ fontSize: "11px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>Val</div>
               <div style={{ height: "40px", background: "#d1d5db", borderRadius: "4px" }}></div>
               <div style={{ height: "20px", background: "#4b5563", borderRadius: "4px" }}></div>
               <div style={{ height: "60px", background: "#111827", borderRadius: "4px" }}></div>
             </div>
          </div>
        </div>
      </div>

      <div>
        <div className="list-header">
          <div className="list-title">
            Experiments <span className="list-count">{factors.length}</span>
          </div>
          <div className="list-filters">
            <div className="pill-filter">Pending 0</div>
            <div className="pill-filter">Running 0</div>
            <div className="pill-filter active">Completed {factors.length}</div>
            <div className="chart-btn" style={{ borderRadius: "20px" }}>⇅</div>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Factor ID</th>
              <th>Formula Name</th>
              <th>Universe</th>
              <th>Eval Date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {factors.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", paddingTop: "40px" }}>
                  No experiments found. Click "Add new experiment" to begin.
                </td>
              </tr>
            ) : (
              factors.map((factor: any) => (
                <tr key={factor.id}>
                  <td style={{ color: "#4b5563" }}>#{factor.id.split("-")[0]}</td>
                  <td>{factor.name}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "16px" }}>🇮🇳</span> NIFTY 50
                    </div>
                  </td>
                  <td style={{ color: "#4b5563" }}>
                    {new Date(factor.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td>
                    <div className="status-pill">
                      <div className={`status-dot ${factor.overall_score >= 0.8 ? 'green' : 'orange'}`}></div>
                      {factor.overall_score >= 0.8 ? "Robust" : "Overfit"}
                    </div>
                  </td>
                  <td>
                    <Link href={`/history/${factor.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
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
