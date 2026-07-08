"use client";

import { useActionState } from "react";
import { submitExperiment } from "@/lib/actions";

export default function LabPage() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      return await submitExperiment(formData);
    },
    null
  );

  return (
    <div className="tab-panel active" style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: "32px", padding: "40px" }}>
      
      {/* Centered Form Column */}
      <div style={{ flex: "1", maxWidth: "560px" }}>
        <div style={{ marginBottom: "24px", textAlign: "left" }}>
          <h1 className="page-title">Research Lab</h1>
          <p className="page-subtitle">Submit a new alpha factor expression to backtest and evaluate its robustness.</p>
        </div>

        <div className="card">
          <h2 className="card-title">New Experiment</h2>

          <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="grid-2">
              <div>
                <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px", display: "block" }}>Experiment Name</label>
                <input 
                  type="text" 
                  name="name" 
                  placeholder="e.g. Momentum Strategy"
                  required 
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px", display: "block" }}>Factor Name</label>
                <input 
                  type="text" 
                  name="factor_name" 
                  placeholder="e.g. Price Momentum 20D"
                  required 
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", outline: "none" }}
                />
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px", display: "block" }}>Universe</label>
                <select disabled style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", outline: "none", backgroundColor: "#f9fafb", color: "#6b7280" }}>
                  <option>NIFTY 50 (Default)</option>
                  <option>S&P 500 (Coming Soon)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px", display: "block" }}>Date Range</label>
                <select disabled style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", outline: "none", backgroundColor: "#f9fafb", color: "#6b7280" }}>
                  <option>Past 5 Years (Default)</option>
                  <option>Custom (Coming Soon)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px", display: "block" }}>Description (Optional)</label>
              <input 
                type="text" 
                name="description" 
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", outline: "none" }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px", display: "block" }}>Factor Formula (AST Expression)</label>
              <textarea 
                name="factor_formula" 
                rows={4}
                placeholder="rank(delta(close, 20)) * -1"
                required 
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", outline: "none", fontFamily: "'JetBrains Mono', monospace", resize: "vertical" }}
              />
            </div>

            {state?.error && (
              <div style={{ color: "var(--red)", fontSize: "12px", padding: "8px", background: "var(--red-soft)", borderRadius: "6px" }}>
                {state.error}
              </div>
            )}

            <button className="btn btn-primary" type="submit" disabled={isPending} style={{ width: "100%", marginTop: "10px" }}>
              {isPending ? "Running Experiment..." : "Run Backtest & Evaluate"}
            </button>
          </form>
        </div>
      </div>

      {/* DSL Reference Sidebar */}
      <div style={{ flex: "0 0 380px" }}>
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ background: "#e9ecef", color: "#111827", padding: "4px 8px", borderRadius: "8px", fontSize: "14px" }}>📚</span>
            DSL Reference Guide
          </h3>
          <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px", lineHeight: 1.4 }}>
            AlphaLab evaluates expressions natively using AST parsing. Operations happen in a vectorized manner across the universe.
          </p>

          <div style={{ marginBottom: "12px" }}>
            <strong style={{ fontSize: "10px", textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.5px" }}>Available Inputs</strong>
            <ul style={{ fontSize: "11.5px", marginTop: "4px", paddingLeft: "16px", color: "#111827", lineHeight: 1.5 }}>
              <li><strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>close, open, high, low, volume, vwap, returns</strong>: Daily price/volume metrics.</li>
            </ul>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <strong style={{ fontSize: "10px", textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.5px" }}>Cross-Sectional Ops</strong>
            <ul style={{ fontSize: "11.5px", marginTop: "4px", paddingLeft: "16px", color: "#111827", lineHeight: 1.5 }}>
              <li><strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>rank(x)</strong>: Cross-sectional rank of x (0.0 to 1.0).</li>
              <li><strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>scale(x, a)</strong>: Rescales x such that sum(abs(x)) = a.</li>
            </ul>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <strong style={{ fontSize: "10px", textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.5px" }}>Time-Series Ops</strong>
            <ul style={{ fontSize: "11.5px", marginTop: "4px", paddingLeft: "16px", color: "#111827", lineHeight: 1.5 }}>
              <li><strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>delay(x, d)</strong>: Value of x from d days ago.</li>
              <li><strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>delta(x, d)</strong>: Today's x minus x from d days ago.</li>
              <li><strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>ts_max(x, d) / ts_min(x, d)</strong>: Max/min of x over past d days.</li>
              <li><strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>ts_rank(x, d)</strong>: Time-series rank of x over past d days.</li>
              <li><strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>correlation(x, y, d)</strong>: Pearson correlation over d days.</li>
            </ul>
          </div>

          <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <strong style={{ fontSize: "10px", color: "#6b7280" }}>Example 5-Day Reversal Factor:</strong>
            <div style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "#0f172a", marginTop: "4px", wordBreak: "break-all" }}>
              -rank(delta(close, 5))
            </div>
            <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "6px", lineHeight: 1.3 }}>
              This factor ranks stocks based on their 5-day price change, and takes the negative, betting that recent losers will rebound.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
