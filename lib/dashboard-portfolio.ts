import type { PricePoint } from "@/lib/market-data";
import type { Investment } from "@/models/User";

export type ChartRange = "1D" | "1W" | "1M" | "3M";

const RANGE_DAYS: Record<ChartRange, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "3M": 90,
};

export function filterByRange(points: PricePoint[], range: ChartRange): PricePoint[] {
  const days = RANGE_DAYS[range];
  const cutoff = Date.now() - days * 86400000;
  return points.filter((p) => new Date(p.t + "T12:00:00").getTime() >= cutoff);
}

function priceOnOrBefore(series: PricePoint[], tMs: number): number | null {
  let best: number | null = null;
  let bestT = -Infinity;
  for (const p of series) {
    const ms = new Date(p.t + "T12:00:00").getTime();
    if (ms <= tMs && ms >= bestT) {
      bestT = ms;
      best = p.v;
    }
  }
  return best;
}

export function portfolioSymbolsForAverage(
  growBalance: number,
  investments: Pick<Investment, "tokensInvested" | "assetCode">[],
): string[] {
  const codes = new Set<string>();
  const staked = investments.reduce((s, i) => s + i.tokensInvested, 0);
  if (growBalance > 0 || staked > 0) codes.add("GROW");
  for (const inv of investments) {
    if (inv.tokensInvested > 0) codes.add(inv.assetCode);
  }
  return [...codes];
}

export type ChartRow = { t: string; avg: number; display: number };

/**
 * Chart path = average USD price of held symbols, then rescaled so the last point matches `portfolioUsd`.
 */
export function buildPortfolioChartSeries(params: {
  range: ChartRange;
  portfolioUsd: number;
  symbols: string[];
  histories: Record<string, PricePoint[]>;
}): ChartRow[] {
  const { range, portfolioUsd, symbols, histories } = params;
  if (symbols.length === 0) return [];

  const trimmed: Record<string, PricePoint[]> = {};
  for (const s of symbols) {
    trimmed[s] = filterByRange(histories[s] ?? [], range);
  }

  const allDates = new Set<string>();
  for (const s of symbols) {
    for (const p of trimmed[s] ?? []) allDates.add(p.t);
  }
  const dates = [...allDates].sort();

  const rows: ChartRow[] = [];
  for (const d of dates) {
    const tMs = new Date(d + "T12:00:00").getTime();
    const parts: number[] = [];
    for (const s of symbols) {
      const v = priceOnOrBefore(histories[s] ?? [], tMs);
      if (v != null) parts.push(v);
    }
    if (parts.length === 0) continue;
    const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
    rows.push({ t: d, avg, display: 0 });
  }

  const lastAvg = rows[rows.length - 1]?.avg;
  if (!lastAvg || lastAvg <= 0) {
    return rows.map((r) => ({ ...r, display: portfolioUsd }));
  }
  return rows.map((r) => ({ ...r, display: portfolioUsd * (r.avg / lastAvg) }));
}

export function computeTodayChangeUsd(
  chartRows3M: ChartRow[],
  portfolioUsd: number,
): { deltaUsd: number; deltaPct: number } {
  if (chartRows3M.length < 2 || portfolioUsd <= 0) {
    return { deltaUsd: 0, deltaPct: 0 };
  }
  const sorted = [...chartRows3M].sort((a, b) => a.t.localeCompare(b.t));
  const prev = sorted[sorted.length - 2]?.display ?? sorted[sorted.length - 1].display;
  const deltaUsd = portfolioUsd - prev;
  const deltaPct = prev > 0 ? (deltaUsd / prev) * 100 : 0;
  return { deltaUsd, deltaPct };
}

export function computePortfolioUsd(params: {
  growBalance: number;
  investments: Investment[];
  pendingByCompanyId: Record<string, number>;
  prices: Record<string, number>;
}): number {
  const { growBalance, investments, pendingByCompanyId, prices } = params;
  const pGrow = prices["GROW"] ?? 0;
  let total = growBalance * pGrow;
  for (const inv of investments) {
    total += inv.tokensInvested * pGrow;
    const p = prices[inv.assetCode] ?? 0;
    const pending = pendingByCompanyId[inv.companyId] ?? 0;
    total += pending * p;
  }
  return total;
}

export function randomWalkPrices(prev: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [k, v] of Object.entries(prev)) {
    if (!(v > 0)) continue;
    const jitter = (Math.random() - 0.5) * 0.004;
    next[k] = Math.max(0.0001, v * (1 + jitter));
  }
  return next;
}
