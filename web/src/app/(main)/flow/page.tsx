"use client";

import React, { useState, useEffect } from "react";
import Script from "next/script";

interface NodeDetail {
  title: string;
  color: string;
  desc: string;
  bullets: string[];
  subDiagram: string[];
  techNote: string;
}

const nodeDetails: Record<string, NodeDetail> = {
  client: {
    title: "Next.js Frontend",
    color: "#1a1c18",
    desc: "The browser-facing application built with Next.js (App Router) and TypeScript. Deployed to Vercel for zero-ops hosting with automatic preview deployments on every pull request.",
    bullets: [
      "Leaderboard — sortable factor ranking table",
      "Factor Lab — DSL editor, equity curve chart, stress test UI",
      "Factor Detail — metrics grid, robustness breakdown",
      "History — experiment run log",
    ],
    subDiagram: ["Browser", "Next.js App Router", "React Components", "Vercel CDN"],
    techNote:
      "Why Next.js? SSR for initial leaderboard load, React ecosystem for charts, TypeScript for type-safety at the API boundary.",
  },
  api: {
    title: "FastAPI REST API",
    color: "#1a1c18",
    desc: "The Python backend that handles all HTTP requests. Uses async SQLAlchemy for non-blocking database queries and dependency injection for clean separation of concerns.",
    bullets: [
      "POST /experiments — create a new experiment",
      "POST /factors — compile and store a DSL formula",
      "POST /factors/{id}/backtest — enqueue backtest job",
      "GET /factors/leaderboard — paginated, sortable results",
      "GET /factors/{id}/robustness — stress test breakdown",
    ],
    subDiagram: ["Request", "JWT Auth", "DSL Validator", "SQLAlchemy", "Response"],
    techNote:
      "Why FastAPI? Native async support, automatic OpenAPI docs, Pydantic validation at zero extra cost.",
  },
  worker: {
    title: "Celery Worker",
    color: "#1a1c18",
    desc: "A separate Python process that executes long-running computation jobs without blocking the API. Communicates via Redis as a message broker. Results are written back to PostgreSQL.",
    bullets: [
      "run_backtest(factor_id) — full walk-forward evaluation",
      "run_robustness(factor_id) — 6 stress test iterations",
      "Runs in asyncio.to_thread to avoid blocking the event loop",
      "Stores equity_curve + perturbation_grid as JSON in Postgres",
    ],
    subDiagram: ["Redis Queue", "Celery Worker", "Engine", "PostgreSQL"],
    techNote:
      "Why Celery? Backtest latency is 2–4 seconds — a measured problem. Single queue, no premature optimisation.",
  },
  postgres: {
    title: "PostgreSQL — Metadata DB",
    color: "#1a1c18",
    desc: "Stores all relational metadata: users, experiments, factors, and their computed results. Hosted on Neon (serverless Postgres). Alembic manages schema migrations.",
    bullets: [
      "users — email, name, created_at",
      "experiments — name, status (PENDING/RUNNING/FAILED/COMPLETED)",
      "factors — name, formula (DSL), experiment FK",
      "backtest_results — Sharpe, IC, equity_curve JSON",
      "robustness_results — scores, failure_reasons JSON",
    ],
    subDiagram: ["SQLAlchemy ORM", "Alembic Migrations", "Neon Serverless", "JSONB Columns"],
    techNote:
      "Why PostgreSQL? Production-grade ACID guarantees, JSONB support for equity curves, and Neon's serverless model has zero cold-start penalty for reads.",
  },
  duckdb: {
    title: "DuckDB — Analytical DB",
    color: "#1a1c18",
    desc: "An embedded columnar database storing all OHLCV market data. Optimised for fast rolling-window computations across 50 tickers without a database server.",
    bullets: [
      "ohlcv — ticker, date, open, high, low, close, volume, adj_close",
      "universe — point-in-time NIFTY 50 constituent history",
      "factor_values — computed daily factor scores per ticker",
      "Data source: Yahoo Finance via yfinance",
    ],
    subDiagram: ["Yahoo Finance", "Validation Pipeline", "DuckDB File", "Engine Reads"],
    techNote:
      "Why DuckDB? It's columnar — a rolling 20-day mean across 50 tickers is a scan, not a lookup. PostgreSQL is row-oriented and optimised for OLTP, not analytical scans.",
  },
  dsl: {
    title: "Factor DSL Compiler",
    color: "#1a1c18",
    desc: "A domain-specific language that lets users define factor formulas like Momentum(20) / Volatility(10) without writing arbitrary Python. Safer, more auditable, and enables static look-ahead bias detection.",
    bullets: [
      "Lexer — tokenises the formula string",
      "Parser — builds an Abstract Syntax Tree (AST)",
      "Static Validator — detects look-ahead bias, invalid windows",
      "pandas Codegen — compiles AST to a vectorised pandas callable",
    ],
    subDiagram: ["Formula string", "Lexer → Tokens", "Parser → AST", "Validator", "pandas Callable"],
    techNote:
      "Why a DSL? Look-ahead bias detection is tractable on an AST. In arbitrary Python it's NP-hard.",
  },
};

export default function FlowPage() {
  const [activeNode, setActiveNode] = useState<NodeDetail | null>(null);
  const [chartReady, setChartReady] = useState(false);

  const initChart = () => {
    if (typeof window === "undefined" || !(window as any).ApexCharts) return;
    const el = document.querySelector("#flow-chart");
    if (!el || (el as any)._chartRendered) return;
    (el as any)._chartRendered = true;

    const candleData: any[] = [];
    const trendData: any[] = [];
    const volumeData: any[] = [];
    let baseValue = 15;
    let time = new Date("2026-01-01").getTime();

    for (let i = 0; i < 70; i++) {
      const trendBias = i > 15 ? 0.4 : -0.6;
      const open = baseValue + (Math.random() * 2 - 1);
      const high = open + Math.random() * 1.5;
      const low = open - Math.random() * 1.5;
      const close = low + Math.random() * (high - low);
      baseValue = close + trendBias;
      candleData.push({ x: time, y: [open, high, low, close] });
      trendData.push({ x: time, y: close });
      volumeData.push({ x: time, y: Math.floor(Math.random() * 50) + 10 });
      time += 86400000;
    }

    const options = {
      series: [
        { name: "Price", type: "candlestick", data: candleData },
        { name: "Trend", type: "line", data: trendData },
        { name: "Volume", type: "bar", data: volumeData },
      ],
      chart: {
        height: "100%",
        type: "line",
        toolbar: { show: false },
        animations: { enabled: false },
        background: "transparent",
      },
      stroke: { width: [1, 2, 0], curve: "smooth", dashArray: [0, 5, 0] },
      colors: ["#8a9085", "#1a1c18", "#ddddd9"],
      plotOptions: {
        candlestick: {
          colors: { upward: "#8a9085", downward: "#5c6059" },
          wick: { useFillColor: true },
        },
      },
      yaxis: [
        { seriesName: "Price", show: false, labels: { show: false }, axisBorder: { show: false } },
        { seriesName: "Trend", show: false, labels: { show: false } },
        { seriesName: "Volume", show: false, labels: { show: false }, max: 300 },
      ],
      xaxis: {
        type: "datetime",
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false },
        tooltip: { enabled: false },
      },
      grid: {
        borderColor: "rgba(26,28,24,0.06)",
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: true } },
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      tooltip: { shared: true, intersect: false },
    };

    const chart = new (window as any).ApexCharts(el, options);
    chart.render();
  };

  useEffect(() => {
    if (chartReady) {
      setTimeout(initChart, 100);
    }
  }, [chartReady]);

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/apexcharts"
        onLoad={() => setChartReady(true)}
      />

      <div className="sardar-flow-page">
        {/* ─── Hero + chart ─── */}
        <div style={{ textAlign: "center", paddingBottom: "40px" }}>
          <div className="al-tag" style={{ marginBottom: "10px" }}>GET QUANT ANALYSIS REPORT</div>
          <h1 className="al-title-xl" style={{ marginBottom: "6px" }}>AlphaLab — behind the scene</h1>
          <p className="al-body" style={{ maxWidth: "480px", margin: "0 auto 28px" }}>
            How your alpha expression travels from a single formula string to a fully evaluated, stress-tested factor score.
          </p>
          <div className="flow-chart-wrapper">
            <div id="flow-chart" style={{ height: "100%" }} />
          </div>
        </div>

        {/* ─── Partner logos ─── */}
        <div className="sardar-border-y" style={{ display: "flex", justifyContent: "space-around", padding: "14px 0", fontSize: "11px", fontWeight: 600, color: "#5c6059", background: "#fff" }}>
          {["Bloomberg", "FX Blue", "Fundseeder", "Vantage", "ATC Markets", "Swissquote"].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>

        <div className="sardar-grid-divider" />

        {/* ─── Pipeline components ─── */}
        <div id="pipeline" style={{ padding: "32px 0" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div className="al-tag" style={{ marginBottom: "8px" }}>PIPELINE FLOW</div>
            <h2 className="al-title-lg">Solutions designed for<br />description of the flow</h2>
          </div>

          <div style={{ border: "1px solid #1a1c18", display: "grid", gridTemplateColumns: "1fr 1fr", background: "#fff" }}>
            {[
              { key: "client", label: "01", name: "Next.js Frontend Client", desc: "Renders interactive dashboard, parses DSL formulas, and displays live backtest curves." },
              { key: "api", label: "02", name: "FastAPI Gateway Router", desc: "Authenticates tokens, enforces rate limits, parses payloads, and exposes JSON endpoints." },
              { key: "worker", label: "03", name: "Celery Worker Node", desc: "Executes concurrent computation pipelines across distributed queue listener threads." },
              { key: "duckdb", label: "04", name: "DuckDB Analytic DB", desc: "High-performance columnar database querying NIFTY 50 price histories at sub-second speed." },
            ].map((item, idx) => (
              <div
                key={item.key}
                onClick={() => setActiveNode(nodeDetails[item.key])}
                style={{
                  padding: "28px",
                  borderRight: idx % 2 === 0 ? "1px solid #1a1c18" : "none",
                  borderBottom: idx < 2 ? "1px solid #1a1c18" : "none",
                  cursor: "pointer",
                }}
                className="sardar-flow-cell"
              >
                <div className="al-tag" style={{ color: "#0f766e", marginBottom: "6px" }}>Component {item.label}</div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 500, marginBottom: "8px" }}>
                  {item.name}
                </div>
                <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="sardar-grid-divider" />

        {/* ─── Globe / user input ─── */}
        <div id="inputting" style={{ padding: "32px 0" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div className="al-tag" style={{ marginBottom: "8px" }}>PARTNERS</div>
            <h2 className="al-title-lg">Global presence<br />in key financial hubs</h2>
          </div>

          <div style={{ border: "1px solid #1a1c18", background: "#fff", padding: "40px", textAlign: "center", marginBottom: "0" }}>
            <svg width="200" height="200" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#1a1c18" strokeWidth="1.2" />
              <ellipse cx="60" cy="60" rx="50" ry="20" fill="none" stroke="#8a9085" strokeWidth="0.8" />
              <ellipse cx="60" cy="60" rx="50" ry="40" fill="none" stroke="#8a9085" strokeWidth="0.8" />
              <ellipse cx="60" cy="60" rx="20" ry="50" fill="none" stroke="#8a9085" strokeWidth="0.8" />
              <ellipse cx="60" cy="60" rx="40" ry="50" fill="none" stroke="#8a9085" strokeWidth="0.8" />
              <line x1="10" y1="60" x2="110" y2="60" stroke="#8a9085" strokeWidth="0.8" />
              <line x1="60" y1="10" x2="60" y2="110" stroke="#8a9085" strokeWidth="0.8" />
              {/* Location dots */}
              <circle cx="30" cy="60" r="2.5" fill="#1a1c18" />
              <circle cx="75" cy="52" r="2.5" fill="#1a1c18" />
            </svg>
          </div>

          <div className="sardar-border-y" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "16px 0", background: "#fff", textAlign: "center" }}>
            {[
              { city: "London", desc: "Metadata Index" },
              { city: "Dubai", desc: "Redis Cache layer" },
              { city: "Frankfurt", desc: "DuckDB Parquet file" },
              { city: "Singapore", desc: "Local CSV exports" },
            ].map((loc, i, arr) => (
              <div key={loc.city} style={{ borderRight: i < arr.length - 1 ? "1px solid #ddddd9" : "none", padding: "0 12px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#8a9085", marginBottom: "4px" }}>{loc.city}</div>
                <div style={{ fontSize: "13px", fontWeight: 500 }}>{loc.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="sardar-grid-divider" />

        {/* ─── Performance / data flow cards ─── */}
        <div id="dataflow" style={{ padding: "32px 0" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div className="al-tag" style={{ marginBottom: "8px" }}>OUR SYSTEMS</div>
            <h2 className="al-title-lg">An inside look at<br />how we help build wealth</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", border: "1px solid #1a1c18" }}>
            {[
              {
                name: "SCFX 1.0 (Balanced)",
                desc: "Our most robust, reliable & consistent system for wealth building.",
                rows: [
                  "Avg monthly return: 6.13%*",
                  "100% winning months",
                  "Max drawdown: 12.58%*",
                  "30% performance fee",
                  "No management fee",
                ],
              },
              {
                name: "SCFX 2.0 (Aggressive)",
                desc: "Higher risk / higher reward. Built for investors who can tolerate drawdown.",
                rows: [
                  "Minimum investment: $2,500",
                  "Balanced approach (FX market)",
                  "Let AI handle notes & actions",
                  "Avg monthly return: 8.12%*",
                  "100% winning months",
                ],
              },
            ].map((card, i) => (
              <div key={card.name} style={{ padding: "28px", borderRight: i === 0 ? "1px solid #ddddd9" : "none" }}>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 500, marginBottom: "6px" }}>
                  {card.name}
                </div>
                <p style={{ fontSize: "12px", color: "#8a9085", marginBottom: "20px" }}>{card.desc}</p>
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "11px", marginBottom: "20px", fontSize: "12px", letterSpacing: "0.3px" }}
                >
                  Review factor metadata
                </button>
                <table className="sardar-metric-table">
                  <tbody>
                    {card.rows.map((row) => (
                      <tr key={row}>
                        <td>{row}</td>
                        <td className="btn-plus">+</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Node detail drawer ─── */}
      <div
        className={`node-detail${activeNode ? " open" : ""}`}
        onClick={(e) => { if (e.target === e.currentTarget) setActiveNode(null); }}
      >
        <div className="node-detail-card">
          <button className="node-detail-close" onClick={() => setActiveNode(null)}>✕</button>
          {activeNode && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: "8px", height: "8px", background: "#1a1c18" }} />
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "24px", fontWeight: 500, margin: 0 }}>
                  {activeNode.title}
                </h2>
              </div>
              <p style={{ fontSize: "13px", color: "#5c6059", lineHeight: 1.6, marginBottom: "20px" }}>
                {activeNode.desc}
              </p>
              <div className="sub-diagram">
                {activeNode.subDiagram.map((s, i, arr) => (
                  <React.Fragment key={i}>
                    <span className="sub-box">{s}</span>
                    {i < arr.length - 1 && <span className="sub-arrow">→</span>}
                  </React.Fragment>
                ))}
              </div>
              <div className="detail-sub">What it does</div>
              <ul style={{ fontSize: "13px", paddingLeft: "18px", marginBottom: "20px", lineHeight: 1.7, color: "#1a1c18" }}>
                {activeNode.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
              <div className="detail-sub">Engineering decision</div>
              <p style={{ fontSize: "12px", color: "#8a9085", fontStyle: "italic", lineHeight: 1.6 }}>
                {activeNode.techNote}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
