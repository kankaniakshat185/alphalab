"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";

export default function ClientCharts({ equityCurve, robustnessGrid }: { equityCurve: any[], robustnessGrid: any[] }) {
  // Format equity curve date
  const formattedEquity = equityCurve.map(d => ({
    ...d,
    dateStr: new Date(d.date).toLocaleDateString()
  }));

  return (
    <div className="grid-2">
      <div className="card">
        <h3 className="card-title">Backtest Equity Curve</h3>
        <div style={{ width: "100%", height: 300 }}>
          {formattedEquity.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedEquity}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey="dateStr" fontSize={11} tickMargin={10} minTickGap={30} />
                <YAxis domain={["auto", "auto"]} fontSize={11} tickFormatter={(v) => v.toFixed(2)} />
                <Tooltip 
                  labelStyle={{ color: "var(--text-primary)" }}
                  contentStyle={{ borderRadius: "8px", border: "1px solid var(--card-border)", fontSize: "12px" }}
                />
                <Line type="monotone" dataKey="equity" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "var(--text-muted)" }}>
              No backtest data available.
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Robustness Grid (Sharpe vs Noise)</h3>
        <div style={{ width: "100%", height: 300 }}>
          {robustnessGrid.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey="noise_level" type="number" name="Noise Level" unit="%" fontSize={11} tickFormatter={(v) => (v * 100).toFixed(0)} />
                <YAxis dataKey="missing_data" type="number" name="Missing Data" unit="%" fontSize={11} tickFormatter={(v) => (v * 100).toFixed(0)} />
                <ZAxis dataKey="metric_value" range={[50, 400]} name="Sharpe Ratio" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={robustnessGrid} fill="var(--accent)" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "var(--text-muted)" }}>
              No robustness grid data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
