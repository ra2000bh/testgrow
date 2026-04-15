"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
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
      <div className="font-semibold text-[var(--dash-gold)]">${row.display.toFixed(2)}</div>
    </div>
  );
}

const RANGE_TABS: ChartRange[] = ["1D", "1W", "1M", "3M"];

type DotProps = { cx?: number; cy?: number; index?: number; payload?: ChartRow };

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
  const gradId = useId().replace(/:/g, "");
  const [pinIdx, setPinIdx] = useState<number | null>(null);
  const hasData = data.length > 0;
  const fmtY = useMemo(() => (v: number) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0)}`, []);

  useEffect(() => {
    queueMicrotask(() => setPinIdx(null));
  }, [range, chartKey, data.length]);

  const pinned = pinIdx != null && pinIdx >= 0 && pinIdx < data.length ? data[pinIdx] : null;

  const lineDots = (props: DotProps) => {
    const { cx, cy, index } = props;
    if (cx == null || cy == null || index == null) return <g />;
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={11}
          fill="transparent"
          style={{ cursor: "pointer" }}
          onClick={(e) => {
            e.stopPropagation();
            setPinIdx((p) => (p === index ? null : index));
          }}
        />
        {pinIdx === index ? (
          <circle
            cx={cx}
            cy={cy}
            r={4}
            fill="var(--dash-gold)"
            stroke="rgba(8,12,18,0.9)"
            strokeWidth={1}
          />
        ) : null}
      </g>
    );
  };

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
            <ComposedChart data={data} margin={{ top: 4, right: 6, left: 0, bottom: 2 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--dash-teal)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--dash-teal)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--dash-chart-grid)" vertical={false} />
              <XAxis
                dataKey="t"
                tick={false}
                tickLine={false}
                axisLine={{ stroke: "var(--dash-border)" }}
                height={6}
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
              {pinned ? (
                <ReferenceLine
                  x={pinned.t}
                  stroke="var(--dash-gold)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.85}
                />
              ) : null}
              <Area
                type="monotone"
                dataKey="display"
                stroke="none"
                fill={`url(#${gradId})`}
                isAnimationActive={false}
              />
              <Line
                key={chartKey}
                type="monotone"
                dataKey="display"
                stroke="var(--dash-gold)"
                strokeWidth={1.5}
                dot={lineDots}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-[var(--dash-border)] border-dashed bg-[rgba(8,12,18,0.4)]">
            <span className="dash-section-label">Awaiting series</span>
          </div>
        )}
      </div>
      {pinned ? (
        <p className="dash-tabular mt-2 min-h-[2.25rem] text-center text-[11px] leading-snug text-[var(--dash-muted)]">
          <span className="text-[var(--dash-text)]">{pinned.t}</span>
          <span className="mx-1.5 text-[var(--dash-border-bright)]">·</span>
          <span className="font-semibold text-[var(--dash-gold)]">${pinned.display.toFixed(2)}</span>
        </p>
      ) : null}
    </div>
  );
}
