"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Factor {
  id: string;
  name: string;
  formula: string;
  created_at: string;
  sharpe: number | null;
  ic: number | null;
  overall_score: number | null;
}

interface ClientDashboardProps {
  factors: Factor[];
}

const ROBUSTNESS_THRESHOLD = 0.8;

// Dynamic Research Grade formula
function computeResearchGrade(passRate: number, avgSharpe: number, totalCount: number): string {
  if (totalCount === 0) return "Inception (D)";
  if (passRate >= 60 && avgSharpe >= 1.0) return "Institutional (A)";
  if (passRate >= 40 && avgSharpe >= 0.5) return "Professional (B)";
  return "Development (C)";
}

function formatDateNeutral(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getUTCDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getUTCMonth()];
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} at ${hours}:${minutes}`;
}

export default function ClientDashboard({ factors }: ClientDashboardProps) {
  const router = useRouter();
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  // 1. Calculate stats dynamically
  const stats = useMemo(() => {
    const total = factors.length;
    const running = factors.filter((f) => f.overall_score === null).length;
    const completed = total - running;
    const robust = factors.filter(
      (f) => f.overall_score !== null && f.overall_score >= ROBUSTNESS_THRESHOLD
    ).length;

    const completedFactors = factors.filter((f) => f.overall_score !== null);

    // Find best Sharpe this week
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentFactors = completedFactors.filter(
      (f) => new Date(f.created_at) >= sevenDaysAgo && f.sharpe !== null
    );
    const bestSharpeThisWeek = recentFactors.length
      ? Math.max(...recentFactors.map((f) => f.sharpe ?? 0))
      : null;

    const sumSharpe = completedFactors.reduce((acc, f) => acc + (f.sharpe ?? 0), 0);
    const avgSharpe = completed > 0 ? sumSharpe / completed : 0;

    const sumIC = completedFactors.reduce((acc, f) => acc + (f.ic ?? 0), 0);
    const avgIC = completed > 0 ? sumIC / completed : 0;

    const passRate = completed > 0 ? (robust / completed) * 100 : 0;
    const grade = computeResearchGrade(passRate, avgSharpe, total);

    return {
      total,
      running,
      completed,
      robust,
      avgSharpe,
      avgIC,
      passRate,
      grade,
      bestSharpeThisWeek,
    };
  }, [factors]);

  // 2. Prepare Factor Landscape Data
  const scatterData = useMemo(() => {
    return factors
      .filter((f) => f.sharpe !== null)
      .map((f) => {
        let status = "Running";
        let fill = "#8a9085"; // Gray
        if (f.overall_score !== null) {
          if (f.overall_score >= ROBUSTNESS_THRESHOLD) {
            status = "Passed";
            fill = "#0f766e"; // Green
          } else if (f.overall_score > 0.0) {
            status = "Needs Review";
            fill = "#d97706"; // Amber
          } else {
            status = "Failed";
            fill = "#b91c1c"; // Red
          }
        }
        // Add deterministic pseudo-random jitter based on ID so identical points don't overlap completely
        const hashStr = f.id.toString();
        let hash = 0;
        for (let i = 0; i < hashStr.length; i++) {
          hash = hashStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const pseudoRandom1 = (Math.abs(hash) % 1000) / 1000;
        const pseudoRandom2 = (Math.abs(hash >> 2) % 1000) / 1000;
        
        const jitterX = (pseudoRandom1 - 0.5) * 1.5; // +/- 0.75% jitter
        const jitterY = (pseudoRandom2 - 0.5) * 0.015; // +/- 0.0075 jitter

        return {
          id: f.id,
          name: f.name,
          x: ((f.overall_score ?? 0) * 100) + jitterX, 
          y: (f.sharpe ?? 0) + jitterY,                 
          ic: f.ic ?? 0,
          status,
          fill,
        };
      });
  }, [factors]);


  // Custom tool-tip component for ScatterPlot
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: "#1a1c18",
          color: "#fff",
          padding: "10px 14px",
          border: "1px solid #1a1c18",
          fontSize: "11px",
          fontFamily: "var(--font-mono)",
          lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 600, borderBottom: "1px solid #3a3d37", paddingBottom: "4px", marginBottom: "6px" }}>
            {data.name}
          </div>
          <div>Sharpe: <span style={{ float: "right", paddingLeft: "16px" }}>{data.y.toFixed(2)}</span></div>
          <div>Robustness: <span style={{ float: "right", paddingLeft: "16px" }}>{data.x.toFixed(0)}%</span></div>
          <div>IC: <span style={{ float: "right", paddingLeft: "16px" }}>{data.ic.toFixed(3)}</span></div>
          <div style={{
            marginTop: "4px",
            borderTop: "1px dashed #3a3d37",
            paddingTop: "4px",
            color: data.status === "Passed" ? "#10b981" : data.status === "Needs Review" ? "#fbbf24" : data.status === "Running" ? "#9ca3af" : "#ef4444"
          }}>
            Status: <span style={{ float: "right", fontWeight: 600 }}>{data.status}</span>
          </div>
        </div>
      );
    }
    return null;
  };


  return (
    <>
      {/* ─── 1. Large Hero Section (Full Viewport Height Block) ─── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 0.9fr",
        gap: "40px",
        padding: "60px 0 100px",
        minHeight: "calc(100vh - 120px)",
        alignItems: "center",
      }} className="hero-responsive-layout">
        <style>{`
          @media (max-width: 900px) {
            .hero-responsive-layout {
              grid-template-columns: 1fr !important;
              padding: 40px 0 !important;
              min-height: auto !important;
            }
            .hero-workflow-illustration {
              display: none !important;
            }
          }
        `}</style>

        {/* Hero Left: Heading, Copy, CTAs */}
        <div>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            letterSpacing: "3px",
            color: "var(--ink-faint)",
            marginBottom: "12px",
            display: "block",
            fontWeight: 600,
          }}>
            INSTITUTIONAL QUANTITATIVE RESEARCH PLATFORM
          </span>
          <h1 style={{
            fontFamily: "var(--font-serif)",
            fontSize: "72px",
            fontWeight: 500,
            lineHeight: 1.0,
            color: "var(--ink)",
            marginBottom: "24px",
            letterSpacing: "-1px",
          }}>
            AlphaLab
          </h1>
          <p style={{
            fontSize: "16px",
            lineHeight: 1.6,
            color: "var(--ink-light)",
            marginBottom: "36px",
            maxWidth: "540px",
          }}>
            AlphaLab helps researchers build, evaluate, and validate quantitative alpha factors through historical backtesting and systematic robustness testing.
          </p>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <Link href="/lab" style={{ textDecoration: "none" }}>
              <button style={{
                background: "var(--ink)",
                color: "#fff",
                border: "1px solid var(--ink)",
                padding: "12px 24px",
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}>
                + New Experiment
              </button>
            </Link>
            
          </div>
        </div>

        {/* Hero Right: Clean Editorial Workflow Illustration */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }} className="hero-workflow-illustration">
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--ink-light)",
          }}>
            {[
              { label: "Expression", type: "neutral" },
              { label: "Backtest", type: "neutral" },
              { label: "Stress Test", type: "info" },
              { label: "Robustness", type: "info" },
              { label: "Production Candidate", type: "success" },
            ].map((node, i, arr) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 18px",
                  border: `1px solid ${
                    node.type === "success" ? "var(--green)" : node.type === "info" ? "#2563eb" : "var(--border-soft)"
                  }`,
                  background: node.type === "success" ? "#f0fdf4" : node.type === "info" ? "#eff6ff" : "#fff",
                  color: node.type === "success" ? "var(--green)" : node.type === "info" ? "#2563eb" : "var(--ink)",
                  fontWeight: node.type === "success" ? 700 : 500,
                  minWidth: "180px",
                  justifyContent: "center",
                }}>
                  <span style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: node.type === "success" ? "var(--green)" : node.type === "info" ? "#2563eb" : "var(--ink-faint)",
                  }} />
                  {node.label}
                </div>
                {i < arr.length - 1 && (
                  <div style={{
                    height: "16px",
                    width: "1px",
                    background: arr[i+1].type === "neutral" ? "var(--border-soft)" : "#3b82f6",
                    margin: "4px 0",
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid var(--border-soft)", marginBottom: "60px" }} />

      {/* ─── 2. The Research Problem ─── */}
      <div style={{ marginBottom: "80px" }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "2px",
          color: "var(--ink-faint)",
          marginBottom: "8px",
          display: "block",
          fontWeight: 600,
        }}>
          METHODOLOGY
        </span>
        <h2 style={{
          fontFamily: "var(--font-serif)",
          fontSize: "32px",
          fontWeight: 500,
          color: "var(--ink)",
          marginBottom: "16px",
        }}>
          The Research Problem
        </h2>
        <p style={{
          fontSize: "14px",
          lineHeight: 1.6,
          color: "var(--ink-light)",
          marginBottom: "32px",
          maxWidth: "760px",
        }}>
          Most quantitative research ends after historical backtesting. Historical performance alone cannot distinguish robust signals from overfit strategies. AlphaLab introduces robustness testing to identify signals more likely to generalize across changing market conditions.
        </p>

        {/* Side-by-side comparison (pure typography, minimal) */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "40px",
          maxWidth: "800px",
        }} className="responsive-split-row">
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--red)", marginBottom: "12px" }}>
              Traditional pipeline
            </div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--ink-light)",
              lineHeight: 2.0,
            }}>
              Expression
              <br />↓
              <br />Backtest
              <br />↓
              <br /><span style={{ color: "var(--red)", fontWeight: 600 }}>Deploy (High Overfit Risk)</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--green)", marginBottom: "12px" }}>
              AlphaLab pipeline
            </div>
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--ink-light)",
              lineHeight: 2.0,
            }}>
              Expression
              <br />↓
              <br />Backtest
              <br />↓
              <br /><span style={{ color: "#2563eb", fontWeight: 600 }}>Stress Testing (Gaussian & Dropout)</span>
              <br />↓
              <br /><span style={{ color: "#2563eb", fontWeight: 600 }}>Robustness Analysis</span>
              <br />↓
              <br /><span style={{ color: "var(--green)", fontWeight: 600 }}>Deploy (Production Candidate)</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid var(--border-soft)", marginBottom: "60px" }} />

      {/* ─── 3. Dashboard Overview (KPIs) ─── */}
      <div style={{ marginBottom: "80px" }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "2px",
          color: "var(--ink-faint)",
          marginBottom: "8px",
          display: "block",
          fontWeight: 600,
        }}>
          SUMMARY STATS
        </span>
        <h2 style={{
          fontFamily: "var(--font-serif)",
          fontSize: "32px",
          fontWeight: 500,
          color: "var(--ink)",
          marginBottom: "24px",
        }}>
          Dashboard Overview
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: "24px",
        }}>
          {[
            { label: "Total Experiments", val: stats.total, tooltip: "The total number of experiments run globally on the AlphaLab platform." },
            { label: "Robust Factors", val: stats.robust, color: stats.robust > 0 ? "var(--green)" : "var(--ink)", tooltip: "Factors that achieved an overall robustness score of 80% or higher after stress testing." },
            { label: "Average Sharpe", val: stats.completed > 0 ? stats.avgSharpe.toFixed(2) : "—", tooltip: "The mean Sharpe ratio across all completed baseline backtests." },
            { label: "Robustness Pass Rate", val: stats.completed > 0 ? `${stats.passRate.toFixed(0)}%` : "—", tooltip: "The percentage of completed experiments that successfully met the strict 80% robustness threshold." },
            { label: "Research Grade", val: stats.grade, color: "var(--green)", isGrade: true, tooltip: "A dynamic rating of platform maturity based on Pass Rate and Average Sharpe. Requires 60% pass rate and > 1.0 Sharpe for Institutional (A)." },
          ].map((c, i) => (
            <div key={i} style={{ borderBottom: "1px solid var(--border-soft)", paddingBottom: "16px" }}>
              <div className="al-tag" style={{ fontSize: "8.5px", marginBottom: "6px", display: "inline-flex", alignItems: "center", gap: "6px", overflow: "visible" }}>
                {c.label}
                <div className="tooltip-container">
                  <span className="tooltip-icon" style={{ border: "none", width: "12px", height: "12px", background: "transparent" }}>
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  </span>
                  <div className="tooltip-text" style={{ textTransform: "none", letterSpacing: "normal" }}>{c.tooltip}</div>
                </div>
              </div>
              <div style={{
                fontFamily: c.isGrade ? "var(--font-serif)" : "var(--font-mono)",
                fontSize: c.isGrade ? "14px" : "24px",
                fontWeight: 600,
                color: c.color || "var(--ink)",
              }}>
                {c.val}
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* ─── 4. Factor Landscape (Hero Visualization) ─── */}
      <div style={{ marginBottom: "80px" }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "2px",
          color: "var(--ink-faint)",
          marginBottom: "8px",
          display: "block",
          fontWeight: 600,
        }}>
          FACTOR LANDSCAPE
        </span>
        <h2 style={{
          fontFamily: "var(--font-serif)",
          fontSize: "32px",
          fontWeight: 500,
          color: "var(--ink)",
          marginBottom: "8px",
        }}>
          General Robustness vs Sharpe Performance
        </h2>
        <p style={{
          fontSize: "13px",
          color: "var(--ink-light)",
          marginBottom: "32px",
        }}>
          Signature visualization representing the distribution of predictive strength against stress resilience. Points are colored to isolate robust candidates.
        </p>

        <div style={{ border: "1px solid var(--border)", padding: "24px", background: "#fff" }}>
          <div style={{ width: "100%", height: 380, position: "relative" }}>
            {factors.length === 0 ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                fontSize: "12px",
                color: "var(--ink-faint)",
                gap: "8px",
              }}>
                <div>No experiments yet.</div>
                <Link href="/lab" style={{ color: "var(--ink)", fontWeight: 600, textDecoration: "underline" }}>
                  Create your first experiment to visualize the factor landscape →
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 15, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} stroke="var(--ink)" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Robustness"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    fontSize={9}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    label={{ value: "Robustness Score (%)", position: "insideBottom", offset: -5, fontSize: 10, fill: "var(--ink-light)" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Sharpe"
                    domain={["auto", "auto"]}
                    fontSize={9}
                    label={{ value: "Baseline Sharpe Ratio", angle: -90, position: "insideLeft", offset: 15, fontSize: 10, fill: "var(--ink-light)" }}
                  />
                  <ZAxis type="number" range={[180, 180]} />
                  <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter data={scatterData} onClick={(node: any) => router.push(`/history/${node.id}`)}>
                    {scatterData.map((entry, index) => {
                      const isHovered = hoveredPointId === entry.id;
                      const opacity = hoveredPointId ? (isHovered ? 1.0 : 0.25) : 0.85;
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.fill}
                          style={{
                            cursor: "pointer",
                            transition: "all 0.15s",
                            stroke: isHovered ? "var(--ink)" : "none",
                            strokeWidth: 2,
                          }}
                          opacity={opacity}
                          onMouseEnter={() => setHoveredPointId(entry.id)}
                          onMouseLeave={() => setHoveredPointId(null)}
                        />
                      );
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid var(--border-soft)", marginBottom: "60px" }} />

      {/* ─── NEW: AlphaLab Academy / Glossary ─── */}
      <div style={{ marginBottom: "80px" }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "2px",
          color: "var(--ink-faint)",
          marginBottom: "8px",
          display: "block",
          fontWeight: 600,
          textTransform: "uppercase"
        }}>
          ALPHALAB ACADEMY
        </span>
        <h2 style={{
          fontFamily: "var(--font-serif)",
          fontSize: "32px",
          fontWeight: 500,
          color: "var(--ink)",
          marginBottom: "16px",
        }}>
          Economic Glossary & Methodology
        </h2>
        <p style={{
          fontSize: "14px",
          lineHeight: 1.6,
          color: "var(--ink-light)",
          marginBottom: "40px",
          maxWidth: "760px",
        }}>
          Understanding quantitative finance requires familiarity with key statistical and economic concepts. This guide breaks down the core terms and mechanisms driving the AlphaLab platform.
        </p>

        <div style={{ display: "grid", gap: "32px", maxWidth: "800px" }}>
          
          {/* Term 1 */}
          <div style={{ padding: "24px", border: "1px solid var(--border-soft)", background: "var(--white)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--ink)" }}>
              1. Factor
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "16px", lineHeight: 1.6 }}>
              A "factor" is a measurable characteristic of a stock that helps explain its return and risk over time. Think of it as a specific "rule" or "trait" you look for. For example, a <strong>Value</strong> factor targets stocks that are cheap relative to their fundamentals, while a <strong>Momentum</strong> factor targets stocks that have recently gone up in price.
            </p>
            <div style={{ background: "rgba(26,28,24,0.03)", border: "1px solid var(--border-soft)", padding: "16px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "var(--ink-faint)", fontWeight: 600 }}>Example:</span><br/>
              If your rule is "buy stocks whose price dropped the most yesterday," the mathematical expression (e.g., <span style={{color: "var(--green)"}}>ts_rank(returns, 1)</span>) represents that Factor.
            </div>
          </div>

          {/* Term 2 */}
          <div style={{ padding: "24px", border: "1px solid var(--border-soft)", background: "var(--white)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--ink)" }}>
              2. NIFTY 50 (Universe)
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "16px", lineHeight: 1.6 }}>
              The "Universe" is the set of stocks your factor is allowed to trade. AlphaLab currently uses the <strong>NIFTY 50</strong> universe, which represents the 50 largest and most liquid companies listed on the National Stock Exchange of India. Testing on a well-known universe ensures results aren't distorted by illiquid, hard-to-trade penny stocks.
            </p>
          </div>

          {/* Term 3 */}
          <div style={{ padding: "24px", border: "1px solid var(--border-soft)", background: "var(--white)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--ink)" }}>
              3. Sharpe Ratio
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "16px", lineHeight: 1.6 }}>
              The Sharpe Ratio measures "risk-adjusted return." It tells you how much excess return you are getting for the extra volatility you endure. A high Sharpe ratio means the strategy is making steady, smooth profits without wild swings.
            </p>
            <div style={{ background: "rgba(26,28,24,0.03)", border: "1px solid var(--border-soft)", padding: "16px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "var(--ink-faint)", fontWeight: 600 }}>Example:</span><br/>
              Strategy A makes 20% a year but swings wildly up and down (High volatility, Low Sharpe).<br/>
              Strategy B makes 10% a year but goes up in a straight, steady line (Low volatility, High Sharpe).<br/>
              Institutions prefer Strategy B. A Sharpe &gt; 1.0 is generally considered good.
            </div>
          </div>

          {/* Term 4 */}
          <div style={{ padding: "24px", border: "1px solid var(--border-soft)", background: "var(--white)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--ink)" }}>
              4. Volatility
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "16px", lineHeight: 1.6 }}>
              Volatility is the statistical measure of the dispersion of returns. Simply put, it shows how wildly a stock's (or a portfolio's) price swings around its average. High volatility means high risk.
            </p>
          </div>

          {/* Term 5 */}
          <div style={{ padding: "24px", border: "1px solid var(--border-soft)", background: "var(--white)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--ink)" }}>
              5. Drawdown (Max Drawdown)
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "16px", lineHeight: 1.6 }}>
              A drawdown is the percentage drop from the highest peak of your portfolio's value to its lowest trough before a new peak is achieved. <strong>Max Drawdown</strong> is the largest of these drops over the entire backtest history.
            </p>
            <div style={{ background: "rgba(26,28,24,0.03)", border: "1px solid var(--border-soft)", padding: "16px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "var(--ink-faint)", fontWeight: 600 }}>Example:</span><br/>
              If your portfolio grows to $10,000, drops to $8,000, and then recovers, you experienced a 20% drawdown. If this was the worst drop ever, your Max Drawdown is 20%.
            </div>
          </div>

          {/* Term 6 */}
          <div style={{ padding: "24px", border: "1px solid var(--border-soft)", background: "var(--white)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--ink)" }}>
              6. Information Coefficient (IC)
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "16px", lineHeight: 1.6 }}>
              IC measures the predictive power of your factor. It is the correlation between the score your factor gives a stock today, and the stock's actual return tomorrow. 
            </p>
            <div style={{ background: "rgba(26,28,24,0.03)", border: "1px solid var(--border-soft)", padding: "16px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "var(--ink-faint)", fontWeight: 600 }}>Example:</span><br/>
              An IC of 1.0 means your factor predicted tomorrow's stock rankings perfectly.<br/>
              An IC of 0.0 means your factor is completely random.<br/>
              In real-world quantitative finance, a consistent IC of just 0.05 (5%) is highly profitable.
            </div>
          </div>

          {/* Term 7 */}
          <div style={{ padding: "24px", border: "1px solid var(--border-soft)", background: "var(--white)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--ink)" }}>
              7. Rank
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "16px", lineHeight: 1.6 }}>
              Instead of looking at raw values, we often "rank" stocks cross-sectionally. If you rank stocks by their P/E ratio, the stock with the lowest ratio gets rank 1, the next gets rank 2, etc. This neutralizes extreme market outliers and focuses strictly on relative ordering.
            </p>
          </div>

          {/* Term 8 */}
          <div style={{ padding: "24px", border: "1px solid var(--border-soft)", background: "var(--white)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--ink)" }}>
              8. Momentum
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "16px", lineHeight: 1.6 }}>
              Momentum is the economic phenomenon where assets that have performed well recently tend to continue performing well, and poor performers continue to perform poorly. It is driven by investor herding behavior and delayed reactions to news.
            </p>
          </div>

          {/* Term 9 */}
          <div style={{ padding: "24px", border: "1px solid var(--border-soft)", background: "var(--white)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--ink)" }}>
              9. Stress Testing & Perturbation
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "16px", lineHeight: 1.6 }}>
              Once a factor performs well historically, we "stress test" it to see if it was just lucky. <strong>Perturbation</strong> involves artificially changing the historical market data slightly (e.g., injecting random "Gaussian noise" or "dropping out" specific days). 
            </p>
            <div style={{ background: "rgba(26,28,24,0.03)", border: "1px solid var(--border-soft)", padding: "16px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "var(--ink-faint)", fontWeight: 600 }}>Example:</span><br/>
              If we slightly alter the historical prices by 1%, does your strategy completely collapse? If yes, it is heavily overfit to the exact history that occurred, and will likely fail in the real future.
            </div>
          </div>

          {/* Term 10 */}
          <div style={{ padding: "24px", border: "1px solid var(--border-soft)", background: "var(--white)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--ink)" }}>
              10. Robustness
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "0", lineHeight: 1.6 }}>
              A factor is "Robust" if its Sharpe Ratio survives the stress tests and perturbations. An "Overfit" factor looks great in a normal backtest but degrades rapidly when faced with noise, meaning it merely memorized the past rather than discovering a true market inefficiency.
            </p>
          </div>

          {/* Term 11 */}
          <div style={{ padding: "24px", border: "1px solid var(--border-soft)", background: "var(--white)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--ink)" }}>
              11. Look-Ahead Bias
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "16px", lineHeight: 1.6 }}>
              Look-ahead bias occurs when a backtest accidentally uses data that would not have been known at the time of a trade. In algorithmic trading, this is a fatal flaw that creates falsely profitable simulations.
            </p>
            <div style={{ background: "rgba(26,28,24,0.03)", border: "1px solid var(--border-soft)", padding: "16px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "var(--ink-faint)", fontWeight: 600 }}>Example:</span><br/>
              Buying a stock because you know tomorrow's close price is higher. Always use the <span style={{color: "var(--green)"}}>Lag(x, d)</span> function to ensure your signals only use strictly historical data.
            </div>
          </div>

          {/* Term 12 */}
          <div style={{ padding: "24px", border: "1px solid var(--border-soft)", background: "var(--white)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--ink)" }}>
              12. Mean Reversion
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "16px", lineHeight: 1.6 }}>
              Mean reversion is the opposite of Momentum. It is the financial theory suggesting that asset prices will eventually return to their long-term average. Strategies built on this principle buy when prices drop sharply and sell when they spike.
            </p>
          </div>

          {/* Term 13 */}
          <div style={{ padding: "24px", border: "1px solid var(--border-soft)", background: "var(--white)" }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", fontWeight: 600, marginBottom: "8px", color: "var(--ink)" }}>
              13. Overfitting
            </h3>
            <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "16px", lineHeight: 1.6 }}>
              Overfitting happens when a strategy is too perfectly tailored to historical data, capturing random noise instead of real economic patterns. An overfitted strategy will fail disastrously in live trading.
            </p>
            <div style={{ background: "rgba(26,28,24,0.03)", border: "1px solid var(--border-soft)", padding: "16px", fontSize: "12px", fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "var(--ink-faint)", fontWeight: 600 }}>Example:</span><br/>
              Finding a rule that says "Buy every 3rd Tuesday if the temperature in New York is 60 degrees." It might perfectly match a past bull run by coincidence, but it has zero predictive power.
            </div>
          </div>

        </div>
      </div>

      <div style={{ borderBottom: "1px solid var(--border-soft)", marginBottom: "60px" }} />

{/* ─── NEW: System Logic ─── */}
      <div style={{ marginBottom: "80px", display: "flex", flexDirection: "column", alignItems: "flex-end", textAlign: "right" }}>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "2px",
          color: "var(--ink-faint)",
          marginBottom: "8px",
          display: "block",
          fontWeight: 600,
          textTransform: "uppercase"
        }}>
          METHODOLOGY & TRUST REPORT (SYSTEM LOGIC)
        </span>
        <h2 style={{
          fontFamily: "var(--font-serif)",
          fontSize: "32px",
          fontWeight: 500,
          color: "var(--ink)",
          marginBottom: "24px",
        }}>
          System Mathematics, Algorithms & Graphs
        </h2>
        <p style={{
          fontSize: "14px",
          lineHeight: 1.6,
          color: "var(--ink-light)",
          marginBottom: "40px",
          maxWidth: "760px",
        }}>
          Total transparency is core to AlphaLab. This report completely exposes the internal math, thresholds, and graphing logic used to evaluate factors, detect overfitting, and render visual data across the platform.
        </p>
        
        <div style={{ display: "grid", gap: "40px", maxWidth: "900px", textAlign: "left" }}>
          
          {/* Sharpe */}
          <div>
            <div style={{ border: "1px solid var(--border-soft)", background: "var(--white)" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-soft)", background: "var(--cream)" }}>
                <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  1. SHARPE RATIO EVALUATION
                </h3>
              </div>
              <div style={{ padding: "24px" }}>
                <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "20px", lineHeight: 1.6 }}>
                  AlphaLab evaluates historical strategy performance by computing the annualized Sharpe ratio, which standardizes average daily excess returns against return volatility. This defines the baseline performance before stress testing.
                </p>
                <div style={{ background: "#1a1c18", color: "#fff", padding: "20px", fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: 1.6, marginBottom: "20px", overflowX: "auto" }}>
                  <div style={{ color: "#8a9085", marginBottom: "8px" }}># Python Implementation:</div>
                  <div style={{ color: "#fbbf24" }}>def</div> compute_sharpe(daily_returns, risk_free_rate=0.0):<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;excess_returns = daily_returns - risk_free_rate<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;<div style={{ color: "#fbbf24", display: "inline" }}>return</div> math.sqrt(252) * (mean(excess_returns) / std(excess_returns))
                </div>
              </div>
            </div>
          </div>

          {/* IC */}
          <div>
            <div style={{ border: "1px solid var(--border-soft)", background: "var(--white)" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-soft)", background: "var(--cream)" }}>
                <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  2. INFORMATION COEFFICIENT (IC)
                </h3>
              </div>
              <div style={{ padding: "24px" }}>
                <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "20px", lineHeight: 1.6 }}>
                  The predictive power of a factor is evaluated cross-sectionally using the Spearman rank correlation between generated factor scores and actual forward returns across the NIFTY 50 universe.
                </p>
                <div style={{ background: "#1a1c18", color: "#fff", padding: "20px", fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: 1.6, marginBottom: "20px", overflowX: "auto" }}>
                  <div style={{ color: "#8a9085", marginBottom: "8px" }}># Python Implementation:</div>
                  <div style={{ color: "#fbbf24" }}>def</div> compute_ic(factor_scores, forward_returns):<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;<div style={{ color: "#fbbf24", display: "inline" }}>return</div> spearman_rank_correlation(factor_scores, forward_returns)
                </div>
              </div>
            </div>
          </div>

          {/* Drawdown */}
          <div>
            <div style={{ border: "1px solid var(--border-soft)", background: "var(--white)" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-soft)", background: "var(--cream)" }}>
                <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  3. MAXIMUM DRAWDOWN (RED AREA CHART)
                </h3>
              </div>
              <div style={{ padding: "24px" }}>
                <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "20px", lineHeight: 1.6 }}>
                  The red filled area chart beneath the strategy simulation graphs represents rolling drawdown. It is calculated by taking the peak cumulative return observed so far, and measuring the current percentage drop from that peak. The maximum of these drops is the Max Drawdown.
                </p>
                <div style={{ background: "#1a1c18", color: "#fff", padding: "20px", fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: 1.6, marginBottom: "20px", overflowX: "auto" }}>
                  <div style={{ color: "#8a9085", marginBottom: "8px" }}># Python Implementation:</div>
                  <div style={{ color: "#fbbf24" }}>def</div> compute_drawdown(cumulative_returns):<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;running_max = np.maximum.accumulate(cumulative_returns)<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;drawdowns = (cumulative_returns - running_max) / running_max<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;<div style={{ color: "#fbbf24", display: "inline" }}>return</div> drawdowns, np.min(drawdowns)
                </div>
                <div style={{ background: "#fefce8", border: "1px solid #fef08a", padding: "16px", fontSize: "13px", color: "var(--ink)" }}>
                  <span style={{ fontWeight: 600 }}>Graph Logic:</span> The lower red area chart visualizes `drawdowns` over time. The Y-axis drops deeply into the negative space during market crashes (e.g., -0.180 means an 18% drawdown).
                </div>
              </div>
            </div>
          </div>

          {/* Stress Grid */}
          <div>
            <div style={{ border: "1px solid var(--border-soft)", background: "var(--white)" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-soft)", background: "var(--cream)" }}>
                <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  4. STRESS GRID (PERTURBATIONS & DROPOUT)
                </h3>
              </div>
              <div style={{ padding: "24px" }}>
                <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "20px", lineHeight: 1.6 }}>
                  The "Sharpe Retention Across Perturbation Levels" bar chart is generated by running 6 distinct stress simulations: injecting Gaussian noise (0.5%, 1.0%, 2.0%) into the price matrix, and randomly dropping out market data (5%, 10%, 20%). The Y-axis shows "Sharpe Retention."
                </p>
                <div style={{ background: "#1a1c18", color: "#fff", padding: "20px", fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: 1.6, marginBottom: "20px", overflowX: "auto" }}>
                  <div style={{ color: "#8a9085", marginBottom: "8px" }}># Python Implementation:</div>
                  sharpe_retention = stressed_sharpe / baseline_sharpe
                </div>
                <div style={{ background: "#fefce8", border: "1px solid #fef08a", padding: "16px", fontSize: "13px", color: "var(--ink)" }}>
                  <span style={{ fontWeight: 600 }}>Graph Logic:</span> If a bar drops below 0.0 (like `Noise 2.0%` in some extreme scenarios), the factor completely reversed its profitability under stress, indicating a severe overfit.
                </div>
              </div>
            </div>
          </div>

          {/* Overall Robustness Score */}
          <div>
            <div style={{ border: "1px solid var(--border-soft)", background: "var(--white)" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-soft)", background: "var(--cream)" }}>
                <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  5. OVERALL ROBUSTNESS SCORE & THRESHOLDS
                </h3>
              </div>
              <div style={{ padding: "24px" }}>
                <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "20px", lineHeight: 1.6 }}>
                  The "Robustness Score" (X-axis on the main landscape graph) is the average Sharpe Retention across all 6 stress grid tests. AlphaLab assigns a strict classification based on this mathematical threshold.
                </p>
                <div style={{ background: "#1a1c18", color: "#fff", padding: "20px", fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: 1.6, marginBottom: "20px", overflowX: "auto" }}>
                  <div style={{ color: "#8a9085", marginBottom: "8px" }}># Classification Logic:</div>
                  <div style={{ color: "#fbbf24" }}>if</div> overall_score &gt;= 0.80:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;status = <span style={{color: "#10b981"}}>"Robust" (Green)</span><br/>
                  <div style={{ color: "#fbbf24" }}>elif</div> overall_score &gt; 0.0:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;status = <span style={{color: "#fbbf24"}}>"Needs Review" (Amber)</span><br/>
                  <div style={{ color: "#fbbf24" }}>else</div>:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;status = <span style={{color: "#ef4444"}}>"Overfit" (Red)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Graph */}
          <div>
            <div style={{ border: "1px solid var(--border-soft)", background: "var(--white)" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-soft)", background: "var(--cream)" }}>
                <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  6. PERFORMANCE UNDER STRESS TESTING (TIMELINE GRAPHS)
                </h3>
              </div>
              <div style={{ padding: "24px" }}>
                <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "20px", lineHeight: 1.6 }}>
                  The main timeline graph superimposes the Baseline Factor performance (Black solid line) against a severely Stressed Scenario (Red dashed line). Vertical red lines denote systemic historical crashes (e.g., COVID Crash, FII Selloff) to visually inspect shock resilience.
                </p>
              </div>
            </div>
          </div>

          {/* Factor Landscape */}
          <div>
            <div style={{ border: "1px solid var(--border-soft)", background: "var(--white)" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-soft)", background: "var(--cream)" }}>
                <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  7. FACTOR LANDSCAPE (SCATTERPLOT AXES)
                </h3>
              </div>
              <div style={{ padding: "24px" }}>
                <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "20px", lineHeight: 1.6 }}>
                  The primary scatterplot on the Home page acts as a macro-view of all experiments. 
                </p>
                <ul style={{ fontSize: "13px", color: "var(--ink-light)", lineHeight: 1.6, paddingLeft: "20px" }}>
                  <li style={{ marginBottom: "8px" }}><strong>Y-Axis (Sharpe):</strong> Represents the baseline historical risk-adjusted return.</li>
                  <li style={{ marginBottom: "8px" }}><strong>X-Axis (Robustness Score %):</strong> Represents the average retention under noise as calculated in Section 5.</li>
                  <li><strong>Dot Colors:</strong> Conform entirely to the thresholds: Green (&gt;=80%), Amber (&gt;0%), Red (&lt;=0%).</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Research Grade */}
          <div>
            <div style={{ border: "1px solid var(--border-soft)", background: "var(--white)" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-soft)", background: "var(--cream)" }}>
                <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  8. RESEARCH GRADE RATING (OVERALL PLATFORM)
                </h3>
              </div>
              <div style={{ padding: "24px" }}>
                <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "20px", lineHeight: 1.6 }}>
                  The "Research Grade" acts as a live, platform-wide health monitor evaluating the collective progress of all users on the application. It dynamically assigns a letter grade based on the overall robustness pass rate and the average Sharpe ratio across all completed experiments.
                </p>
                <div style={{ background: "#1a1c18", color: "#fff", padding: "20px", fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: 1.6, marginBottom: "20px", overflowX: "auto" }}>
                  <div style={{ color: "#8a9085", marginBottom: "8px" }}># Classification Logic:</div>
                  <div style={{ color: "#fbbf24" }}>if</div> total_experiments == 0:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;grade = <span style={{color: "#8a9085"}}>"Inception (D)"</span><br/>
                  <div style={{ color: "#fbbf24" }}>elif</div> pass_rate &gt;= 60 <div style={{ color: "#fbbf24", display: "inline" }}>and</div> avg_sharpe &gt;= 1.0:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;grade = <span style={{color: "#10b981"}}>"Institutional (A)"</span><br/>
                  <div style={{ color: "#fbbf24" }}>elif</div> pass_rate &gt;= 40 <div style={{ color: "#fbbf24", display: "inline" }}>and</div> avg_sharpe &gt;= 0.5:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;grade = <span style={{color: "#3b82f6"}}>"Professional (B)"</span><br/>
                  <div style={{ color: "#fbbf24" }}>else</div>:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;grade = <span style={{color: "#fbbf24"}}>"Development (C)"</span>
                </div>
              </div>
            </div>
          </div>



          {/* Strategy Grade */}
          <div>
            <div style={{ border: "1px solid var(--border-soft)", background: "var(--white)" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-soft)", background: "var(--cream)" }}>
                <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  9. STRATEGY GRADE RATING (OVERALL FACTOR)
                </h3>
              </div>
              <div style={{ padding: "24px" }}>
                <p style={{ fontSize: "13px", color: "var(--ink-light)", marginBottom: "20px", lineHeight: 1.6 }}>
                  While the Research Grade measures the platform globally, each individual factor is also assigned a specific "Strategy Grade" (A, B, C, D) on its history detail page. This acts as a final gatekeeper, grading the individual algorithm based on its specific Robustness Score and Sharpe Ratio.
                </p>
                <div style={{ background: "#1a1c18", color: "#fff", padding: "20px", fontFamily: "var(--font-mono)", fontSize: "12px", lineHeight: 1.6, marginBottom: "20px", overflowX: "auto" }}>
                  <div style={{ color: "#8a9085", marginBottom: "8px" }}># Classification Logic:</div>
                  <span style={{ color: "#fbbf24" }}>if</span> overall_score {">="} 0.80 <span style={{ color: "#fbbf24" }}>and</span> sharpe {">="} 1.0:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;grade = <span style={{color: "#10b981"}}>"Institutional (A)"</span><br/>
                  <span style={{ color: "#fbbf24" }}>elif</span> overall_score {">="} 0.80 <span style={{ color: "#fbbf24" }}>and</span> sharpe {">="} 0.5:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;grade = <span style={{color: "#3b82f6"}}>"Professional (B)"</span><br/>
                  <span style={{ color: "#fbbf24" }}>elif</span> overall_score {">="} 0.80:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;grade = <span style={{color: "#fbbf24"}}>"Development (C)"</span><br/>
                  <span style={{ color: "#fbbf24" }}>else</span>:<br/>
                  &nbsp;&nbsp;&nbsp;&nbsp;grade = <span style={{color: "#b91c1c"}}>"Rejected (D)"</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
