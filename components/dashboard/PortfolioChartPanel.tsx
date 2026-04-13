"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartRange, ChartRow } from "@/lib/dashboard-portfolio";

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div
      className="dash-tabular rounded-md px-3 py-2 text-[12px]"
      style={{
        background: "var(--dash-tooltip-bg)",
        border: "1px solid var(--dash-teal)",
        boxShadow: "0 0 0 1px rgba(45,212,191,0.2)",
      }}
    >
      <div className="text-[var(--dash-muted)]">{row.t}</div>
      <div className="text-[var(--dash-gold)] font-semibold">${row.display.toFixed(2)}</div>
    </div>
  );
}

const RANGE_TABS: ChartRange[] = ["1D", "1W", "1M", "3M"];

export function PortfolioChartPanel({
  range,
  onRangeChange,
  data,
  chartKey,
}: {
  range: ChartRange;
  onRangeChange: (r: ChartRange) => void;
  data: ChartRow[];
  chartKey: string;
}) {
  const hasData = data.length > 0;
  const fmtY = useMemo(() => (v: number) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}`, []);

  return (
    <div className="mt-3">
      <div className="mb-2 flex gap-1">
        {RANGE_TABS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRangeChange(r)}
            className={`dash-tabular rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
              range === r
                ? "bg-[rgba(45,212,191,0.15)] text-[var(--dash-teal)]"
                : "text-[var(--dash-muted)] hover:text-[var(--dash-text)]"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="h-[180px] w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 6, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dashAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--dash-teal)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--dash-teal)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--dash-chart-grid)" vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fill: "var(--dash-muted)", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "var(--dash-border)" }}
                interval="preserveStartEnd"
              />
              <YAxis
                orientation="right"
                width={44}
                tick={{ fill: "var(--dash-muted)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtY}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(148,163,184,0.25)" }} />
              <Area
                type="monotone"
                dataKey="display"
                stroke="none"
                fill="url(#dashAreaFill)"
                isAnimationActive={false}
              />
              <Line
                key={chartKey}
                type="monotone"
                dataKey="display"
                stroke="var(--dash-gold)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive
                animationDuration={1100}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-[var(--dash-border)] border-dashed bg-[rgba(8,12,18,0.4)]">
            <span className="dash-section-label">Awaiting series</span>
          </div>
        )}
      </div>
    </div>
  );
}
