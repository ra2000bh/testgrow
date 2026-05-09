import { companies, GROW_ASSET_CODE } from "@/lib/companies";
import { connectToDatabase } from "@/lib/mongodb";
import { MarketPrice } from "@/models/MarketPrice";

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
  const company = companies.find((c) => c.assetCode === symbol);
  if (company) return company.estimatedPriceUsd;
  if (symbol === GROW_ASSET_CODE) return 1;
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

function buildInitialHistory(symbol: string, pointCount: number): PricePoint[] {
  const rnd = mulberry32(seedFromSymbol(`init:${symbol}`));
  const points: PricePoint[] = [];
  let price = baseUsdPrice(symbol);
  const now = Date.now();
  const stepMs = 60 * 60 * 1000;
  for (let i = pointCount - 1; i >= 0; i -= 1) {
    const drift = 0.0005 + (rnd() - 0.5) * 0.0015;
    price = Math.max(0.02, price * (1 + drift));
    points.push({ t: new Date(now - i * stepMs).toISOString(), v: Number(price.toFixed(6)) });
  }
  return points;
}

function nextPrice(symbol: string, prev: number, nowMs: number): number {
  const rnd = mulberry32(seedFromSymbol(`${symbol}:${Math.floor(nowMs / 60000)}`));
  const drift = 0.0008;
  const shock = (rnd() - 0.5) * 0.01;
  return Math.max(0.02, prev * (1 + drift + shock));
}

async function ensureSymbolsInitialized(symbols: string[]) {
  const existing = await MarketPrice.find({ symbol: { $in: symbols } }).lean();
  const existingSet = new Set(existing.map((x) => String(x.symbol)));
  const missing = symbols.filter((s) => !existingSet.has(s));
  if (missing.length === 0) return;
  const now = new Date();
  await MarketPrice.insertMany(
    missing.map((symbol) => {
      const history = buildInitialHistory(symbol, 240);
      return {
        symbol,
        priceUsd: history[history.length - 1]?.v ?? baseUsdPrice(symbol),
        history,
        lastTickAt: now,
      };
    }),
  );
}

export async function buildMarketSnapshot(): Promise<MarketToken[]> {
  const codes = new Set<string>([GROW_ASSET_CODE]);
  for (const c of companies) {
    codes.add(c.assetCode);
  }
  const symbols = [...codes];
  await connectToDatabase();
  await ensureSymbolsInitialized(symbols);

  const rows = await MarketPrice.find({ symbol: { $in: symbols } });
  const nowMs = Date.now();
  const TICK_MS = 60_000;
  const MAX_POINTS = 24 * 30;

  await Promise.all(
    rows.map(async (row) => {
      const lastTick = new Date(row.lastTickAt).getTime();
      const due = nowMs - lastTick >= TICK_MS;
      if (!due) return;
      const next = nextPrice(String(row.symbol), Number(row.priceUsd) || baseUsdPrice(String(row.symbol)), nowMs);
      row.priceUsd = Number(next.toFixed(6));
      row.lastTickAt = new Date(nowMs);
      const history = (row.history as PricePoint[]) ?? [];
      history.push({ t: new Date(nowMs).toISOString(), v: row.priceUsd });
      if (history.length > MAX_POINTS) {
        row.history = history.slice(history.length - MAX_POINTS);
      } else {
        row.history = history;
      }
      await row.save();
    }),
  );

  const fresh = await MarketPrice.find({ symbol: { $in: symbols } }).lean();
  const map = new Map(fresh.map((r) => [String(r.symbol), r]));
  return symbols.map((symbol) => {
    const row = map.get(symbol);
    if (!row) {
      const hist = buildInitialHistory(symbol, 240);
      return { symbol, priceUsd: hist[hist.length - 1]?.v ?? baseUsdPrice(symbol), history: hist };
    }
    return {
      symbol,
      priceUsd: Number(row.priceUsd),
      history: ((row.history as PricePoint[]) ?? []).map((p) => ({ t: p.t, v: Number(p.v) })),
    };
  });
}
