import type { PricePoint } from "@/lib/market-data";
import type { Investment } from "@/models/User";

export type ChartRange = "1W" | "1M" | "3M";

const RANGE_DAYS: Record<ChartRange, number> = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
};

export function filterByRange(points: PricePoint[], range: ChartRange): PricePoint[] {
  if (points.length === 0) return [];
  const days = RANGE_DAYS[range];
  let anchorMs = -Infinity;
  for (const p of points) {
    const ms = new Date(p.t).getTime();
    if (Number.isFinite(ms) && ms > anchorMs) anchorMs = ms;
  }
  if (!Number.isFinite(anchorMs) || anchorMs <= 0) return [];
  const cutoff = anchorMs - days * 86400000;
  const within = points.filter((p) => new Date(p.t).getTime() >= cutoff);
  if (within.length > 0) return within;
  const last = points[points.length - 1];
  return last ? [last] : [];
}

function priceOnOrBefore(series: PricePoint[], tMs: number): number | null {
  let best: number | null = null;
  let bestT = -Infinity;
  for (const p of series) {
    const ms = new Date(p.t).getTime();
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

export function buildPortfolioChartSeries(params: {
  range: ChartRange;
  holdingsBySymbol: Record<string, number>;
  histories: Record<string, PricePoint[]>;
}): ChartRow[] {
  const { range, holdingsBySymbol, histories } = params;
  const symbols = Object.keys(holdingsBySymbol).filter((s) => (holdingsBySymbol[s] ?? 0) > 0);
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
    const tMs = new Date(d).getTime();
    let total = 0;
    for (const s of symbols) {
      const v = priceOnOrBefore(histories[s] ?? [], tMs);
      const qty = holdingsBySymbol[s] ?? 0;
      if (v != null && qty > 0) total += qty * v;
    }
    if (!(total > 0)) continue;
    rows.push({ t: d, avg: total, display: total });
  }
  return rows;
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
  const { investments, pendingByCompanyId, prices } = params;
  let total = 0;
  for (const inv of investments) {
    const p = prices[inv.assetCode] ?? 0;
    const pending = pendingByCompanyId[inv.companyId] ?? 0;
    const walletHeld = Math.max(0, inv.walletAssetBalance ?? 0);
    total += (walletHeld + pending) * p;
  }
  return total;
}

