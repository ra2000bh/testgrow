"use client";

type TickerItem = {
  symbol: string;
  price: number;
  changePct: number;
};

export function DashboardTickerStrip({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;
  const row = items.map((it) => {
    const up = it.changePct >= 0;
    const ch = `${up ? "+" : ""}${it.changePct.toFixed(2)}%`;
    return (
      <span key={it.symbol} className="dash-tabular inline-flex items-center gap-3 px-5 py-2 text-[13px]">
        <span className="font-semibold tracking-wide text-[var(--dash-text)]">{it.symbol}</span>
        <span className="text-[var(--dash-muted)]">${it.price.toFixed(4)}</span>
        <span className={up ? "text-[var(--dash-green)]" : "text-[var(--dash-red)]"}>{ch}</span>
      </span>
    );
  });
  return (
    <div className="dash-marquee-wrap mb-4" aria-label="Token prices">
      <div className="dash-marquee">
        <div className="flex shrink-0">{row}</div>
        <div className="flex shrink-0" aria-hidden>
          {row}
        </div>
      </div>
    </div>
  );
}
