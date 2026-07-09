"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Brush,
  ReferenceLine,
  BarChart,
  Bar
} from "recharts";

interface ClientChartsProps {
  equityCurve: any[];
  robustnessGrid: any[];
  stressedEquityCurve?: any[];
  overallScore?: number;
  scenarioName?: string;
}

// Find closest trading day dateStr for vertical reference lines
const findClosestDateStr = (targetIsoDate: string, data: any[]) => {
  if (!data || data.length === 0) return "";
  const targetTime = new Date(targetIsoDate).getTime();
  let closestItem = data[0];
  let minDiff = Math.abs(new Date(closestItem.date).getTime() - targetTime);

  for (const item of data) {
    const diff = Math.abs(new Date(item.date).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closestItem = item;
    }
  }
  return new Date(closestItem.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
};

// Calculate summary stats over currently-visible data slice
const calculateStats = (activeData: any[]) => {
  if (!activeData || activeData.length < 2) {
    return {
      baselineLatest: 1.0,
      stressedLatest: 1.0,
      stressedMaxDrawdown: 0,
      baselineSharpe: 0,
      stressedSharpe: 0,
      maxDivergenceDate: "—",
      maxDivergenceVal: 0
    };
  }

  // 1. Latest Values
  const lastItem = activeData[activeData.length - 1];
  const baselineLatest = lastItem["Baseline Factor"];
  const stressedLatest = lastItem["Stressed Factor"];

  // 2. Max Drawdown (Stressed series)
  let maxVal = -1;
  let maxDD = 0;
  for (const item of activeData) {
    const val = item["Stressed Factor"];
    if (val > maxVal) {
      maxVal = val;
    }
    if (maxVal > 0) {
      const dd = (maxVal - val) / maxVal;
      if (dd > maxDD) {
        maxDD = dd;
      }
    }
  }

  // 3. Sharpe Ratios
  // Daily returns = (value_t - value_t-1) / value_t-1
  // We use √252 since the underlying data frequency is daily
  const baselineReturns: number[] = [];
  const stressedReturns: number[] = [];
  for (let i = 1; i < activeData.length; i++) {
    const bPrev = activeData[i - 1]["Baseline Factor"];
    const bCurr = activeData[i]["Baseline Factor"];
    const sPrev = activeData[i - 1]["Stressed Factor"];
    const sCurr = activeData[i]["Stressed Factor"];

    if (bPrev > 0) baselineReturns.push((bCurr - bPrev) / bPrev);
    if (sPrev > 0) stressedReturns.push((sCurr - sPrev) / sPrev);
  }

  const getSharpe = (returns: number[]) => {
    if (returns.length < 2) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
    const std = Math.sqrt(variance);
    if (std === 0) return 0;
    return Math.sqrt(252) * (mean / std);
  };

  const baselineSharpe = getSharpe(baselineReturns);
  const stressedSharpe = getSharpe(stressedReturns);

  // 4. Max Divergence
  let maxDiv = 0;
  let maxDivDate = "—";
  for (const item of activeData) {
    const div = Math.abs(item["Stressed Factor"] - item["Baseline Factor"]);
    if (div > maxDiv) {
      maxDiv = div;
      maxDivDate = item.dateStr;
    }
  }

  return {
    baselineLatest,
    stressedLatest,
    stressedMaxDrawdown: maxDD,
    baselineSharpe,
    stressedSharpe,
    maxDivergenceDate: maxDivDate,
    maxDivergenceVal: maxDiv
  };
};

// Index preset helper
const getPresetIndices = (preset: string, data: any[]) => {
  if (!data || data.length === 0) return { start: 0, end: 0 };
  const endIdx = data.length - 1;
  if (preset === "Max") return { start: 0, end: endIdx };

  const lastDate = new Date(data[endIdx].date);
  let targetYearDiff = 1;
  if (preset === "3Y") targetYearDiff = 3;
  if (preset === "5Y") targetYearDiff = 5;

  const targetTime = lastDate.getTime() - targetYearDiff * 365.25 * 24 * 60 * 60 * 1000;

  let startIdx = 0;
  for (let i = 0; i <= endIdx; i++) {
    if (new Date(data[i].date).getTime() >= targetTime) {
      startIdx = i;
      break;
    }
  }
  return { start: startIdx, end: endIdx };
};

// Premium Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const baseline = data["Baseline Factor"];
    const stressed = data["Stressed Factor"];
    const delta = stressed - baseline;
    const pctDelta = (delta / baseline) * 100;

    return (
      <div style={{
        background: "#1a1c18",
        border: "1px solid #3a3d37",
        padding: "12px 16px",
        color: "#fbfbfa",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        lineHeight: 1.6
      }}>
        <div style={{ fontWeight: 600, color: "#8a9085", marginBottom: "8px", borderBottom: "1px solid #3a3d37", paddingBottom: "4px" }}>
          {label}
        </div>
        <div>
          Baseline: <span style={{ float: "right", paddingLeft: "24px" }}>{baseline.toFixed(4)}</span>
        </div>
        <div style={{ color: "#ef4444" }}>
          Stressed: <span style={{ float: "right", paddingLeft: "24px" }}>{stressed.toFixed(4)}</span>
        </div>
        <div style={{ borderTop: "1px dashed #3a3d37", marginTop: "6px", paddingTop: "4px", color: delta >= 0 ? "#10b981" : "#ef4444" }}>
          Delta: <span style={{ float: "right", paddingLeft: "24px" }}>{delta >= 0 ? "+" : ""}{delta.toFixed(4)}</span>
        </div>
        <div style={{ color: delta >= 0 ? "#10b981" : "#ef4444" }}>
          % Delta: <span style={{ float: "right", paddingLeft: "24px" }}>{delta >= 0 ? "+" : ""}{pctDelta.toFixed(2)}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function ClientCharts({
  equityCurve,
  robustnessGrid,
  stressedEquityCurve = [],
  overallScore = 0.8,
  scenarioName = "FII Selloff Scenario"
}: ClientChartsProps) {
  // 1. Map backend stressed equity curve values for date-aligned lookup
  const stressedMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of stressedEquityCurve) {
      if (item.date && item.cumulative_return != null) {
        const isoDate = new Date(item.date).toISOString().split('T')[0];
        map.set(isoDate, item.cumulative_return);
      }
    }
    return map;
  }, [stressedEquityCurve]);

  const formattedEquity = useMemo(() => {
    return equityCurve.map((d) => {
      const baselineVal = d.cumulative_return;
      const isoDate = new Date(d.date).toISOString().split('T')[0];

      // Lookup real backend-computed stressed value, fallback to baseline if missing
      const stressedVal = stressedMap.has(isoDate)
        ? (stressedMap.get(isoDate) ?? baselineVal)
        : baselineVal;

      return {
        ...d,
        dateStr: new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }),
        "Baseline Factor": parseFloat(baselineVal.toFixed(4)),
        "Stressed Factor": parseFloat(stressedVal.toFixed(4)),
        Divergence: parseFloat((stressedVal - baselineVal).toFixed(4))
      };
    });
  }, [equityCurve, stressedMap]);

  // 2. Localized range state
  const [rangePreset, setRangePreset] = useState("Max");
  const [highlightDate, setHighlightDate] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(() => ({
    start: 0,
    end: Math.max(0, formattedEquity.length - 1)
  }));

  // Resolve closest trading dates for reference lines in NIFTY space
  const refDates = useMemo(() => {
    return {
      covidCrash: findClosestDateStr("2020-03-23", formattedEquity),
      fiiSelloff: findClosestDateStr("2022-06-15", formattedEquity),
      adaniHindenburg: findClosestDateStr("2023-01-24", formattedEquity),
      lokSabhaCrash: findClosestDateStr("2024-06-04", formattedEquity)
    };
  }, [formattedEquity]);

  // Handle Preset changes
  const handlePresetClick = (preset: string) => {
    setRangePreset(preset);
    const indices = getPresetIndices(preset, formattedEquity);
    setZoomIndex(indices);
  };

  // Brush handle change callback
  const handleBrushChange = (range: any) => {
    if (range && typeof range.startIndex === "number" && typeof range.endIndex === "number") {
      setRangePreset("Custom");
      setZoomIndex({ start: range.startIndex, end: range.endIndex });
    }
  };

  // 3. Compute stats dynamically for the zoomed window slice
  const activeDataSlice = useMemo(() => {
    return formattedEquity.slice(zoomIndex.start, zoomIndex.end + 1);
  }, [formattedEquity, zoomIndex]);

  const stats = useMemo(() => {
    return calculateStats(activeDataSlice);
  }, [activeDataSlice]);

  // Calculate gradient splitColor offset for divergence area
  const gradientOffset = useMemo(() => {
    const values = activeDataSlice.map(d => d.Divergence);
    if (values.length === 0) return 0.5;
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    if (maxVal - minVal === 0) return 0.5;
    return maxVal / (maxVal - minVal);
  }, [activeDataSlice]);

  // Format robustness grid for display
  const formattedGrid = useMemo(() => {
    return robustnessGrid.map(g => ({
      name: `${g.perturbation === "noise" ? "Noise" : "Drop"} ${(g.level * 100).toFixed(1)}%`,
      Sharpe: g.sharpe,
      Retention: (g.retention * 100).toFixed(0) + "%"
    }));
  }, [robustnessGrid]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", width: "100%" }}>

      {/* ─── SUMMARY STRIP (Zoomed Window Stats) ─── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        border: "1px solid #1a1c18",
        background: "#fbfbfa",
        padding: "16px 20px",
        gap: "24px"
      }}>
        <div>
          <div className="al-tag" style={{ marginBottom: "6px" }}>Latest Value</div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>
            B: {stats.baselineLatest.toFixed(3)} / <span style={{ color: "#b91c1c" }}>S: {stats.stressedLatest.toFixed(3)}</span>
          </div>
          <div style={{ fontSize: "10px", color: "var(--ink-faint)", marginTop: "2px", lineHeight: 1.4 }}>
            Cumulative performance at slice end.
          </div>
          <div style={{ fontSize: "9px", color: "var(--ink-light)", marginTop: "4px", lineHeight: 1.3 }}>
            Reflects the final index level achieved for each series; the gap represents total performance difference.
          </div>
        </div>

        <div>
          <div className="al-tag" style={{ marginBottom: "6px" }}>Stressed Max DD</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "#b91c1c" }}>
            {(stats.stressedMaxDrawdown * 100).toFixed(2)}%
          </div>
          <div style={{ fontSize: "10px", color: "var(--ink-faint)", marginTop: "2px", lineHeight: 1.4 }}>
            Peak-to-trough stress decline.
          </div>
          <div style={{ fontSize: "9px", color: "var(--ink-light)", marginTop: "4px", lineHeight: 1.3 }}>
            The worst peak-to-trough decline for the Stressed series in the selected date range.
          </div>
        </div>

        <div>
          <div className="al-tag" style={{ marginBottom: "6px" }}>Sharpe (B vs S)</div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>
            B: {stats.baselineSharpe.toFixed(2)} / <span style={{ color: "#b91c1c" }}>S: {stats.stressedSharpe.toFixed(2)}</span>
          </div>
          <div style={{ fontSize: "10px", color: "var(--ink-faint)", marginTop: "2px", lineHeight: 1.4 }}>
            Annualized daily ratio (√252 factor).
          </div>
          <div style={{ fontSize: "9px", color: "var(--ink-light)", marginTop: "4px", lineHeight: 1.3 }}>
            Uses the standard daily √252 annualization; the gap quantifies the risk-adjusted cost of this stress scenario.
          </div>
        </div>

        <div
          onClick={() => {
            if (highlightDate === stats.maxDivergenceDate) {
              setHighlightDate(null);
            } else {
              setHighlightDate(stats.maxDivergenceDate);
            }
          }}
          style={{ cursor: "pointer" }}
          className="hover-card-style"
        >
          <div className="al-tag" style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
            <span>Max Divergence</span>
            <span style={{ color: "#d97706", fontSize: "8.5px", fontWeight: 700 }}>
              {highlightDate === stats.maxDivergenceDate ? "● HIGHLIGHTED" : "⚡ CLICK"}
            </span>
          </div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>
            {stats.maxDivergenceVal.toFixed(3)}
          </div>
          <div style={{ fontSize: "10px", color: "var(--ink-faint)", marginTop: "2px", lineHeight: 1.4 }}>
            Widest point on {stats.maxDivergenceDate}.
          </div>
          <div style={{ fontSize: "9px", color: "var(--ink-light)", marginTop: "4px", lineHeight: 1.3 }}>
            Date and absolute size of the largest gap between the lines. Click stat to highlight this point below.
          </div>
        </div>
      </div>

      {/* ─── TIME PRESETS ROW ─── */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--ink-light)" }}>Time Scale:</span>
        {["1Y", "3Y", "5Y", "Max"].map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            style={{
              padding: "4px 12px",
              border: "1px solid #1a1c18",
              background: rangePreset === preset ? "#1a1c18" : "#fff",
              color: rangePreset === preset ? "#fff" : "#1a1c18",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              fontWeight: 500,
              borderRadius: "0px",
              transition: "all 0.1s"
            }}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* ─── Main Performance Charts Container (stacked vertically & shared state window) ─── */}
      <div className="card" style={{ width: "100%", padding: "24px" }}>
        <div className="al-tag" style={{ marginBottom: "8px" }}>STRATEGY SIMULATION</div>
        <h3 className="card-title" style={{ marginBottom: "20px" }}>Performance Under Stress Testing</h3>

        {/* Upper Panel (75% height) */}
        <div style={{ width: "100%", height: 320 }}>
          {formattedEquity.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeDataSlice} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="#1a1c18" />
                <XAxis dataKey="dateStr" fontSize={10} tickMargin={10} minTickGap={45} tickLine={false} />
                <YAxis domain={["dataMin - 0.01", "dataMax + 0.01"]} fontSize={10} tickLine={false} tickFormatter={(v) => v.toFixed(2)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="plainline" wrapperStyle={{ fontSize: "11px", letterSpacing: "0.5px" }} />

                {/* Historical events overlay annotations */}
                {refDates.covidCrash && (
                  <ReferenceLine x={refDates.covidCrash} stroke="#b91c1c" strokeDasharray="3 3" label={{ value: "COVID Crash", fill: "#b91c1c", fontSize: 9, position: "top" }} />
                )}
                {refDates.fiiSelloff && (
                  <ReferenceLine x={refDates.fiiSelloff} stroke="#b91c1c" strokeDasharray="3 3" label={{ value: "FII Selloff (Fed tightening)", fill: "#b91c1c", fontSize: 9, position: "top" }} />
                )}
                {refDates.adaniHindenburg && (
                  <ReferenceLine x={refDates.adaniHindenburg} stroke="#b91c1c" strokeDasharray="3 3" label={{ value: "Adani-Hindenburg", fill: "#b91c1c", fontSize: 9, position: "top" }} />
                )}
                {refDates.lokSabhaCrash && (
                  <ReferenceLine x={refDates.lokSabhaCrash} stroke="#b91c1c" strokeDasharray="3 3" label={{ value: "Elections Crash", fill: "#b91c1c", fontSize: 9, position: "top" }} />
                )}
                {highlightDate && (
                  <ReferenceLine x={highlightDate} stroke="#d97706" strokeWidth={2} strokeDasharray="4 4" label={{ value: "Max Divergence Pt", fill: "#d97706", fontSize: 9, position: "top" }} />
                )}

                <Line type="monotone" name="Baseline Factor" dataKey="Baseline Factor" stroke="#1a1c18" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" name={`Stressed — ${scenarioName}`} dataKey="Stressed Factor" stroke="#b91c1c" strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "var(--text-muted)" }}>
              No backtest data available.
            </div>
          )}
        </div>

        {/* Lower Divergence Panel (25% height area chart + brush) */}
        <div style={{ width: "100%", height: 160, marginTop: "16px" }}>
          {formattedEquity.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedEquity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset={gradientOffset} stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset={gradientOffset} stopColor="#ef4444" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="#1a1c18" />
                <XAxis dataKey="dateStr" fontSize={10} hide />
                <YAxis fontSize={9} tickLine={false} tickFormatter={(v) => v.toFixed(3)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" name="Divergence (Stressed − Baseline)" dataKey="Divergence" stroke="#8a9085" fill="url(#splitColor)" />
                <Brush
                  dataKey="dateStr"
                  height={20}
                  stroke="#1a1c18"
                  startIndex={zoomIndex.start}
                  endIndex={zoomIndex.end}
                  onChange={handleBrushChange}
                  gap={1}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

      {/* ─── Robustness Grid Stress Chart (Full Width) ─── */}
      <div className="card" style={{ width: "100%", padding: "24px" }}>
        <div className="al-tag" style={{ marginBottom: "8px" }}>STRESS GRID</div>
        <h3 className="card-title" style={{ marginBottom: "16px" }}>Sharpe Retention Across Perturbation Levels</h3>
        <div style={{ width: "100%", height: 320 }}>
          {formattedGrid.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedGrid} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="#1a1c18" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} />
                <YAxis fontSize={10} tickLine={false} tickFormatter={(v) => v.toFixed(2)} />
                <Tooltip
                  contentStyle={{ borderRadius: "0px", border: "1px solid var(--border)", background: "#fff", fontSize: "12px" }}
                />
                <Bar dataKey="Sharpe" fill="#0f766e" radius={[0, 0, 0, 0]} />
              </BarChart>
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
