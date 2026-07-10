"use client";

import React, { useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────── */
interface SubsystemPanel {
  id: string;
  label: string;
  badge: string;
}

const SUBSYSTEMS: SubsystemPanel[] = [
  { id: "api", label: "API & Job Orchestration", badge: "5a" },
  { id: "data", label: "Data Layer (DuckDB)", badge: "5b" },
  { id: "backtest", label: "Backtesting Engine", badge: "5c" },
  { id: "stress", label: "Stress & Noise Engine", badge: "5d" },
  { id: "cache", label: "Results & Caching", badge: "5e" },
  { id: "dsl", label: "DSL Compiler", badge: "5f" },
  { id: "eval", label: "Factor Evaluator", badge: "5g" },
  { id: "perturb", label: "PerturbedStorage", badge: "5h" },
  { id: "verdict", label: "LLM Verdict Engine", badge: "5i" },
  { id: "ingest", label: "Data Ingestion Pipeline", badge: "5j" },
];

/* ─────────────────────────────────────────────────────────────────────────
   Inline math helper — renders notation in a monospace span
───────────────────────────────────────────────────────────────────────── */
function M({ children }: { children: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        background: "rgba(26,28,24,0.06)",
        padding: "1px 5px",
        borderRadius: 0,
        color: "#1a1c18",
      }}
    >
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Formula block
───────────────────────────────────────────────────────────────────────── */
function FormulaBlock({ children }: { children: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        color: "#1a1c18",
        background: "#fff",
        border: "1px solid #ddddd9",
        padding: "10px 16px",
        margin: "8px 0",
        lineHeight: 1.8,
        overflowX: "auto",
        whiteSpace: "pre",
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Diagram box
───────────────────────────────────────────────────────────────────────── */
function Box({
  label,
  sub,
  accent,
}: {
  label: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${accent ? "#1a1c18" : "#ddddd9"}`,
        background: accent ? "#1a1c18" : "#fff",
        color: accent ? "#fff" : "#1a1c18",
        padding: "9px 13px",
        fontSize: "10px",
        fontWeight: 700,
        fontFamily: "var(--font-sans)",
        minWidth: 120,
        textAlign: "center",
        lineHeight: 1.4,
        flexShrink: 0,
        letterSpacing: "0.2px",
      }}
    >
      {label}
      {sub && (
        <div
          style={{
            fontWeight: 400,
            fontSize: "9px",
            color: accent ? "rgba(255,255,255,0.55)" : "#8a9085",
            marginTop: 3,
            fontFamily: "var(--font-mono)",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

/* Arrow */
function Arr({ label, dashed }: { label?: string; dashed?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0, padding: "0 2px" }}>
      <div
        style={{
          width: 20,
          height: 0,
          borderTop: `1px ${dashed ? "dashed" : "solid"} #5c6059`,
        }}
      />
      {label && (
        <span
          style={{
            fontSize: "8px",
            color: "#8a9085",
            fontWeight: 600,
            whiteSpace: "nowrap",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      )}
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "3px solid transparent",
          borderBottom: "3px solid transparent",
          borderLeft: "4px solid #5c6059",
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Sequence Diagram
───────────────────────────────────────────────────────────────────────── */
const SEQ_COLS = ["Browser\nNext.js UI", "API Layer\nFastAPI", "Task Queue\nRedis", "Worker\nCelery", "Data Store\nDuckDB"];

interface SeqStep {
  step: string;
  from: number;
  to: number;
  label: string;
  dashed?: boolean;
  note: string;
  highlight?: boolean;
}

const SEQ_STEPS: SeqStep[] = [
  { step: "1", from: 0, to: 1, label: "POST /factors/{id}/backtest {scenario}", dashed: false, note: "Sync HTTP. Browser sends factor_id + stress scenario type + shock params." },
  { step: "2", from: 1, to: 1, label: "Validate · create job (QUEUED) · return 202", dashed: false, note: "API validates schema, writes job row, returns job_id immediately." },
  { step: "3", from: 1, to: 2, label: "ENQUEUE task(job_id, factor_id, scenario)", dashed: true, note: "Async fire-and-forget to Redis queue. API does not block." },
  { step: "4", from: 2, to: 3, label: "DEQUEUE task · set status → RUNNING", dashed: true, note: "Celery worker picks message from Redis. Transitions job to RUNNING." },
  { step: "5a", from: 3, to: 4, label: "SELECT ohlcv, factor_values WHERE date ∈ window", dashed: false, note: "Sync in-process DuckDB read. Fetches historical returns + factor scores." },
  { step: "5b", from: 3, to: 3, label: "Run baseline backtest (vectorized)", dashed: false, note: "Factor scores → weights → daily returns → cumulative curve. Baseline series." },
  { step: "5c", from: 3, to: 3, label: "★ Perturbation engine: perturb r_{i,t}", dashed: false, note: "SERVER-SIDE ONLY. Applies volatility scaling / Cholesky correlated noise to DuckDB returns. Seeded, reproducible. Not client-side fabrication.", highlight: true },
  { step: "5d", from: 3, to: 3, label: "Re-run identical backtest on r̃_{i,t}", dashed: false, note: "Same code path as 5b. Only input differs. Produces stressed performance series.", highlight: true },
  { step: "6", from: 3, to: 4, label: "INSERT results (baseline, stressed, Δmetrics)", dashed: false, note: "Worker writes both series + ΔSharpe, ΔDrawdown to DuckDB results table." },
  { step: "6b", from: 3, to: 2, label: "SET status → COMPLETE", dashed: true, note: "Celery updates task state in Redis result backend." },
  { step: "7", from: 0, to: 1, label: "GET /jobs/{job_id}/status (poll)", dashed: true, note: "Browser polls at exponential backoff until status = COMPLETE." },
  { step: "8", from: 1, to: 0, label: "→ 200 {baseline[], stressed[], delta_metrics}", dashed: false, note: "Full payload returned. Browser renders equity curves + delta table via Recharts." },
];

function SequenceDiagram() {
  const COL_W = 160;
  const STEP_H = 72;
  const LABEL_W = 36;
  const PAD = 16;

  const totalW = LABEL_W + SEQ_COLS.length * COL_W + PAD * 2;
  const totalH = PAD + STEP_H * SEQ_STEPS.length + PAD;

  function colX(ci: number) {
    return LABEL_W + PAD + ci * COL_W + COL_W / 2;
  }

  return (
    <div style={{ overflowX: "auto", border: "1px solid #1a1c18", background: "#fff" }}>
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `${LABEL_W}px repeat(${SEQ_COLS.length}, ${COL_W}px)`,
          borderBottom: "2px solid #1a1c18",
          background: "#fbfbfa",
        }}
      >
        <div />
        {SEQ_COLS.map((c) => {
          const [title, sub] = c.split("\n");
          return (
            <div
              key={c}
              style={{
                padding: "12px 8px",
                textAlign: "center",
                borderLeft: "1px solid #ddddd9",
                fontSize: "10px",
                fontWeight: 700,
                color: "#1a1c18",
                lineHeight: 1.4,
              }}
            >
              {title}
              <div style={{ fontSize: "8px", fontWeight: 400, color: "#8a9085", marginTop: 2, fontFamily: "var(--font-mono)" }}>{sub}</div>
            </div>
          );
        })}
      </div>

      {/* SVG rows */}
      <svg width={totalW} height={totalH} style={{ display: "block", minWidth: totalW }}>
        {/* Lifelines */}
        {SEQ_COLS.map((_, ci) => (
          <line
            key={ci}
            x1={colX(ci)}
            y1={PAD}
            x2={colX(ci)}
            y2={totalH - PAD}
            stroke="rgba(26,28,24,0.09)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ))}

        {/* Steps */}
        {SEQ_STEPS.map((s, si) => {
          const y = PAD + si * STEP_H + STEP_H / 2;
          const x1 = colX(s.from);
          const x2 = colX(s.to);
          const isSelf = s.from === s.to;
          const markerFill = "#5c6059";
          const strokeColor = s.highlight ? "#0f766e" : "#5c6059";
          const textColor = s.highlight ? "#0f766e" : "#1a1c18";

          return (
            <g key={s.step}>
              {/* Row highlight bg */}
              {s.highlight && (
                <rect
                  x={LABEL_W}
                  y={y - STEP_H / 2}
                  width={totalW - LABEL_W}
                  height={STEP_H}
                  fill="rgba(15,118,110,0.04)"
                />
              )}

              {/* Step label */}
              <text
                x={LABEL_W / 2}
                y={y + 4}
                textAnchor="middle"
                fontSize={8}
                fontWeight={700}
                fill="#8a9085"
                fontFamily="var(--font-mono)"
              >
                {s.step}
              </text>

              {/* Self-call box */}
              {isSelf ? (
                <>
                  <rect
                    x={x1 - 60}
                    y={y - 14}
                    width={120}
                    height={28}
                    fill={s.highlight ? "rgba(15,118,110,0.08)" : "#fbfbfa"}
                    stroke={strokeColor}
                    strokeWidth={1}
                  />
                  <text
                    x={x1}
                    y={y + 4}
                    textAnchor="middle"
                    fontSize={8.5}
                    fontWeight={600}
                    fill={textColor}
                    fontFamily="var(--font-sans)"
                  >
                    {s.label.length > 28 ? s.label.slice(0, 25) + "…" : s.label}
                  </text>
                </>
              ) : (
                <>
                  {/* Arrow line */}
                  <line
                    x1={x1}
                    y1={y}
                    x2={x2 + (x2 > x1 ? -6 : 6)}
                    y2={y}
                    stroke={strokeColor}
                    strokeWidth={1.2}
                    strokeDasharray={s.dashed ? "5 3" : undefined}
                  />
                  {/* Arrowhead */}
                  <polygon
                    points={
                      x2 > x1
                        ? `${x2},${y} ${x2 - 7},${y - 4} ${x2 - 7},${y + 4}`
                        : `${x2},${y} ${x2 + 7},${y - 4} ${x2 + 7},${y + 4}`
                    }
                    fill={strokeColor}
                  />
                  {/* Label above arrow */}
                  <text
                    x={(x1 + x2) / 2}
                    y={y - 8}
                    textAnchor="middle"
                    fontSize={8.5}
                    fontWeight={600}
                    fill={textColor}
                    fontFamily="var(--font-sans)"
                  >
                    {s.label.length > 42 ? s.label.slice(0, 40) + "…" : s.label}
                  </text>
                </>
              )}

              {/* Row divider */}
              <line
                x1={LABEL_W}
                y1={y + STEP_H / 2}
                x2={totalW}
                y2={y + STEP_H / 2}
                stroke="#f0f0ee"
                strokeWidth={1}
              />
            </g>
          );
        })}
      </svg>

      {/* Notes below */}
      <div style={{ borderTop: "1px solid #ddddd9" }}>
        {SEQ_STEPS.map((s) => (
          <div
            key={s.step + "-note"}
            style={{
              display: "grid",
              gridTemplateColumns: `${LABEL_W}px 1fr`,
              borderBottom: "1px solid #f5f5f3",
              background: s.highlight ? "rgba(15,118,110,0.02)" : "transparent",
              padding: "5px 0",
            }}
          >
            <div style={{ textAlign: "center", fontSize: "8px", fontWeight: 700, color: "#8a9085", paddingTop: 3, fontFamily: "var(--font-mono)" }}>
              {s.step}
            </div>
            <div style={{ fontSize: "10px", color: s.highlight ? "#0f766e" : "#8a9085", lineHeight: 1.6, padding: "0 12px 0 4px", fontStyle: "italic" }}>
              ↳ {s.note}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          padding: "10px 20px",
          borderTop: "1px solid #ddddd9",
          display: "flex",
          gap: 28,
          background: "#fbfbfa",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width={32} height={10}><line x1={0} y1={5} x2={32} y2={5} stroke="#5c6059" strokeWidth={1.2} /></svg>
          <span style={{ fontSize: "10px", color: "#8a9085" }}>Synchronous</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width={32} height={10}><line x1={0} y1={5} x2={32} y2={5} stroke="#5c6059" strokeWidth={1.2} strokeDasharray="5 3" /></svg>
          <span style={{ fontSize: "10px", color: "#8a9085" }}>Asynchronous</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, background: "rgba(15,118,110,0.12)", border: "1px solid rgba(15,118,110,0.3)" }} />
          <span style={{ fontSize: "10px", color: "#8a9085" }}>Server-side only — steps 5b–5d run entirely in Celery worker</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────────────────── */
export default function FlowPage() {
  const [activeSubsystem, setActiveSubsystem] = useState<string>("api");
  const [shockMagnitude, setShockMagnitude] = useState<number>(40);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  return (
    <div className="sardar-flow-page" style={{ maxWidth: "100%" }}>

      {/* ══ §1 INTRODUCTION ══════════════════════════════════════ */}
      <div
        style={{
          paddingBottom: 40,
          borderBottom: "1px solid #ddddd9",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 48,
          alignItems: "start",
        }}
      >
        {/* Left — heading */}
        <div>
          <div className="al-tag" style={{ marginBottom: 10 }}>SYSTEM ARCHITECTURE</div>
          <h1 className="al-title-xl">
            How AlphaLab works
          </h1>
        </div>

        {/* Right — description */}
        <div style={{ paddingTop: 32 }}>
          <p className="al-body" style={{ marginBottom: 14 }}>
            AlphaLab is a stress-testing platform for quantitative alpha factors evaluated against
            NIFTY 50 equities. A user defines a factor expression — for example,{" "}
            <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "#f3f3f1", padding: "1px 6px" }}>
              Momentum(20) / Volatility(10)
            </code>{" "}
            — and the platform backtests it against historical NIFTY 50 constituent returns.
          </p>
          <p className="al-body">
            The same backtest is then re-run under a suite of simulated adverse market shocks.
            The result is a side-by-side comparison of baseline vs. stressed performance,
            surfacing how a factor&apos;s Sharpe ratio, max drawdown, and cumulative return
            degrade before capital is deployed.
          </p>
        </div>
      </div>

      <div className="sardar-grid-divider" />

      {/* ══ ARCHITECTURE DIAGRAM ══════════════════════════════════ */}
      <div style={{ padding: "32px 0", borderBottom: "1px solid #ddddd9" }}>
        <div style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "end" }}>
          <div>
            <div className="al-tag" style={{ marginBottom: 8 }}>SYSTEM DIAGRAM</div>
            <h2 className="al-title-md">How the components connect</h2>
          </div>
          <p className="al-body">
            Think of AlphaLab like a factory: the browser is the control panel where you
            give instructions, the API is the foreman that receives and routes them,
            the Celery worker is the machine that does the heavy calculation, and
            DuckDB is the raw materials warehouse. Nothing gets computed in the browser
            — it only shows you the finished result.
          </p>
        </div>

        {/* Styled architecture diagram */}
        <div style={{ background: "#fff", border: "1px solid #1a1c18", padding: "32px 24px", overflowX: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, minWidth: 560 }}>

            {/* Browser */}
            <div style={{ width: "100%", maxWidth: 680, border: "1px solid #1a1c18", background: "#fbfbfa" }}>
              <div style={{ background: "#1a1c18", color: "#fff", padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px" }}>BROWSER</span>
                <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)" }}>Next.js / React — Vercel</span>
              </div>
              <div style={{ padding: "14px 20px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Home", "Research Lab", "History", "Flow"].map(pg => (
                  <span key={pg} style={{ fontSize: "10px", fontWeight: 600, color: "#1a1c18", background: "#f3f3f1", border: "1px solid #ddddd9", padding: "3px 10px" }}>{pg}</span>
                ))}
              </div>
            </div>

            {/* Connector: Browser → API */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 0" }}>
              <div style={{ width: 1, height: 16, background: "#5c6059" }} />
              <span style={{ fontSize: "9px", color: "#8a9085", fontFamily: "var(--font-mono)", background: "#fbfbfa", padding: "1px 8px", border: "1px solid #ddddd9" }}>HTTP / REST · port 8000</span>
              <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid #5c6059" }} />
            </div>

            {/* FastAPI */}
            <div style={{ width: "100%", maxWidth: 680, border: "1px solid #1a1c18", background: "#fff" }}>
              <div style={{ background: "#1a1c18", color: "#fff", padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px" }}>FASTAPI APPLICATION</span>
                <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mono)" }}>uvicorn · port 8000</span>
              </div>
              <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 5 }}>
                {[
                  ["POST", "/factors/{id}/backtest", "enqueue task → return 202 + job_id"],
                  ["GET", "/jobs/{id}/status", "poll job state until COMPLETE"],
                  ["GET", "/factors/leaderboard", "paginated, sortable results"],
                ].map(([method, path, desc]) => (
                  <div key={path} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "10px", fontFamily: "var(--font-mono)" }}>
                    <span style={{ color: "#0f766e", fontWeight: 700, minWidth: 32 }}>{method}</span>
                    <span style={{ color: "#1a1c18", fontWeight: 600 }}>{path}</span>
                    <span style={{ color: "#8a9085", fontWeight: 400 }}>— {desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Two branches: Postgres + Celery */}
            <div style={{ width: "100%", maxWidth: 680, display: "flex", position: "relative", justifyContent: "space-between", padding: "0 0", marginTop: 0 }}>
              {/* Postgres branch line */}
              <div style={{ position: "absolute", left: "25%", top: 0, height: 32, width: 1, background: "#ddddd9" }} />
              <div style={{ position: "absolute", left: "25%", top: 20, fontSize: "8px", color: "#8a9085", fontFamily: "var(--font-mono)", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>SQLAlchemy</div>
              {/* Redis/Celery branch line */}
              <div style={{ position: "absolute", right: "25%", top: 0, height: 32, width: 1, background: "#ddddd9" }} />
              <div style={{ position: "absolute", right: "25%", top: 20, fontSize: "8px", color: "#8a9085", fontFamily: "var(--font-mono)", transform: "translateX(50%)", whiteSpace: "nowrap" }}>Redis queue</div>
              <div style={{ height: 40 }} />
            </div>

            {/* Side-by-side: Postgres + Celery */}
            <div style={{ width: "100%", maxWidth: 680, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* PostgreSQL */}
              <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa" }}>
                <div style={{ background: "#5c6059", color: "#fff", padding: "7px 14px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px" }}>POSTGRESQL</span>
                  <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-mono)" }}>Docker · port 5436</span>
                </div>
                <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 3 }}>
                  {["users", "experiments", "factors", "backtest_results", "robustness_results"].map(t => (
                    <span key={t} style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#5c6059" }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Celery Worker */}
              <div style={{ border: "1px solid #1a1c18", background: "#fff" }}>
                <div style={{ background: "#1a1c18", color: "#fff", padding: "7px 14px", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px" }}>CELERY WORKER</span>
                  <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-mono)" }}>--pool=solo</span>
                </div>
                <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#5c6059" }}>run_backtest(factor_id)</span>
                  <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "#5c6059" }}>run_robustness(factor_id)</span>
                  <div style={{ marginTop: 6, padding: "5px 8px", background: "rgba(15,118,110,0.07)", border: "1px solid rgba(15,118,110,0.2)" }}>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "#0f766e", fontFamily: "var(--font-mono)" }}>★ Perturbation engine</span>
                    <div style={{ fontSize: "8px", color: "#0f766e", marginTop: 2, fontFamily: "var(--font-mono)" }}>server-side · seeded · reproducible</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Connector: Celery → DuckDB */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", width: "100%", maxWidth: 680, padding: "0 8px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 0", width: "calc(25% + 8px)" }}>
                <div style={{ width: 1, height: 16, background: "#5c6059" }} />
                <span style={{ fontSize: "9px", color: "#8a9085", fontFamily: "var(--font-mono)", background: "#fbfbfa", padding: "1px 8px", border: "1px solid #ddddd9", whiteSpace: "nowrap" }}>in-process read</span>
                <div style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "6px solid #5c6059" }} />
              </div>
            </div>

            {/* DuckDB */}
            <div style={{ width: "50%", alignSelf: "flex-end", border: "1px solid #1a1c18", background: "#fff" }}>
              <div style={{ background: "#1a1c18", color: "#fff", padding: "7px 14px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px" }}>DUCKDB</span>
                <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-mono)" }}>alphalab.db · embedded</span>
              </div>
              <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 3 }}>
                {[
                  ["ohlcv", "price history (adj_close)"],
                  ["factor_values", "daily cross-sectional scores"],
                  ["universe", "NIFTY 50 point-in-time members"],
                ].map(([tbl, desc]) => (
                  <div key={tbl} style={{ display: "flex", gap: 10, fontSize: "9px", fontFamily: "var(--font-mono)" }}>
                    <span style={{ fontWeight: 700, color: "#1a1c18", minWidth: 90 }}>{tbl}</span>
                    <span style={{ color: "#8a9085" }}>— {desc}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="sardar-grid-divider" />

      {/* ══ §2 TECHNOLOGY STACK ══════════════════════════════════ */}
      <div style={{ padding: "32px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="al-tag" style={{ marginBottom: 8 }}>TECHNOLOGY STACK</div>
          <h2 className="al-title-lg">Seven components, one pipeline</h2>
        </div>

        <div style={{ border: "1px solid #1a1c18", background: "#fff" }}>
          {[
            {
              component: "Next.js / React",
              role: "Frontend UI",
              desc: "App Router, TypeScript, RSC for initial leaderboard fetch, client components for interactive chart rendering. Deployed to Vercel.",
            },
            {
              component: "Recharts",
              role: "Visualization",
              desc: "Declarative React charting. Renders the baseline equity curve, stressed curve overlay, and perturbation grid — all from JSON payloads returned by the API.",
            },
            {
              component: "FastAPI",
              role: "REST API layer",
              desc: "Async Python web framework. Validates requests, manages job lifecycle state transitions, enqueues computation tasks, and serves results back to the browser.",
            },
            {
              component: "Celery",
              role: "Distributed task execution",
              desc: "Executes long-running backtest and stress-test jobs in a separate worker process so the API remains non-blocking. Single queue; tasks are idempotent and serialized as JSON.",
            },
            {
              component: "Redis",
              role: "Message broker + result backend",
              desc: "Acts as the message queue between FastAPI and Celery workers. Also stores intermediate task state (PENDING → STARTED → SUCCESS / FAILURE) and short-lived result payloads.",
            },
            {
              component: "DuckDB",
              role: "Analytical data store",
              desc: "Embedded columnar database holding all OHLCV market data and precomputed factor exposures for NIFTY 50 constituents. No network round-trip; queried in-process by the Celery worker.",
            },
            {
              component: "Backtesting engine",
              role: "Vectorized compute core",
              desc: "Pure Python + NumPy/pandas vectorized engine. Converts factor scores into portfolio weights, computes daily and cumulative returns. Same code path executes both the baseline and the stressed run.",
            },
          ].map((row, i, arr) => (
            <div
              key={row.component}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 160px 1fr",
                borderBottom: i < arr.length - 1 ? "1px solid #ddddd9" : "none",
              }}
            >
              <div
                style={{
                  padding: "13px 16px",
                  borderRight: "1px solid #ddddd9",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#1a1c18",
                  }}
                >
                  {row.component}
                </span>
              </div>
              <div
                style={{
                  padding: "13px 16px",
                  borderRight: "1px solid #ddddd9",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    letterSpacing: "0.8px",
                    color: "#0f766e",
                    textTransform: "uppercase",
                  }}
                >
                  {row.role}
                </span>
              </div>
              <div style={{ padding: "13px 16px", display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.55 }}>
                  {row.desc}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sardar-grid-divider" />

      {/* ══ §3 USE CASES ════════════════════════════════════════ */}
      <div style={{ padding: "32px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="al-tag" style={{ marginBottom: 8 }}>USE CASES</div>
          <h2 className="al-title-lg">What questions does AlphaLab answer?</h2>
          <p className="al-body" style={{ maxWidth: 520, margin: "10px auto 0" }}>
            Each scenario below corresponds to a real risk a quant researcher faces before
            committing a factor to live trading.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid #1a1c18" }}>
          {[
            {
              num: "01",
              plain: "Will my signal survive a market panic?",
              q: "How much does this factor's Sharpe ratio degrade if NIFTY 50 realized volatility triples overnight — and does the ranking across factor candidates change under that shock?",
            },
            {
              num: "02",
              plain: "Does my signal work when stocks stop moving together?",
              q: "If the cross-sectional correlation structure of NIFTY 50 returns breaks down during a sector rotation, does the portfolio constructed from this factor collapse to near-random performance?",
            },
            {
              num: "03",
              plain: "How bad can my losses get in noisy markets?",
              q: "For a momentum factor with a 20-day lookback, what is the worst realized drawdown when returns are perturbed by historically calibrated noise, compared to the unshocked baseline drawdown?",
            },
            {
              num: "04",
              plain: "Which version of my factor holds up best across all stress scenarios?",
              q: "Across a grid of stress scenarios differing in shock magnitude and correlation decay, which combination of factor and parameter window is most robust — i.e. loses the least Sharpe per unit of shock?",
            },
          ].map((tile, i) => (
            <div
              key={tile.num}
              style={{
                padding: "26px 28px",
                borderRight: i % 2 === 0 ? "1px solid #1a1c18" : "none",
                borderBottom: i < 2 ? "1px solid #1a1c18" : "none",
                background: "#fff",
              }}
            >
              <div className="al-tag" style={{ color: "#0f766e", marginBottom: 8 }}>USE CASE {tile.num}</div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "17px", fontWeight: 500, color: "#1a1c18", marginBottom: 10, lineHeight: 1.3 }}>
                {tile.plain}
              </div>
              <p style={{ fontSize: "12px", color: "#8a9085", lineHeight: 1.7, margin: 0, borderTop: "1px solid #f3f3f1", paddingTop: 10 }}>
                {tile.q}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="sardar-grid-divider" />

      {/* ══ §4 REQUEST LIFECYCLE ═════════════════════════════════ */}
      <div style={{ padding: "32px 0" }}>
        <div style={{ marginBottom: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "end" }}>
          <div>
            <div className="al-tag" style={{ marginBottom: 8 }}>REQUEST LIFECYCLE</div>
            <h2 className="al-title-lg">What happens when you run a backtest?</h2>
          </div>
          <p className="al-body">
            When you hit "Run", your request travels through five distinct layers before
            results appear on screen. The heavy computation always happens in the background
            worker — the browser never crunches numbers, it only sends instructions and
            displays the finished output.
          </p>
        </div>

        {/* Step cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, border: "1px solid #1a1c18" }}>
          {[
            {
              step: "01",
              from: "Browser",
              to: "FastAPI",
              async: false,
              title: "You submit your request",
              plain: "You pick a factor and a stress scenario in the UI and click Run. The browser sends a single HTTP request to the API with your chosen parameters.",
              technical: "POST /factors/{id}/backtest — synchronous HTTP with factor_id + scenario params in the JSON body.",
            },
            {
              step: "02",
              from: "FastAPI",
              to: "FastAPI",
              async: false,
              title: "The API validates and acknowledges",
              plain: "The server checks your request is valid, creates a job record, and immediately sends back a unique job ID. It doesn't make you wait — the actual work hasn't started yet.",
              technical: "Pydantic schema validation → job row written with status=QUEUED → 202 Accepted {job_id} returned to browser.",
            },
            {
              step: "03",
              from: "FastAPI",
              to: "Redis",
              async: true,
              title: "The task is queued",
              plain: "The API drops a task message into Redis (the queue). This is asynchronous — the API's work is done. The message sits in the queue waiting for a worker to pick it up.",
              technical: "Celery .delay() → task message serialized to Redis broker. API returns immediately without blocking.",
            },
            {
              step: "04",
              from: "Redis",
              to: "Celery worker",
              async: true,
              title: "The worker picks up the job",
              plain: "The Celery worker process is always listening. It picks up your task from the queue and marks it as Running, so the browser knows work has started.",
              technical: "Worker dequeues message → transitions job status QUEUED → RUNNING in the result backend.",
            },
            {
              step: "05",
              from: "Celery worker",
              to: "DuckDB → Celery worker",
              async: false,
              title: "The real calculation happens — entirely on the server",
              plain: "This is the core step. The worker reads 5 years of NIFTY 50 stock prices directly from DuckDB, runs the baseline backtest, then applies your chosen stress scenario to the same data and re-runs the backtest. Both runs use the exact same calculation code — only the input data differs.",
              technical: "(5a) SELECT ohlcv + factor_values from DuckDB. (5b) Vectorized baseline backtest. (5c) ★ Perturbation engine perturbs r_{i,t} server-side with reproducible seed. (5d) Identical backtest re-run on r̃_{i,t}. Results written to DuckDB.",
              highlight: true,
            },
            {
              step: "06",
              from: "Celery worker",
              to: "Redis",
              async: true,
              title: "Results are stored and status updated",
              plain: "The worker saves both the baseline and stressed equity curves, plus the delta metrics (Sharpe change, drawdown change), and marks the job as Complete.",
              technical: "INSERT results into DuckDB results table. SET job status → COMPLETE in Redis result backend.",
            },
            {
              step: "07–08",
              from: "Browser",
              to: "FastAPI → Browser",
              async: true,
              title: "Your browser polls and receives results",
              plain: "While the worker was running, the browser kept checking \"is it done yet?\" every few seconds. Once the status flips to Complete, the browser fetches the full results and Recharts draws the two equity curves side by side.",
              technical: "Browser polls GET /jobs/{job_id}/status on exponential backoff (500 ms → 5 s cap). On COMPLETE: fetch results payload → render baseline + stressed curves via Recharts.",
            },
          ].map((s, i, arr) => (
            <div
              key={s.step}
              style={{
                display: "grid",
                gridTemplateColumns: "64px 1fr",
                borderBottom: i < arr.length - 1 ? "1px solid #ddddd9" : "none",
                background: s.highlight ? "rgba(15,118,110,0.03)" : "#fff",
              }}
            >
              {/* Step number column */}
              <div
                style={{
                  borderRight: s.highlight ? "3px solid #0f766e" : "1px solid #ddddd9",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  paddingTop: 24,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: s.highlight ? "#0f766e" : "#8a9085",
                  }}
                >
                  {s.step}
                </span>
              </div>

              {/* Content column */}
              <div style={{ padding: "20px 24px" }}>
                {/* Route badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", fontFamily: "var(--font-mono)", background: "#f3f3f1", border: "1px solid #ddddd9", padding: "2px 8px", whiteSpace: "nowrap" }}>
                    {s.from}
                  </span>
                  <span style={{ fontSize: "9px", color: "#8a9085" }}>{s.async ? "- - - -▶" : "──────▶"}</span>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", fontFamily: "var(--font-mono)", background: "#f3f3f1", border: "1px solid #ddddd9", padding: "2px 8px", whiteSpace: "nowrap" }}>
                    {s.to}
                  </span>
                  {s.async && <span style={{ fontSize: "8px", color: "#8a9085", fontStyle: "italic" }}>async</span>}
                </div>

                {/* Title */}
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "18px", fontWeight: 500, color: s.highlight ? "#0f766e" : "#1a1c18", marginBottom: 8, lineHeight: 1.3 }}>
                  {s.title}
                </div>

                {/* Plain explanation */}
                <p style={{ fontSize: "13px", color: "#5c6059", lineHeight: 1.7, margin: "0 0 10px" }}>
                  {s.plain}
                </p>

                {/* Technical detail */}
                <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#8a9085", background: "#fbfbfa", border: "1px solid #f0f0ee", padding: "7px 12px", lineHeight: 1.6 }}>
                  {s.technical}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Integrity callout */}
        <div
          style={{
            marginTop: 16,
            border: "1px solid #ddddd9",
            borderLeft: "3px solid #0f766e",
            background: "rgba(15,118,110,0.03)",
            padding: "14px 20px",
            display: "flex",
            gap: 14,
          }}
        >
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 700, color: "#0f766e", paddingTop: 1, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            INTEGRITY NOTE
          </div>
          <p style={{ fontSize: "11px", color: "#5c6059", lineHeight: 1.65, margin: 0 }}>
            Step 05 runs entirely server-side in the Celery worker. An earlier version of AlphaLab had a bug where the
            stressed series was generated in the browser using random numbers disconnected from real market data — meaning
            the comparison was meaningless. The perturbation engine now reads the same DuckDB return series as the baseline,
            applies structured mathematical shocks, and re-runs the identical backtest logic — so any difference you see
            between the two curves is real and attributable only to the stress scenario.
          </p>
        </div>
      </div>

      <div className="sardar-grid-divider" />

      {/* ══ §5 SUBSYSTEM DEEP-DIVES ═════════════════════════════ */}
      <div style={{ padding: "32px 0" }}>
        <div style={{ marginBottom: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "end" }}>
          <div>
            <div className="al-tag" style={{ marginBottom: 8 }}>SUBSYSTEM DEEP-DIVES</div>
            <h2 className="al-title-lg">How every layer connects</h2>
          </div>
          <p className="al-body">
            Click any node in the interactive architecture map below to inspect the mathematical transformations,
            code symbols, and database interfaces running at that layer.
          </p>
        </div>

        {/* ── Detailed Lifecycle Walkthrough (Surrounding Prose) ───── */}
        <div style={{ marginTop: 24, marginBottom: 48 }}>
          <div className="al-tag" style={{ marginBottom: 12 }}>SYSTEM LIFECYCLE SEQUENCE</div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            {[
              {
                step: "01",
                title: "Client request payload transmission",
                flow: "Browser UI ──[ JSON HTTP Request ]──> FastAPI Web Server",
                prose: "Triggered immediately when the user clicks 'Run Stress Test' in the factor editor interface. The browser transmits the factor mathematical DSL string alongside the target simulation constraints. Unlike generic configurations, the request payload contains specific JSON keys defining the factor definition, the target index constituents, start/end dates, and the shock magnitude. This client-side trigger starts the lifecycle.",
                tech: "POST /api/factors/{id}/backtest\nPayload: {\n  \"factor_dsl\": \"Momentum(20) / Volatility(10)\",\n  \"scenario_type\": \"gaussian\",\n  \"shock_level\": 0.02,\n  \"tickers\": [\"RELIANCE\", \"TCS\", \"INFY\", ...],\n  \"start_date\": \"2021-01-01\",\n  \"end_date\": \"2026-01-01\"\n}"
              },
              {
                step: "02",
                title: "API validation, persistence, and task enqueueing",
                flow: "FastAPI Web Server ──[ SQL INSERT / Task Serialization ]──> PostgreSQL / Redis Broker",
                prose: "FastAPI receives the inbound HTTP payload. It validates the configuration object against Pydantic models. It then writes a job entry into the PostgreSQL database using SQL Alchemy, transitioning the job's state machine state from 'queued' to 'running'. To prevent API gateway timeouts on long-running compute operations, the API does not execute the backtest. It serializes the job config and enqueues it to Redis.",
                tech: "DB State transition: queued -> running\nRedis Broker command: LPUSH celery_queue \"{job_id: uuid, config: ...}\"\nHTTP Response returned to client: 202 Accepted { \"job_id\": \"uuid-v4\", \"status\": \"queued\" }"
              },
              {
                step: "03",
                title: "Celery task allocation and resource distribution",
                flow: "Redis Broker ──[ Celery Task Reservation ]──> Worker Process Pool",
                prose: "The Celery worker pool polls the Redis broker. A worker process reserves the enqueued task. The task distribution relies on Celery's standard asynchronous scheduling protocols. Because NumPy and Pandas operations are highly vectorized and utilize underlying multithreaded BLAS libraries, the worker pool uses a specific setup configuration depending on the deployment environment (such as macOS solo process constraints) to prevent thread locks.",
                tech: "Celery Worker process configuration: pool=solo (macos resource constraints)\nQueue Name: celery\nConcurrency: 1 worker thread (vectorized pandas handles math parallelism internally)"
              },
              {
                step: "04",
                title: "DuckDB columnar database pricing queries",
                flow: "Celery Worker ──[ SQL Read Query ]──> DuckDB Storage",
                prose: "The worker process initiates connection to the local embedded DuckDB database file. Because DuckDB stores data in a columnar format, it executes vectorized reads on the exact tickers and dates requested. It bypasses disk overhead by loading the relevant database columns directly into memory as a Pandas DataFrame. The query pulls the pricing and volume series necessary to calculate both baseline and perturbed returns.",
                tech: "SQL Query: SELECT date, ticker, close, adj_close, volume FROM ohlcv WHERE ticker IN ('RELIANCE', 'TCS', ...) AND date BETWEEN '2021-01-01' AND '2026-01-01';\nReturns: pd.DataFrame with shape (N_tickers * Days, 5)"
              },
              {
                step: "05",
                title: "Baseline execution & Stress engine perturbation math",
                flow: "Celery Worker ──[ Pandas math transformations ]──> Backtest Engine",
                prose: "The worker first executes the factor function compiled from the DSL AST across the historical series. The signal weights are calculated, and the baseline portfolio return series is computed using a vectorized dot product. Then, the PerturbedStorage proxy intercepts data requests. Instead of creating fake data from scratch, it derives the perturbed series directly from the real returns. It multiplies price columns by noise drawn from a normal distribution N(1, s^2) or drops consecutive chunks of trading bars, maintaining cross-sectional covariance. The run is seeded for reproducibility.",
                tech: "Baseline return: Rp,t = sum(w_i,t * r_i,t+1)\nPerturbation: r_perturbed = r_actual * (1 + N(0, noise_level^2))\nSeeding: np.random.default_rng(seed) ensuring byte-for-byte reproducibility"
              },
              {
                step: "06",
                title: "Persisting backtest output and caching results",
                flow: "Celery Worker ──[ SQL UPDATE / Cache Write ]──> PostgreSQL / DuckDB",
                prose: "Once both backtest streams complete, the Celery worker computes comparison metrics (Sharpe ratio difference, Max Drawdown shift, CAGR) and writes them to PostgreSQL. It also saves the full daily return arrays in DuckDB. The results are cached using a key generated by hashing the input configuration parameters. This prevents re-running backtests if another user submits the exact same config.",
                tech: "Cache Key: SHA-256(canonical_json({factor_id, scenario_type, shock_level, data_version}))\nPostgreSQL SQL UPDATE: UPDATE jobs SET status='completed', results_json='...' WHERE id='uuid-v4'"
              },
              {
                step: "07",
                title: "Client-side job polling loop",
                flow: "Browser UI ──[ Polling HTTP GET ]──> FastAPI Web Server",
                prose: "While the worker process executes the calculations, the frontend client polls the API status endpoint. The polling loop operates on an exponential backoff starting at 500ms up to a maximum of 3 seconds. The API queries PostgreSQL and returns the job status. When status equals 'completed', the loop terminates and triggers the visualization update.",
                tech: "GET /api/jobs/{id}/status\nPolling Interval: t_next = min(t_prev * 1.5, 3000ms)\nResponse status returned: running -> completed"
              },
              {
                step: "08",
                title: "Result rendering and chart visualization",
                flow: "FastAPI Web Server ──[ JSON Response ]──> Browser UI (Recharts)",
                prose: "The browser receives the final payload. The JSON packet contains historical coordinate dictionaries, performance metrics, and the LLM verdict string. The frontend loads the return arrays into a Recharts line chart, displaying the baseline equity curve alongside the stressed equity curve. Delta tables display metric changes, and annotations display the text verdict.",
                tech: "Visual Render: Recharts LineChart using array of { date: string, baseline: float, stressed: float }\nAnnotations: displays string returned from LLM Verdict engine"
              }
            ].map(item => (
              <div key={item.step} style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      fontWeight: 700,
                      background: "#1a1c18",
                      color: "#fff",
                      padding: "2px 6px"
                    }}>
                      {item.step}
                    </span>
                    <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#1a1c18", margin: 0 }}>
                      {item.title}
                    </h3>
                  </div>
                  <span style={{ fontSize: "9.5px", fontFamily: "var(--font-mono)", color: "#8a9085", fontWeight: 600 }}>
                    {item.flow}
                  </span>
                </div>
                
                <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, margin: 0 }}>
                  {item.prose}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Technical architecture diagram ───────────────── */}
        {(() => {
          const activeCol = "#0f766e";
          const inactiveCol = "#8a9085";

          // Define node dimensions and coordinates
          type TechNode = {
            id: string;
            label: string;
            badge: string;
            cx: number;
            cy: number;
            w: number;
            h: number;
            type: "orch" | "compute" | "storage" | "external";
            sub: string;
          };

          const NODES: TechNode[] = [
            { id: "api",     label: "API Orchestration",        badge: "5a", cx: 450, cy: 40,  w: 160, h: 46, type: "orch",     sub: "FastAPI + Job Manager" },
            { id: "dsl",     label: "DSL Compiler",             badge: "5f", cx: 160, cy: 110, w: 140, h: 42, type: "compute",  sub: "AST static validator" },
            { id: "ingest",  label: "Ingestion Pipeline",       badge: "5j", cx: 740, cy: 110, w: 140, h: 42, type: "compute",  sub: "Yahoo Finance feed" },
            { id: "eval",    label: "Factor Evaluator",         badge: "5g", cx: 160, cy: 190, w: 140, h: 42, type: "compute",  sub: "Signal weight matrix" },
            { id: "data",    label: "DuckDB Database",          badge: "5b", cx: 740, cy: 190, w: 140, h: 42, type: "storage",  sub: "Columnar OHLCV" },
            { id: "backtest",label: "Backtesting Engine",       badge: "5c", cx: 160, cy: 270, w: 140, h: 42, type: "compute",  sub: "Baseline simulation" },
            { id: "perturb", label: "PerturbedStorage",         badge: "5h", cx: 450, cy: 190, w: 140, h: 42, type: "storage",  sub: "Storage intercept proxy" },
            { id: "stress",  label: "Stress & Noise Engine",    badge: "5d", cx: 450, cy: 270, w: 160, h: 42, type: "compute",  sub: "Perturb scenario run" },
            { id: "cache",   label: "Results & Caching",        badge: "5e", cx: 450, cy: 350, w: 160, h: 46, type: "storage",  sub: "Redis / postgres cache" },
            { id: "verdict", label: "LLM Verdict Engine",      badge: "5i", cx: 740, cy: 350, w: 140, h: 42, type: "external", sub: "Gemini / OpenAI API" },
          ];

          type TechEdge = {
            from: string;
            to: string;
            label: string;
            fromPort: "t" | "b" | "l" | "r";
            toPort: "t" | "b" | "l" | "r";
            dashed?: boolean;
          };

          const EDGES: TechEdge[] = [
            { from: "api",      to: "dsl",      label: "factor formula string",           fromPort: "l", toPort: "t" },
            { from: "api",      to: "ingest",   label: "bootstrap trigger",               fromPort: "r", toPort: "t" },
            { from: "dsl",      to: "eval",     label: "compiled execute() callable",     fromPort: "b", toPort: "t" },
            { from: "ingest",   to: "data",     label: "clean OHLCV DataFrame",           fromPort: "b", toPort: "t" },
            { from: "data",     to: "eval",     label: "5-yr historical OHLCV data",      fromPort: "l", toPort: "r", dashed: true },
            { from: "eval",     to: "backtest", label: "portfolio weights matrix",        fromPort: "b", toPort: "t" },
            { from: "data",     to: "perturb",  label: "OHLCV data intercepts",           fromPort: "l", toPort: "r", dashed: true },
            { from: "perturb",  to: "stress",   label: "perturbed pricing arrays",        fromPort: "b", toPort: "t" },
            { from: "backtest", to: "cache",    label: "baseline return series",          fromPort: "b", toPort: "l" },
            { from: "stress",   to: "cache",    label: "stressed return series",          fromPort: "b", toPort: "t" },
            { from: "cache",    to: "verdict",  label: "Sharpe/Drawdown metrics dict",    fromPort: "r", toPort: "l" },
            { from: "verdict",  to: "cache",    label: "single-sentence diagnostic text", fromPort: "b", toPort: "r", dashed: true },
          ];

          const getPortCoords = (node: TechNode, port: "t" | "b" | "l" | "r") => {
            if (port === "t") return { x: node.cx, y: node.cy - node.h / 2 };
            if (port === "b") return { x: node.cx, y: node.cy + node.h / 2 };
            if (port === "l") return { x: node.cx - node.w / 2, y: node.cy };
            return { x: node.cx + node.w / 2, y: node.cy };
          };

          const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

          const typeColors = {
            orch:     { fill: "#1a1c18", stroke: "#1a1c18", text: "#ffffff" },
            compute:  { fill: "#f0fdf4", stroke: "#16a34a", text: "#166534" },
            storage:  { fill: "#ecfeff", stroke: "#0891b2", text: "#155e75" },
            external: { fill: "#fff7ed", stroke: "#ea580c", text: "#9a3412" },
          } as const;

          return (
            <div style={{ marginBottom: 0 }}>
              {/* Legend & Categories */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#fbfbfa",
                border: "1px solid #ddddd9",
                padding: "12px 18px",
                borderBottom: "none",
                flexWrap: "wrap",
                gap: 12
              }}>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {Object.entries(typeColors).map(([key, value]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 14,
                        height: 10,
                        background: value.fill,
                        border: `1px solid ${value.stroke}`,
                        borderRadius: 1
                      }} />
                      <span style={{ fontSize: "9px", color: "#5c6059", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                        {key === "orch" ? "Orchestration" : key === "compute" ? "Execution / Math" : key === "storage" ? "Data / Caching" : "External APIs"}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 18, height: 1, borderTop: "1px solid #1a1c18" }} />
                    <span style={{ fontSize: "9px", color: "#8a9085", fontFamily: "var(--font-mono)" }}>Synchronous call</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 18, height: 1, borderTop: "1px dashed #8a9085" }} />
                    <span style={{ fontSize: "9px", color: "#8a9085", fontFamily: "var(--font-mono)" }}>Asynchronous dispatch</span>
                  </div>
                </div>
              </div>

              {/* SVG Map */}
              <div style={{ border: "1px solid #1a1c18", background: "#ffffff", overflowX: "auto" }}>
                <svg
                  viewBox="0 0 900 410"
                  style={{ width: "100%", maxWidth: 900, display: "block", userSelect: "none" }}
                >
                  <defs>
                    <marker id="arrowhead" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill="#4b5563" />
                    </marker>
                    <marker id="arrowhead-active" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill={activeCol} />
                    </marker>
                  </defs>

                  {/* Edges / Connections */}
                  {EDGES.map((edge, i) => {
                    const fromNode = nodeMap[edge.from];
                    const toNode = nodeMap[edge.to];
                    if (!fromNode || !toNode) return null;

                    const fp = getPortCoords(fromNode, edge.fromPort);
                    const tp = getPortCoords(toNode, edge.toPort);

                    const isHighlight = activeSubsystem === edge.from || activeSubsystem === edge.to;
                    const strokeColor = isHighlight ? activeCol : "#cbd5e1";
                    const strokeWidth = isHighlight ? 1.8 : 1;

                    // Draw clean path with a midpoint bend if they are far
                    const dx = tp.x - fp.x;
                    const dy = tp.y - fp.y;
                    let pathD = `M ${fp.x} ${fp.y}`;

                    if (Math.abs(dx) > 10 && Math.abs(dy) > 10) {
                      // Curved helper path
                      const cx1 = fp.x + (edge.fromPort === "l" ? -dx * 0.3 : edge.fromPort === "r" ? dx * 0.3 : 0);
                      const cy1 = fp.y + (edge.fromPort === "t" ? -dy * 0.3 : edge.fromPort === "b" ? dy * 0.3 : 0);
                      const cx2 = tp.x + (edge.toPort === "l" ? -dx * 0.3 : edge.toPort === "r" ? dx * 0.3 : 0);
                      const cy2 = tp.y + (edge.toPort === "t" ? -dy * 0.3 : edge.toPort === "b" ? dy * 0.3 : 0);
                      pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tp.x} ${tp.y}`;
                    } else {
                      // Straight or L-bend
                      pathD += ` L ${tp.x} ${tp.y}`;
                    }

                    return (
                      <g key={i}>
                        <path
                          d={pathD}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeDasharray={edge.dashed ? "4 3" : undefined}
                          markerEnd={isHighlight ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                          style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
                        />
                        {/* Edge Label text container */}
                        <text
                          x={fp.x + dx * 0.5}
                          y={fp.y + dy * 0.5 - 5}
                          fontSize={7.5}
                          fontFamily="var(--font-mono)"
                          fill={isHighlight ? activeCol : "#64748b"}
                          textAnchor="middle"
                          style={{ pointerEvents: "none", transition: "fill 0.2s" }}
                        >
                          {edge.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Labeled Boxes */}
                  {NODES.map(node => {
                    const isActive = activeSubsystem === node.id;
                    const styleConf = typeColors[node.type];

                    const strokeColor = isActive ? activeCol : styleConf.stroke;
                    const fillColor = isActive ? "rgba(15,118,110,0.06)" : styleConf.fill;
                    const textColor = isActive ? activeCol : styleConf.text;
                    const strokeWidth = isActive ? 2.5 : 1.2;

                    return (
                      <g
                        key={node.id}
                        onClick={() => setActiveSubsystem(node.id)}
                        style={{ cursor: "pointer" }}
                      >
                        {/* Main box */}
                        <rect
                          x={node.cx - node.w / 2}
                          y={node.cy - node.h / 2}
                          width={node.w}
                          height={node.h}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          rx={2}
                          style={{ transition: "all 0.15s ease" }}
                        />
                        {/* Section badge code indicator */}
                        <text
                          x={node.cx - node.w / 2 + 6}
                          y={node.cy - node.h / 2 + 11}
                          fontSize={7}
                          fontFamily="var(--font-mono)"
                          fill={isActive ? activeCol : "#94a3b8"}
                          fontWeight={700}
                        >
                          §{node.badge}
                        </text>
                        {/* Main label text */}
                        <text
                          x={node.cx}
                          y={node.cy + 1}
                          fontSize={9.5}
                          fontWeight={700}
                          fontFamily="var(--font-sans)"
                          fill={isActive ? activeCol : (node.type === "orch" ? "#ffffff" : "#1e293b")}
                          textAnchor="middle"
                        >
                          {node.label}
                        </text>
                        {/* Subtitle description */}
                        <text
                          x={node.cx}
                          y={node.cy + 11}
                          fontSize={7.5}
                          fontFamily="var(--font-sans)"
                          fill={isActive ? activeCol : (node.type === "orch" ? "#cbd5e1" : "#64748b")}
                          textAnchor="middle"
                        >
                          {node.sub}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Status bar */}
              <div style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#fbfbfa",
                border: "1px solid #1a1c18",
                padding: "8px 16px"
              }}>
                <span style={{ fontSize: "11px", color: "#8a9085", fontFamily: "var(--font-mono)" }}>
                  ACTIVE DOCUMENTATION LAYER:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {SUBSYSTEMS.map(n => (
                    <button
                      key={n.id}
                      onClick={() => setActiveSubsystem(n.id)}
                      style={{
                        padding: "4px 8px",
                        fontSize: "9px",
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        cursor: "pointer",
                        border: activeSubsystem === n.id ? "1px solid #0f766e" : "1px solid #ddddd9",
                        background: activeSubsystem === n.id ? "rgba(15,118,110,0.07)" : "#ffffff",
                        color: activeSubsystem === n.id ? "#0f766e" : "#8a9085",
                        transition: "all 0.15s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {n.badge} {n.label.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}


        <div style={{ border: "1px solid #1a1c18", borderTop: "1px solid #ddddd9", background: "#fff", marginTop: 16 }}>

          {/* ── 5a API ──────────────────────────────────────────── */}
          {activeSubsystem === "api" && (
            <div style={{ padding: 32 }}>
              <h3 className="al-title-md" style={{ marginBottom: 6 }}>
                API &amp; Job Orchestration Layer
              </h3>
              <p className="al-body" style={{ marginBottom: 28 }}>
                FastAPI handles all inbound HTTP traffic. Job lifecycle management is the
                primary responsibility — the API itself performs no computation.
              </p>

              <div className="al-tag" style={{ marginBottom: 12 }}>FLOWCHART — Request path</div>
              <div
                style={{
                  border: "1px solid #ddddd9",
                  background: "#fbfbfa",
                  padding: 20,
                  marginBottom: 28,
                  overflowX: "auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "nowrap",
                    gap: 0,
                    minWidth: 560,
                    marginBottom: 16,
                  }}
                >
                  <Box label="POST /factors/{id}/backtest" sub="JSON body: scenario params" />
                  <Arr label="validate" />
                  <Box label="Pydantic schema check" sub="400 on bad input" />
                  <Arr label="pass" />
                  <Box label="Create job record" sub="status = QUEUED" />
                  <Arr label="202 + job_id" />
                  <Box label="Celery .delay()" sub="task → Redis" />
                  <Arr label="async" dashed />
                  <Box label="Worker picks up" sub="status → RUNNING" accent />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "nowrap",
                    gap: 0,
                    minWidth: 400,
                  }}
                >
                  <Box label="GET /jobs/{job_id}/status" sub="browser polls" />
                  <Arr label="reads" />
                  <Box label="Job status lookup" sub="QUEUED/RUNNING/COMPLETE/FAILED" />
                  <Arr label="returns" />
                  <Box label="{ status, result? }" sub="result when COMPLETE" accent />
                </div>
              </div>

              <div className="al-tag" style={{ marginBottom: 12 }}>EXPLANATION</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#1a1c18", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Idempotency
                  </div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7 }}>
                    Each job is keyed on <M>{"(factor_id, scenario_hash)"}</M>. If a request
                    arrives for an already-completed job, the API returns the cached result without
                    enqueuing a new task — prevents duplicate computation when the browser retries.
                  </p>
                </div>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#1a1c18", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Job state machine
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {["QUEUED", "→", "RUNNING", "→", "COMPLETE"].map((s, i) => (
                      <span key={i} style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        fontWeight: 600,
                        color: s === "→" ? "#8a9085" : "#1a1c18",
                        background: s === "→" ? "transparent" : "#f3f3f1",
                        padding: s === "→" ? 0 : "3px 8px",
                        border: s === "→" ? "none" : "1px solid #ddddd9",
                      }}>{s}</span>
                    ))}
                    <span style={{ color: "#8a9085", fontSize: "10px" }}>or</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 600, color: "#b91c1c", background: "#fef2f2", padding: "3px 8px", border: "1px solid #fca5a5" }}>FAILED</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7 }}>
                    Transitions are written by both the API (QUEUED) and the worker (RUNNING,
                    COMPLETE, FAILED). The browser only reads job status — it never writes.
                  </p>
                </div>
              </div>

              <div className="al-tag" style={{ marginBottom: 12 }}>POLLING BACKOFF SCHEDULE</div>
              <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20 }}>
                <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 8 }}>
                  The browser polls <M>{"GET /jobs/{job_id}/status"}</M> on exponential backoff.
                  Wait before the <em>n</em>-th poll:
                </p>
                <FormulaBlock>{"t_n = min(t_0 · 2^(n−1),  t_max)\n\nt_0 = 500 ms   (initial interval)\nt_max = 5000 ms  (cap)"}</FormulaBlock>
                <p style={{ fontSize: "11px", color: "#8a9085", marginTop: 8, lineHeight: 1.6 }}>
                  For a typical backtest completing in 2–4 s, the browser makes at most 3–4 poll
                  requests before receiving COMPLETE status.
                </p>
              </div>
            </div>
          )}

          {/* ── 5b Data Layer ────────────────────────────────────── */}
          {activeSubsystem === "data" && (
            <div style={{ padding: 32 }}>
              <h3 className="al-title-md" style={{ marginBottom: 6 }}>
                Data Layer — DuckDB
              </h3>
              <p className="al-body" style={{ marginBottom: 28 }}>
                All market data for NIFTY 50 constituents is stored in an embedded DuckDB file.
                The worker reads from it in-process — no TCP connection, no serialization overhead.
              </p>

              <div className="al-tag" style={{ marginBottom: 12 }}>SCHEMA DIAGRAM</div>
              <div
                style={{
                  border: "1px solid #ddddd9",
                  background: "#fbfbfa",
                  padding: 20,
                  marginBottom: 28,
                  overflowX: "auto",
                }}
              >
                <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                  {[
                    {
                      name: "ohlcv",
                      cols: ["ticker   VARCHAR", "date     DATE", "open     FLOAT", "high     FLOAT", "low      FLOAT", "close    FLOAT", "volume   BIGINT", "adj_close FLOAT"],
                    },
                    {
                      name: "factor_values",
                      cols: ["factor_id  VARCHAR", "ticker     VARCHAR", "date       DATE", "score      FLOAT"],
                    },
                    {
                      name: "universe",
                      cols: ["ticker      VARCHAR", "entry_date  DATE", "exit_date   DATE", "index_name  VARCHAR"],
                    },
                  ].map((tbl, ti, arr) => (
                    <React.Fragment key={tbl.name}>
                      <div style={{ border: "1px solid #1a1c18", background: "#fff", minWidth: 150 }}>
                        <div style={{ background: "#1a1c18", color: "#fff", padding: "5px 12px", fontSize: "9px", fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.5px" }}>
                          {tbl.name}
                        </div>
                        {tbl.cols.map((c) => (
                          <div key={c} style={{ padding: "3px 12px", fontSize: "9px", fontFamily: "var(--font-mono)", color: "#5c6059", borderBottom: "1px solid #f3f3f1" }}>{c}</div>
                        ))}
                      </div>
                      {ti < arr.length - 1 && (
                        <div style={{ display: "flex", alignItems: "center", paddingTop: 40 }}>
                          <Arr label="JOIN" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                  <div style={{ display: "flex", alignItems: "center", paddingTop: 40 }}>
                    <Arr label="→ worker DataFrame" />
                  </div>
                </div>
              </div>

              <div className="al-tag" style={{ marginBottom: 12 }}>EXPLANATION</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#1a1c18", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Why DuckDB?</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7 }}>
                    DuckDB is columnar: a rolling 20-day mean across 50 tickers scans a single column, not
                    50 × 20 row lookups. PostgreSQL (row-oriented, network-bound) is optimized for OLTP;
                    DuckDB is purpose-built for this analytical scan pattern. No server process means zero
                    cold-start latency.
                  </p>
                </div>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#1a1c18", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Precomputed vs. on-demand</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7 }}>
                    Raw OHLCV data and factor scores are precomputed and stored. Daily returns are computed
                    on-demand by the worker from <M>adj_close</M> to ensure corporate-action-adjusted
                    accuracy. Universe membership is point-in-time filtered to avoid look-ahead bias.
                  </p>
                </div>
              </div>

              <div className="al-tag" style={{ marginBottom: 12 }}>RETURN CALCULATION</div>
              <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20 }}>
                <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 8 }}>
                  Daily simple returns from split/dividend-adjusted close prices:
                </p>
                <FormulaBlock>{"r_t = (P_t − P_{t−1}) / P_{t−1}"}</FormulaBlock>
                <p style={{ fontSize: "11px", color: "#8a9085", marginTop: 8, lineHeight: 1.6 }}>
                  <M>{"P_t"}</M> is the adjusted close price on day <em>t</em>. Using{" "}
                  <M>adj_close</M> means stock splits and dividends are already reflected — the
                  return series is economically comparable across the full lookback window without
                  an additional corporate-action adjustment step.
                </p>
              </div>
            </div>
          )}

          {/* ── 5c Backtesting Engine ───────────────────────────── */}
          {activeSubsystem === "backtest" && (
            <div style={{ padding: 32 }}>
              <h3 className="al-title-md" style={{ marginBottom: 6 }}>
                Backtesting Engine — Baseline Path
              </h3>
              <p className="al-body" style={{ marginBottom: 28 }}>
                The backtesting engine converts factor scores into a portfolio weight vector and
                computes the resulting return series. The entire computation is vectorized — no
                per-day Python loops.
              </p>

              <div className="al-tag" style={{ marginBottom: 12 }}>PIPELINE DIAGRAM — Vectorized computation</div>
              <div
                style={{
                  border: "1px solid #ddddd9",
                  background: "#fbfbfa",
                  padding: 20,
                  marginBottom: 28,
                  overflowX: "auto",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "nowrap", minWidth: 640 }}>
                  <Box label="Factor scores" sub="[date × ticker] DataFrame" />
                  <Arr label="cross-sect. rank" />
                  <Box label="Weights w_{i,t}" sub="long-short, sum-to-zero" />
                  <Arr label="hadamard ·" />
                  <Box label="Daily returns r_{i,t}" sub="from DuckDB adj_close" />
                  <Arr label="Σ w·r" />
                  <Box label="R_{p,t}" sub="portfolio return, scalar/day" />
                  <Arr label="cumprod" />
                  <Box label="C_t — equity curve" sub="cumulative return series" accent />
                </div>
              </div>

              <div className="al-tag" style={{ marginBottom: 12 }}>EXPLANATION</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28 }}>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#1a1c18", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Factor scores to weights</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7 }}>
                    On each date <em>t</em>, raw factor scores are cross-sectionally ranked and z-scored
                    across the NIFTY 50 universe. The top-half receives positive weight; the bottom-half
                    negative weight. Weights sum to zero (dollar-neutral long/short) and are scaled so{" "}
                    <M>{"|w|_1 = 1"}</M>.
                  </p>
                </div>
                <div>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#1a1c18", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Vectorization</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7 }}>
                    The full date range is evaluated in one set of pandas/NumPy operations on 2D arrays
                    (<M>{"T × N"}</M> matrices), not a Python for-loop per trading day. This reduces a
                    5-year, 50-stock backtest from several seconds to sub-100 ms.
                  </p>
                </div>
              </div>

              <div className="al-tag" style={{ marginBottom: 12 }}>MATHEMATICS</div>
              <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Portfolio return (daily)
                    </div>
                    <FormulaBlock>{"R_{p,t} = Σᵢ wᵢ,ₜ · rᵢ,ₜ   (i = 1…N)"}</FormulaBlock>
                    <p style={{ fontSize: "11px", color: "#8a9085", marginTop: 6, lineHeight: 1.6 }}>
                      <M>N</M> = NIFTY 50 constituent count on date <em>t</em> (varies as index
                      membership changes). <M>{"wᵢ,ₜ"}</M> = portfolio weight for asset <em>i</em>.
                    </p>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Cumulative return
                    </div>
                    <FormulaBlock>{"C_t = Πˢ⁼¹ᵗ (1 + R_{p,s}) − 1"}</FormulaBlock>
                    <p style={{ fontSize: "11px", color: "#8a9085", marginTop: 6, lineHeight: 1.6 }}>
                      Compounding daily portfolio returns. Both baseline and stressed series use this
                      same formula — they differ only in their input <M>{"rᵢ,ₜ"}</M> sequence.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 5d Stress & Noise Engine ─────────────────────────── */}
          {activeSubsystem === "stress" && (
            <div style={{ padding: 32 }}>
              <h3 className="al-title-md" style={{ marginBottom: 6 }}>
                Stress &amp; Noise Engine
              </h3>
              <p className="al-body" style={{ marginBottom: 4 }}>
                The differentiating subsystem of AlphaLab. Perturbs the historical return series to
                simulate adverse market conditions, then re-runs the identical backtest on the
                perturbed data.
              </p>
              <div
                style={{
                  marginBottom: 28,
                  padding: "9px 14px",
                  background: "rgba(15,118,110,0.05)",
                  border: "1px solid rgba(15,118,110,0.2)",
                  fontSize: "11px",
                  color: "#0f766e",
                  fontWeight: 500,
                }}
              >
                All perturbation runs server-side in the Celery worker from DuckDB historical data.
                No synthetic data is created independently of the real return series.
              </div>

              <div className="al-tag" style={{ marginBottom: 12 }}>PIPELINE DIAGRAM — Perturbation engine</div>
              <div
                style={{
                  border: "1px solid #ddddd9",
                  background: "#fbfbfa",
                  padding: 20,
                  marginBottom: 28,
                  overflowX: "auto",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "nowrap", marginBottom: 10, minWidth: 560 }}>
                  <Box label="Historical r_{i,t}" sub="from DuckDB (real data)" />
                  <Arr />
                  <Box label="Empirical covariance Σ" sub="estimated from lookback window" />
                  <Arr />
                  <Box label="Cholesky factor L" sub="Σ = LL^T" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "nowrap", minWidth: 660 }}>
                  <Box label="Scenario params" sub="λ, δ_factor, scenario type, seed s" />
                  <Arr />
                  <Box label="★ Perturbation generator" sub="seeded with s (reproducible)" accent />
                  <Arr label="r̃_{i,t}" />
                  <Box label="Backtest engine §5c" sub="identical code path" />
                  <Arr />
                  <Box label="Stressed series C̃_t" sub="ΔSharpe, ΔDrawdown" accent />
                </div>
                <p style={{ fontSize: "9px", color: "#8a9085", marginTop: 10 }}>
                  ★ The perturbation generator takes real historical covariance as input — it does not synthesize a fake series independently of the real data.
                </p>
              </div>

              <div className="al-tag" style={{ marginBottom: 12 }}>SCENARIO TYPES</div>
              <div style={{ border: "1px solid #ddddd9", background: "#fff", marginBottom: 28 }}>
                {[
                  { type: "Volatility shock", desc: "Scales the dispersion of daily returns by λ (e.g. λ=3 simulates volatility tripling) while preserving per-asset means and cross-asset correlations. Mimics a VIX spike event." },
                  { type: "Correlated noise injection", desc: "Adds a vector of random shocks that respect the empirical covariance structure via Cholesky decomposition, so shocked assets move together in economically sensible ways — not independently." },
                  { type: "Factor-specific shock", desc: "Targets only the return component attributable to a specific factor loading β_i. Simulates a sudden repricing of a factor (e.g. value factor flips from rewarded to penalized)." },
                  { type: "Historical scenario replay", desc: "Uses the empirical return distribution from a specific historical stress period (e.g. March 2020) as shock magnitude calibration, applying that period's covariance structure to the full backtest window." },
                ].map((s, i, arr) => (
                  <div key={s.type} style={{ padding: "12px 20px", borderBottom: i < arr.length - 1 ? "1px solid #f3f3f1" : "none", display: "flex", gap: 16 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "9px", fontWeight: 700, color: "#1a1c18", minWidth: 160, paddingTop: 2, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.3px" }}>{s.type}</div>
                    <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                  </div>
                ))}
              </div>

              <div className="al-tag" style={{ marginBottom: 12 }}>MATHEMATICS — FULL DERIVATION</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* 1 */}
                <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>1 — Baseline return vector and covariance matrix</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 8 }}>
                    Let <M>N</M> be constituent count and <M>T</M> the lookback window. The daily return vector
                    and its empirical covariance:
                  </p>
                  <FormulaBlock>{"r_t ∈ ℝᴺ          (daily return vector, date t)\n\nΣ = (1/T) · Σₜ (r_t − r̄)(r_t − r̄)ᵀ    (N×N empirical covariance)"}</FormulaBlock>
                  <p style={{ fontSize: "11px", color: "#8a9085", marginTop: 8, lineHeight: 1.6 }}>
                    <M>Σ</M> is estimated from the same historical window as the backtest — the perturbation
                    respects actual correlation structure observed in the data.
                  </p>
                </div>

                {/* 2 */}
                <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>2 — Volatility shock: scale dispersion by λ</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 8 }}>
                    To scale volatility by <M>λ</M> while preserving per-asset means and correlations:
                  </p>
                  <FormulaBlock>{"r̃ᵢ,ₜ = r̄ᵢ + λ · (rᵢ,ₜ − r̄ᵢ)"}</FormulaBlock>
                  <p style={{ fontSize: "11px", color: "#8a9085", marginTop: 8, lineHeight: 1.6 }}>
                    where <M>r̄ᵢ</M> is asset <em>i</em>&apos;s sample mean. When <M>{"λ = 1"}</M> the series is unchanged.
                    Mean is preserved because <M>{"E[r̃ᵢ,ₜ] = r̄ᵢ + λ·(E[rᵢ,ₜ] − r̄ᵢ) = r̄ᵢ"}</M>.
                  </p>
                </div>

                {/* 3 — Cholesky */}
                <div style={{ border: "1px solid #1a1c18", background: "#fbfbfa", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#1a1c18", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>3 — Correlated noise via Cholesky decomposition ★ (core method)</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 12 }}>
                    To inject noise that preserves real cross-asset correlation (rather than i.i.d. per-asset
                    noise, which incorrectly decorrelates stocks):
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: "8px", color: "#8a9085", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Step 1 — Cholesky factorize Σ:</div>
                      <FormulaBlock>{"Σ = LLᵀ       (L is lower-triangular Cholesky factor)"}</FormulaBlock>
                    </div>
                    <div>
                      <div style={{ fontSize: "8px", color: "#8a9085", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Step 2 — Draw i.i.d. standard normal shocks (seeded):</div>
                      <FormulaBlock>{"z ~ 𝒩(0, I),   z ∈ ℝᴺ       (seeded with scenario seed s)"}</FormulaBlock>
                    </div>
                    <div>
                      <div style={{ fontSize: "8px", color: "#8a9085", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Step 3 — Construct correlated shock vector:</div>
                      <FormulaBlock>{"ε = Lz    →    Cov(ε) = L·Cov(z)·Lᵀ = L·I·Lᵀ = LLᵀ = Σ"}</FormulaBlock>
                    </div>
                    <div>
                      <div style={{ fontSize: "8px", color: "#8a9085", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Step 4 — Inject into historical returns:</div>
                      <FormulaBlock>{"r̃ᵢ,ₜ = rᵢ,ₜ + εᵢ,ₜ"}</FormulaBlock>
                    </div>
                  </div>
                  <p style={{ fontSize: "11px", color: "#8a9085", marginTop: 10, lineHeight: 1.6 }}>
                    The Cholesky route guarantees the injected noise <M>ε</M> has covariance{" "}
                    <M>Σ</M> by construction — shocked assets move together as they did historically,
                    not independently.
                  </p>
                </div>

                {/* 4 */}
                <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>4 — Factor-specific shock</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 8 }}>
                    Perturbs only the return component attributable to a targeted factor loading:
                  </p>
                  <FormulaBlock>{"r̃ᵢ,ₜ = rᵢ,ₜ + βᵢ · δ_factor"}</FormulaBlock>
                  <p style={{ fontSize: "11px", color: "#8a9085", marginTop: 8, lineHeight: 1.6 }}>
                    <M>βᵢ</M> = asset <em>i</em>&apos;s factor score on the current date.{" "}
                    <M>δ_factor</M> = scenario shock magnitude (signed, in return units). High-exposure
                    assets receive larger shocks; low/negative exposure assets are largely unaffected or
                    move inversely.
                  </p>
                </div>

                {/* 5 */}
                <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>5 — Reproducibility</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 8 }}>
                    All random draws use a scenario-specific seed <M>s</M> derived deterministically:
                  </p>
                  <FormulaBlock>{"s = hash(scenario_type ‖ factor_id ‖ λ ‖ δ_factor)  mod 2³²\n\nz = numpy.random.default_rng(s).standard_normal(N)"}</FormulaBlock>
                  <p style={{ fontSize: "11px", color: "#8a9085", marginTop: 8, lineHeight: 1.6 }}>
                    Given identical scenario parameters, <M>s</M> is identical → <M>z</M> identical →{" "}
                    <M>ε</M> identical → stressed series is byte-for-byte reproducible. Required for
                    backtest credibility: re-running the same scenario must produce the same result.
                  </p>
                </div>

                {/* 6 */}
                <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>6 — Stressed performance metrics</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 8 }}>
                    Shocked returns <M>{"r̃ᵢ,ₜ"}</M> pass through the identical §5c formulas:
                  </p>
                  <FormulaBlock>{"R̃_{p,t} = Σᵢ wᵢ,ₜ · r̃ᵢ,ₜ\n\nC̃_t = Πˢ⁼¹ᵗ (1 + R̃_{p,s}) − 1"}</FormulaBlock>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, margin: "10px 0 8px" }}>
                    Delta metrics reported in the UI:
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <FormulaBlock>{"ΔSharpe = Sharpe(R̃_p) − Sharpe(R_p)"}</FormulaBlock>
                    <FormulaBlock>{"ΔMaxDD  = MaxDD(C̃)    − MaxDD(C)"}</FormulaBlock>
                  </div>
                  <p style={{ fontSize: "11px", color: "#8a9085", marginTop: 10, lineHeight: 1.6 }}>
                    Because both series use the same backtest code path, any difference is attributable
                    solely to the perturbed input returns, not to different computation logic.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── 5e Results & Caching ─────────────────────────────── */}
          {activeSubsystem === "cache" && (
            <div style={{ padding: 32 }}>
              <h3 className="al-title-md" style={{ marginBottom: 6 }}>
                Results Delivery &amp; Caching
              </h3>
              <p className="al-body" style={{ marginBottom: 28 }}>
                Completed results are content-addressed by a hash of their inputs so that identical
                scenario+factor combinations are served from cache without re-running the backtest.
              </p>

              <div className="al-tag" style={{ marginBottom: 12 }}>CACHING FLOWCHART</div>
              <div
                style={{
                  border: "1px solid #ddddd9",
                  background: "#fbfbfa",
                  padding: 20,
                  marginBottom: 28,
                  overflowX: "auto",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "nowrap", marginBottom: 16, minWidth: 480 }}>
                  <Box label="Request arrives" sub="factor_id + scenario params" />
                  <Arr label="hash inputs" />
                  <Box label="Compute cache key k" sub="SHA-256 of canonical params" />
                  <Arr label="lookup k" />
                  <Box label="Redis / DuckDB cache" sub="keyed by k,  TTL = 86 400 s" />
                </div>
                <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#0f766e", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>CACHE HIT</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                      <Box label="Return cached result" sub="no computation" />
                      <Arr label="200 ~30ms" />
                      <Box label="Browser renders" sub="Recharts" accent />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#b91c1c", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>CACHE MISS</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                      <Box label="Enqueue new task" sub="full §4 lifecycle" />
                      <Arr label="202 + poll" />
                      <Box label="Browser polls" sub="~2–4 s P50" accent />
                    </div>
                  </div>
                </div>
              </div>

              <div className="al-tag" style={{ marginBottom: 12 }}>CACHE KEY CONSTRUCTION</div>
              <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20, marginBottom: 16 }}>
                <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 8 }}>
                  The cache key is a SHA-256 digest of the canonical JSON serialization of all inputs
                  that determine the result:
                </p>
                <FormulaBlock>{"k = SHA-256(\n  canonical_json({ factor_id, scenario_type, λ, δ_factor, seed_s, data_version })\n)"}</FormulaBlock>
                <p style={{ fontSize: "11px", color: "#8a9085", marginTop: 8, lineHeight: 1.6 }}>
                  <M>data_version</M> is a monotonically increasing integer incremented when the
                  underlying DuckDB market data is refreshed — invalidating all cached results when
                  source data changes, preventing stale results after a data update.
                </p>
              </div>

              <div className="al-tag" style={{ marginBottom: 12 }}>TTL FORMULA</div>
              <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20 }}>
                <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 8 }}>
                  Cache entries expire after a fixed TTL. Expiry timestamp for an entry written at{" "}
                  <M>t₀</M>:
                </p>
                <FormulaBlock>{"t_expire = t₀ + TTL     where TTL = 86 400 s  (24 hours)"}</FormulaBlock>
                <p style={{ fontSize: "11px", color: "#8a9085", marginTop: 8, lineHeight: 1.6 }}>
                  NIFTY 50 data is refreshed daily after market close (~15:30 IST). A result cached
                  after close will be invalidated by the following day&apos;s data refresh via the{" "}
                  <M>data_version</M> mechanism before the TTL fires. The TTL acts as a safety net for
                  entries created before a failed or partial data refresh.
                </p>
              </div>
            </div>
          )}

          {/* --- 5f DSL Compiler ------------------------------------ */}
          {activeSubsystem === "dsl" && (
            <div style={{ padding: 32 }}>
              <h3 className="al-title-md" style={{ marginBottom: 6 }}>DSL Compiler</h3>
              <p className="al-body" style={{ marginBottom: 6 }}>
                Every factor you type - e.g. <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "#f3f3f1", padding: "1px 6px" }}>Momentum(20) / Volatility(10)</code> - is a formula written in AlphaLab's own Domain-Specific Language. Before any backtest runs, that string is compiled in five sequential stages into an executable Python function.
              </p>
              <p className="al-body" style={{ marginBottom: 24, color: "#8a9085" }}>
                Think of it like a tiny programming language purpose-built for quant signals. The compiler checks your formula for mathematical validity and - critically - rejects any formula that would peek at future data and thus produce a misleadingly good backtest.
              </p>

              <div className="al-tag" style={{ marginBottom: 12 }}>COMPILATION PIPELINE</div>
              <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20, marginBottom: 28, overflowX: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 640 }}>
                  <Box label="Raw formula string" sub='"Momentum(20)/Volatility(10)"' />
                  <Arr label="step 1" />
                  <Box label="Lexer" sub="tokenises into NUMBER / IDENTIFIER / OP" />
                  <Arr label="step 2" />
                  <Box label="Parser" sub="recursive descent -> AST" />
                  <Arr label="step 3" />
                  <Box label="StaticValidator" sub="arity + look-ahead bias checks" accent />
                  <Arr label="step 4" />
                  <Box label="PandasCompiler" sub="AST -> Python callable" />
                  <Arr label="step 5" />
                  <Box label="execute(df)" sub="returns Series of signals" accent />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
                <div style={{ border: "1px solid #ddddd9", background: "#fff", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Step 1 - Lexer (lexer.py)</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 8 }}>
                    Scans the raw string character-by-character using a regex OR-chain and emits a flat list of typed tokens: NUMBER, IDENTIFIER, LPAREN, RPAREN, COMMA, and the four operators. Whitespace is silently dropped. Unknown characters raise DSLCompilationError.
                  </p>
                  <FormulaBlock>{`"Momentum(20)" ->\n  IDENTIFIER("Momentum")  LPAREN  NUMBER(20)  RPAREN`}</FormulaBlock>
                </div>
                <div style={{ border: "1px solid #ddddd9", background: "#fff", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Step 2 - Parser (parser.py)</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 8 }}>
                    Recursive-descent parser that consumes the token stream and builds an Abstract Syntax Tree. Handles operator precedence (* / before + -) and nested function calls. Produces three node types: FunctionCall, BinaryOp, NumberLiteral.
                  </p>
                  <FormulaBlock>{`Momentum(20) / Volatility(10) ->\n  BinaryOp(\n    left  = FunctionCall(Momentum, [20]),\n    op    = \"/\",\n    right = FunctionCall(Volatility, [10])\n  )`}</FormulaBlock>
                </div>
                <div style={{ border: "1px solid #ddddd9", background: "#fff", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Step 3 - StaticValidator (validator.py)</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 8 }}>
                    Traverses the AST and enforces: (1) every function name is in the registry (14 supported primitives), (2) argument counts match declared arity, (3) no negative shifts in Lag/delay - a negative shift would read future data. Raises DataLeakageError for look-ahead violations.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      ["Momentum / Volatility / RollingMean / RollingStd", "1 arg (window > 0)"],
                      ["delay / Lag", "2 args * shift must be >= 0 (negative -> DataLeakageError)"],
                      ["ts_max / ts_min / ts_rank", "2 args * window must be > 0"],
                      ["correlation", "3 args * window must be > 0"],
                      ["rank / scale / delta", "2 args each * window/shift must be > 0"],
                    ].map(([fn, rule]) => (
                      <div key={fn} style={{ display: "flex", gap: 12, fontSize: "10px", fontFamily: "var(--font-mono)", alignItems: "flex-start" }}>
                        <span style={{ fontWeight: 700, color: "#1a1c18", minWidth: 200, flexShrink: 0 }}>{fn}</span>
                        <span style={{ color: "#8a9085" }}>- {rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ border: "1px solid #ddddd9", background: "#fff", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Step 4 - PandasCompiler (compiler.py)</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 8 }}>
                    Recursively transforms each AST node into a Python lambda that operates on a Pandas DataFrame. The root lambda becomes the execute function handed to FactorEvaluator. At runtime execute(df) returns a Series of daily factor scores for one ticker.
                  </p>
                  <FormulaBlock>{`FunctionCall(Momentum, [20])\n  -> lambda df: df[\"close\"].pct_change(20)\n\nBinaryOp(left, \"/\", right)\n  -> lambda df: left(df) / right(df)\n\n# scalar broadcast guard:\nif isinstance(result, int | float):\n    return pd.Series(result, index=df.index)`}</FormulaBlock>
                </div>
              </div>
            </div>
          )}

          {/* --- 5g Factor Evaluator + Portfolio Constructor --------- */}
          {activeSubsystem === "eval" && (
            <div style={{ padding: 32 }}>
              <h3 className="al-title-md" style={{ marginBottom: 6 }}>Factor Evaluator & Portfolio Constructor</h3>
              <p className="al-body" style={{ marginBottom: 6 }}>
                Once the DSL compiler produces an execute(df) function, two classes bridge the gap between a formula that scores one ticker and a weighted portfolio ready for backtesting.
              </p>
              <p className="al-body" style={{ marginBottom: 24, color: "#8a9085" }}>
                The evaluator applies the compiled function independently to each of the 50 NIFTY constituents, then the portfolio constructor converts those raw scores into dollar-neutral weights by cross-sectionally z-scoring them each day. Long positions go to stocks with above-average signals; short positions to below-average.
              </p>

              <div className="al-tag" style={{ marginBottom: 12 }}>SIGNAL-TO-WEIGHT PIPELINE</div>
              <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20, marginBottom: 28, overflowX: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 680 }}>
                  <Box label="compiled execute(df)" sub="DSL output" />
                  <Arr label="groupby ticker" />
                  <Box label="FactorEvaluator" sub="signals_df: date x ticker x signal" accent />
                  <Arr label="optional rank pass" />
                  <Box label="CrossSectionalProcessor" sub="rank(pct=True) per date" />
                  <Arr label="z-score" />
                  <Box label="PortfolioConstructor" sub="weights_df: date x ticker x weight" accent />
                  <Arr label="to backtest" />
                  <Box label="PerformanceCalculator" sub="daily portfolio returns" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ border: "1px solid #ddddd9", background: "#fff", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>FactorEvaluator - evaluator.py</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 10 }}>
                    Reads OHLCV from storage (adj_close is renamed to close), adds returns = close.pct_change() per ticker, then applies execute(df) to each ticker group via groupby("ticker").apply(). NaN rows from rolling warm-up are dropped. If the formula contains rank(, cross-sectional percentile ranking is applied as a second pass.
                  </p>
                  <FormulaBlock>{`for each ticker group g:\n  signal = execute(g)   # pandas Series\n  append { date, ticker, signal }\n\ndrop NaN (rolling window warm-up)\n\nif "rank(" in formula:\n  signal = groupby(date)[signal].rank(pct=True)`}</FormulaBlock>
                </div>
                <div style={{ border: "1px solid #ddddd9", background: "#fff", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>PortfolioConstructor - portfolio.py</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 10 }}>
                    On each trading day, z-scores the cross-section of signals, then normalises so gross exposure = 1.0. Positive z-scores give long positions; negative give short. If all signals are identical (zero cross-sectional variance), all weights are zeroed to prevent division-by-zero.
                  </p>
                  <FormulaBlock>{`For each date t:\n  z_i = (signal_i - mean_t) / std_t     # cross-sectional\n  w_i = z_i / Sum|z_i|               # gross exposure = 1\n\n  if std_t == 0:  w_i = 0  (all weights zero)\n\nR_{p,t} = Sum_i  w_{i,t} * r_{i,t+1}  # forward return`}</FormulaBlock>
                </div>
              </div>
            </div>
          )}

          {/* --- 5h PerturbedStorage --------------------------------- */}
          {activeSubsystem === "perturb" && (
            <div style={{ padding: 32 }}>
              <h3 className="al-title-md" style={{ marginBottom: 6 }}>PerturbedStorage - the real stress mechanism</h3>
              <p className="al-body" style={{ marginBottom: 6 }}>
                The stress engine does not modify formulas or weights. It wraps the DuckDB storage layer in a transparent proxy that intercepts read_ohlcv() calls and returns perturbed price data - so the backtest engine runs its normal code without knowing the data has been shocked.
              </p>
              <p className="al-body" style={{ marginBottom: 24, color: "#8a9085" }}>
                There are two perturbation functions. Gaussian noise simulates volatile market conditions where prices jump more than usual. Missing-data drops simulate exchange outages, failed data feeds, or survivorship gaps where some daily bars simply never arrived.
              </p>

              <div className="al-tag" style={{ marginBottom: 12 }}>PROXY ARCHITECTURE</div>
              <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20, marginBottom: 28, overflowX: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 600, marginBottom: 14 }}>
                  <Box label="Backtest engine" sub="calls read_ohlcv(tickers, t0, t1)" />
                  <Arr />
                  <Box label="PerturbedStorage" sub="intercepts the call" accent />
                  <Arr />
                  <Box label="DuckDBStorage" sub="reads real prices" />
                  <Arr label="apply perturb_func" />
                  <Box label="perturbed DataFrame" sub="returned to engine" accent />
                </div>
                <FormulaBlock>{`class PerturbedStorage(Storage):   # transparent proxy\n  def read_ohlcv(self, ...) -> MarketDataset:\n    dataset  = self.base_storage.read_ohlcv(...)  # real data\n    perturbed = self.perturb_func(dataset.data)   # apply shock\n    return MarketDataset(data=perturbed, ...)      # engine sees this`}</FormulaBlock>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ border: "1px solid #ddddd9", background: "#fff", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>perturb_gaussian - Gaussian price noise</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 10 }}>
                    Multiplies every price column (open, high, low, close, adj_close) by a common per-row noise factor drawn from N(1, sigma^2). Using the same multiplier across OHLC preserves bar logic (high &gt;= low) - then a max/min clamp enforces this exactly. Volume gets its own independent draw.
                  </p>
                  <FormulaBlock>{`rng = np.random.default_rng(seed)   # seeded, reproducible\nnoise_i ~ N(0, noise_level^2)         # per row i\n\nprice_col_i  *= (1 + noise_i)        # same factor for OHLC\nhigh_i = max(open_i, close_i, high_i)  # re-clamp\nlow_i  = min(open_i, close_i, low_i)\n\nSigma levels in use: 0.5%  1%  2%  3%  5%  10%`}</FormulaBlock>
                </div>
                <div style={{ border: "1px solid #ddddd9", background: "#fff", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>perturb_missing_data - consecutive bar drops</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 10 }}>
                    For each ticker independently, drops drop_rate x N rows in chunks of chunk_size=5 consecutive days. Chunked dropping simulates real-world missing-data patterns (exchange halts, provider outages) rather than random scatter across isolated days.
                  </p>
                  <FormulaBlock>{`rng = np.random.default_rng(seed)   # seeded\nfor each ticker group:\n  num_to_drop  = round(N * drop_rate)\n  num_chunks   = num_to_drop // chunk_size (=5)\n  for each chunk:\n    start = rng.integers(0, N)\n    drop indices [start, start + chunk_size)\n\ndrop_rate levels: 5%  10%  20%  30%`}</FormulaBlock>
                </div>
              </div>
            </div>
          )}

          {/* --- 5i LLM Verdict Engine ------------------------------- */}
          {activeSubsystem === "verdict" && (
            <div style={{ padding: 32 }}>
              <h3 className="al-title-md" style={{ marginBottom: 6 }}>LLM Verdict Engine</h3>
              <p className="al-body" style={{ marginBottom: 6 }}>
                After every completed backtest, AlphaLab automatically generates a one-sentence human-readable verdict for each key metric - Sharpe ratio, Information Coefficient, Max Drawdown, and overall Robustness Score. These appear as annotations next to the numbers in the results UI.
              </p>
              <p className="al-body" style={{ marginBottom: 24, color: "#8a9085" }}>
                The verdict is generated by calling Gemini 1.5 Flash (or GPT-4o-mini as fallback) with a structured prompt containing the exact metric values. If both API keys are absent or the call fails within 8 seconds, a deterministic rule-based verdict fires silently - so the system always produces output and the backtest job never fails because of the LLM.
              </p>

              <div className="al-tag" style={{ marginBottom: 12 }}>VERDICT GENERATION FLOW</div>
              <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20, marginBottom: 28, overflowX: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 680 }}>
                  <Box label="Backtest complete" sub="Sharpe, IC, MDD, robustness_score" />
                  <Arr />
                  <Box label="verdicts.py" sub="4 verdict functions" accent />
                  <Arr label="GEMINI_API_KEY?" />
                  <Box label="Gemini 1.5 Flash" sub="temp=0.1 * max_tokens=60 * timeout=8s" />
                  <Arr label="else / timeout" />
                  <Box label="GPT-4o-mini" sub="openai fallback" />
                  <Arr label="else" />
                  <Box label="Rule-based string" sub="deterministic, always fires" accent />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                {[
                  {
                    fn: "get_sharpe_verdict(sharpe, mean, std)",
                    rules: ["sharpe < 0.5  ->  \"Weak risk-adjusted returns\"", "sharpe >= 1.0  ->  \"Strong risk-adjusted returns\"", "else         ->  \"Moderate risk-adjusted returns\""],
                    prompt: "Analyze Sharpe={sharpe:.4f}, daily_mean={mean:.6f}, std={std:.6f}. One sentence, under 20 words, on risk-adjusted returns.",
                  },
                  {
                    fn: "get_ic_verdict(ic)",
                    rules: ["ic < 0     ->  \"Anti-predictive signal\"", "ic >= 0.05  ->  \"Strong predictive power\"", "else       ->  \"Weak predictive signal\""],
                    prompt: "Analyze IC={ic:.4f}. One sentence on alpha predictability, under 20 words.",
                  },
                  {
                    fn: "get_mdd_verdict(mdd, peak_date, trough_date)",
                    rules: ["mdd > 30%  ->  \"Severe drawdown risk\"", "else       ->  \"Controlled drawdown risk\""],
                    prompt: "Analyze MDD={mdd*100:.2f}%, peak={peak_date}, trough={trough_date}. One sentence on capital preservation.",
                  },
                  {
                    fn: "get_robustness_verdict(score, baseline_sharpe, stressed_avg, failure_reasons)",
                    rules: ["score < 0.80  ->  \"Flagged as overfit\"", "score >= 0.80  ->  \"Highly robust factor\""],
                    prompt: "Analyze robustness_score={score:.4f} (threshold 0.80). One sentence on overfit vs stable.",
                  },
                ].map(v => (
                  <div key={v.fn} style={{ border: "1px solid #ddddd9", background: "#fff", padding: 20 }}>
                    <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "#0f766e", marginBottom: 10, wordBreak: "break-all" }}>{v.fn}</div>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Rule-based fallback</div>
                    {v.rules.map(r => <div key={r} style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#5c6059", marginBottom: 2 }}>{r}</div>)}
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginTop: 10, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>LLM prompt shape</div>
                    <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#8a9085", lineHeight: 1.6 }}>{v.prompt}</div>
                  </div>
                ))}
              </div>

              <div style={{ border: "1px solid #ddddd9", borderLeft: "3px solid #0f766e", background: "rgba(15,118,110,0.03)", padding: "14px 20px" }}>
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#0f766e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Output sanitisation</div>
                <p style={{ fontSize: "11px", color: "#5c6059", lineHeight: 1.65, margin: 0 }}>
                  The LLM response is passed through clean_verdict(): strip quote characters, take only the first sentence, hard-truncate to 120 characters. Temperature is 0.1 to minimise hallucination. The 8-second timeout is enforced via httpx.Client(timeout=8.0) - on timeout the exception is caught, the fallback fires, and the backtest job continues normally.
                </p>
              </div>
            </div>
          )}

          {/* --- 5j Data Ingestion Pipeline ------------------------- */}
          {activeSubsystem === "ingest" && (
            <div style={{ padding: 32 }}>
              <h3 className="al-title-md" style={{ marginBottom: 6 }}>Data Ingestion Pipeline</h3>
              <p className="al-body" style={{ marginBottom: 6 }}>
                Before any backtest can run, the system needs 5 years of NIFTY 50 price history loaded into DuckDB. The ingestion pipeline downloads it from Yahoo Finance, runs it through 4 validators, and writes the clean subset - a one-time bootstrap step that runs via python scripts/bootstrap.py.
              </p>
              <p className="al-body" style={{ marginBottom: 24, color: "#8a9085" }}>
                The pipeline is idempotent: if DuckDB already contains data, bootstrap skips ingestion entirely. When it does run, tickers that fail validation are dropped before writing - a bad ticker cannot corrupt the stored dataset.
              </p>

              <div className="al-tag" style={{ marginBottom: 12 }}>INGESTION PIPELINE - 7 STAGES</div>
              <div style={{ border: "1px solid #ddddd9", background: "#fbfbfa", padding: 20, marginBottom: 28, overflowX: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 0, minWidth: 780 }}>
                  <Box label="NIFTY50Universe" sub="resolve constituents at end_date" />
                  <Arr label="tickers list" />
                  <Box label="YahooProvider" sub="yfinance bulk download" accent />
                  <Arr label="raw_df" />
                  <Box label="DataTransformer" sub="standardise columns -> MarketDataset" />
                  <Arr label="dataset" />
                  <Box label="ValidatorSuite" sub="4 validators in sequence" accent />
                  <Arr label="filter errors" />
                  <Box label="DuckDB write" sub="ohlcv + universe tables" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ border: "1px solid #ddddd9", background: "#fff", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px" }}>4 Validators (data/validation/)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {[
                      ["SchemaValidator", "Required columns present (open, high, low, close, adj_close, volume, ticker, date), correct dtypes, no negative prices."],
                      ["QualityValidator", "Missing value rate below threshold per ticker. Zero-volume days are flagged as warnings (not errors) - the bar survives."],
                      ["CalendarValidator", "Trading days must align to the NSE market calendar. Detects multi-day gaps that indicate provider outages rather than legitimate holidays."],
                      ["CorporateActionsValidator", "Flags large single-day adj_close jumps that may indicate unadjusted splits or dividends in the raw yfinance feed."],
                    ].map(([name, desc]) => (
                      <div key={name}>
                        <div style={{ fontSize: "10px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "#1a1c18", marginBottom: 3 }}>{name}</div>
                        <div style={{ fontSize: "11px", color: "#8a9085", lineHeight: 1.55 }}>{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ border: "1px solid #ddddd9", background: "#fff", padding: 20 }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#8a9085", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Validation output: errors vs warnings</div>
                  <p style={{ fontSize: "12px", color: "#5c6059", lineHeight: 1.7, marginBottom: 12 }}>
                    Validators emit errors or warnings. Only errors cause a ticker to be dropped entirely. Warnings are logged but the ticker survives. A ticker with a few missing days stays in the dataset; a ticker with wrong column types is excluded entirely.
                  </p>
                  <FormulaBlock>{`ValidationReport:\n  warnings: list[Issue]  # logged, ticker kept\n  errors:   list[Issue]  # ticker removed before write\n\nclean_df = raw_df[\n  ~raw_df["ticker"].isin(error_tickers)\n]\n\n# universe entries filtered to match clean tickers\n# -> DuckDB ohlcv <-> universe always consistent`}</FormulaBlock>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
