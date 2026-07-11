"use client";

import { useState, useActionState } from "react";
import { submitExperiment } from "@/lib/actions";
import Link from "next/link";

const DSL_SECTIONS = [
  {
    title: "Available Inputs",
    items: [
      { key: "close, open, high, low", desc: "Daily OHLC prices" },
      { key: "volume, vwap", desc: "Volume and value-weighted avg price" },
      { key: "returns", desc: "Daily log returns" },
    ],
  },
  {
    title: "Registered DSL Functions",
    items: [
      { key: "Momentum(d)", desc: "d-day momentum strategy signal" },
      { key: "Volatility(d)", desc: "d-day rolling volatility" },
      { key: "RollingMean(d)", desc: "d-day rolling arithmetic mean" },
      { key: "RollingStd(d)", desc: "d-day rolling standard deviation" },
      { key: "Lag(x, d)", desc: "x shifted backwards by d days (to detect look-ahead bias)" },
    ],
  },
  {
    title: "Example Factors",
    items: [
      { key: "Momentum(20) / Volatility(30)", desc: "Risk-adjusted price momentum" },
      { key: "RollingMean(10) - RollingMean(50)", desc: "Moving average crossover indicator" },
      { key: "Lag(close, 5) * -1", desc: "5-day lagging reversal signal" },
    ],
  },
];

export default function LabPage() {
  const [openSection, setOpenSection] = useState<string | null>("Available Inputs");

  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return await submitExperiment(formData);
    },
    null
  );

  return (
    <>
      {/* Page header */}
      <div className="main-header">
        <div>
          <div className="al-tag" style={{ marginBottom: "6px" }}>RESEARCH LAB</div>
          <h1 className="al-title-md">New Experiment</h1>
          <p className="page-subtitle">Submit an alpha factor expression for backtesting and robustness evaluation.</p>
        </div>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div className="btn-export">← Back to dashboard</div>
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "32px", alignItems: "flex-start" }}>
        {/* ─── Form ─── */}
        <div className="al-card">
          <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="grid-2">
              <div className="al-field">
                <label className="al-label">Experiment Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Momentum Strategy"
                  required
                  className="al-input"
                />
              </div>
              <div className="al-field">
                <label className="al-label">Factor Name</label>
                <input
                  type="text"
                  name="factor_name"
                  placeholder="e.g. Price Momentum 20D"
                  required
                  className="al-input"
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="al-field">
                <label className="al-label">Universe</label>
                <select disabled className="al-select">
                  <option>NIFTY 50 (Default)</option>
                  <option>S&amp;P 500 (Coming Soon)</option>
                </select>
              </div>
              <div className="al-field">
                <label className="al-label">Date Range</label>
                <select disabled className="al-select">
                  <option>Past 5 Years (Default)</option>
                  <option>Custom (Coming Soon)</option>
                </select>
              </div>
            </div>

            <div className="al-field">
              <label className="al-label">Description (Optional)</label>
              <input type="text" name="description" className="al-input" />
            </div>

            <div className="al-field">
              <label className="al-label">Factor Formula (AST Expression)</label>
              <textarea
                name="factor_formula"
                rows={5}
                placeholder="rank(delta(close, 20)) * -1"
                required
                className="al-textarea"
              />
            </div>

            {state?.error && (
              <div className="al-error">{state.error}</div>
            )}


            <button
              className="btn btn-primary"
              type="submit"
              disabled={isPending}
              style={{ width: "100%", padding: "13px", marginTop: "4px", letterSpacing: "0.5px" }}
            >
              {isPending ? "Running Experiment..." : "Run Backtest & Evaluate"}
            </button>
          </form>
        </div>

        {/* ─── DSL Reference ─── */}
        <div>
          <div style={{ marginBottom: "12px" }}>
            <div className="al-tag" style={{ marginBottom: "6px" }}>DSL REFERENCE</div>
            <div className="al-title-sm" style={{ marginBottom: "6px" }}>Formula Guide</div>
            <p className="al-body">Expressions are evaluated via an AST parser across the NIFTY 50 universe in a vectorised manner.</p>
          </div>

          <div className="dsl-accordion">
            {DSL_SECTIONS.map((section) => (
              <div key={section.title} className="dsl-accordion-item">
                <button
                  className="dsl-accordion-trigger"
                  onClick={() => setOpenSection(openSection === section.title ? null : section.title)}
                >
                  {section.title}
                  <span style={{ color: "#8a9085", fontSize: "16px" }}>
                    {openSection === section.title ? "−" : "+"}
                  </span>
                </button>
                {openSection === section.title && (
                  <div className="dsl-accordion-body">
                    {section.items.map((item) => (
                      <div key={item.key} className="dsl-code-line">
                        <span className="dsl-code-key">{item.key}</span>
                        <span className="dsl-code-desc">— {item.desc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
