import { companies, GROW_ASSET_CODE } from "@/lib/companies";

export type PricePoint = { t: string; v: number };

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromSymbol(symbol: string): number {
  let h = 2166136261;
  for (let i = 0; i < symbol.length; i++) {
    h ^= symbol.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic pseudo prices for demo UI (not a live market feed). */
export function baseUsdPrice(symbol: string): number {
  const rnd = mulberry32(seedFromSymbol(symbol));
  const span = 0.35 + rnd() * 1.25;
  return 0.12 + span;
}

export function buildPriceHistory(symbol: string, dayCount: number): PricePoint[] {
  const rnd = mulberry32(seedFromSymbol(`hist:${symbol}`));
  const points: PricePoint[] = [];
  const start = Date.UTC(2026, 0, 1);
  let v = baseUsdPrice(symbol);
  const drift = (rnd() - 0.48) * 0.004;
  const vol = 0.006 + rnd() * 0.012;

  for (let d = 0; d < dayCount; d++) {
    const day = new Date(start + d * 86400000);
    const shock = (rnd() - 0.5) * vol;
    v = Math.max(0.02, v * (1 + drift + shock));
    points.push({ t: day.toISOString().slice(0, 10), v });
  }
  return points;
}

export type MarketToken = {
  symbol: string;
  priceUsd: number;
  history: PricePoint[];
};

export function buildMarketSnapshot(): MarketToken[] {
  const codes = new Set<string>([GROW_ASSET_CODE]);
  for (const c of companies) {
    codes.add(c.assetCode);
  }
  const dayCount = 120;
  return [...codes].map((symbol) => {
    const hist = buildPriceHistory(symbol, dayCount);
    const priceUsd = hist[hist.length - 1]?.v ?? baseUsdPrice(symbol);
    return { symbol, priceUsd, history: hist };
  });
}
