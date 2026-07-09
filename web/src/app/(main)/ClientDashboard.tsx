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
        return {
          id: f.id,
          name: f.name,
          x: (f.overall_score ?? 0) * 100, // Robustness score on 0-100% scale
          y: f.sharpe ?? 0,                 // Sharpe ratio
          ic: f.ic ?? 0,
          status,
          fill,
        };
      });
  }, [factors]);

  // 3. Dynamic Recent Discoveries Feed (Chronological events)
  const discoveriesFeed = useMemo(() => {
    const events: { id: string; text: string; time: string; status: string }[] = [];
    const sorted = [...factors].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    for (const f of sorted.slice(0, 4)) {
      const timeStr = formatDateNeutral(f.created_at);

      events.push({
        id: `${f.id}-created`,
        text: `Factor expression "${f.name}" generated`,
        time: timeStr,
        status: "created",
      });

      if (f.overall_score !== null) {
        const isPassed = f.overall_score >= ROBUSTNESS_THRESHOLD;
        events.push({
          id: `${f.id}-evaluated`,
          text: `Robustness verification ${isPassed ? "PASSED" : "FAILED"} for ${f.name}`,
          time: timeStr,
          status: isPassed ? "passed" : "failed",
        });
      }
    }
    return events;
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

  const scrollToTable = () => {
    const el = document.getElementById("experiments-table-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
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
            <button
              onClick={scrollToTable}
              style={{
                background: "transparent",
                color: "var(--ink)",
                border: "1px solid var(--ink)",
                padding: "12px 24px",
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              View Research History
            </button>
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
            { label: "Total Experiments", val: stats.total },
            { label: "Running Experiments", val: stats.running, color: stats.running > 0 ? "var(--amber)" : "var(--ink)" },
            { label: "Robust Factors", val: stats.robust, color: stats.robust > 0 ? "var(--green)" : "var(--ink)" },
            { label: "Average Sharpe", val: stats.completed > 0 ? stats.avgSharpe.toFixed(2) : "—" },
            { label: "Robustness Pass Rate", val: stats.completed > 0 ? `${stats.passRate.toFixed(0)}%` : "—" },
            { label: "Research Grade", val: stats.grade, color: "var(--green)", isGrade: true },
          ].map((c, i) => (
            <div key={i} style={{ borderBottom: "1px solid var(--border-soft)", paddingBottom: "16px" }}>
              <div className="al-tag" style={{ fontSize: "8.5px", marginBottom: "6px" }}>{c.label}</div>
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

      <div style={{ borderBottom: "1px solid var(--border-soft)", marginBottom: "60px" }} />

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
                  <Scatter data={scatterData} onClick={(node) => router.push(`/history/${node.id}`)}>
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

      {/* ─── 5. Recent Activity (GitHub/Linear Style Timeline) ─── */}
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
          EVENT STREAM
        </span>
        <h2 style={{
          fontFamily: "var(--font-serif)",
          fontSize: "32px",
          fontWeight: 500,
          color: "var(--ink)",
          marginBottom: "24px",
        }}>
          Recent Research Activity
        </h2>

        {discoveriesFeed.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--ink-faint)", padding: "20px 0" }}>
            No recent discoveries.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "600px" }}>
            {discoveriesFeed.map((ev) => (
              <div key={ev.id} style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                fontSize: "12px",
                borderLeft: "2px solid var(--border-soft)",
                paddingLeft: "16px",
                marginLeft: "8px",
              }}>
                <span style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: ev.status === "passed" ? "var(--green)" : ev.status === "failed" ? "var(--red)" : "var(--ink-faint)",
                  marginLeft: "-21px",
                  border: "2px solid var(--cream)",
                }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{ev.text}</span>
                  <span style={{ color: "var(--ink-faint)", fontSize: "11px", marginLeft: "12px" }}>{ev.time}</span>
                </div>
                <span style={{
                  padding: "1px 6px",
                  fontSize: "8px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: ev.status === "passed" ? "var(--green)" : ev.status === "failed" ? "var(--red)" : "var(--ink-light)",
                  background: ev.status === "passed" ? "#f0fdf4" : ev.status === "failed" ? "#fef2f2" : "#f5f5f3",
                  border: `1px solid ${ev.status === "passed" ? "#dcfce7" : ev.status === "failed" ? "#fee2e2" : "#ddddd9"}`,
                }}>
                  {ev.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderBottom: "1px solid var(--border-soft)", marginBottom: "60px" }} id="experiments-table-section" />
    </>
  );
}
