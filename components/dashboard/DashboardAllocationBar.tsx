"use client";

import { companyBrandGradient, getCompanyById } from "@/lib/companies";
import type { Investment } from "@/models/User";

type Row = { companyId: string; assetCode: string; pct: number };

export function DashboardAllocationBar({ investments }: { investments: Investment[] }) {
  const rows: Row[] = [];
  let total = 0;
  for (const inv of investments) {
    if (inv.tokensInvested > 0) total += inv.tokensInvested;
  }
  for (const inv of investments) {
    if (inv.tokensInvested <= 0) continue;
    rows.push({
      companyId: inv.companyId,
      assetCode: inv.assetCode,
      pct: total > 0 ? (inv.tokensInvested / total) * 100 : 0,
    });
  }

  if (rows.length === 0) {
    return (
      <div className="dash-tile dash-tile-wide py-6 text-center">
        <p className="dash-section-label mb-1">Allocation</p>
        <p className="text-[13px] text-[var(--dash-muted)]">No staked positions yet.</p>
      </div>
    );
  }

  return (
    <div className="dash-tile dash-tile-wide" data-page-child>
      <p className="dash-section-label mb-3">Allocation</p>
      <div className="flex h-9 w-full overflow-hidden rounded-md border border-[var(--dash-border)]">
        {rows.map((r) => {
          const co = getCompanyById(r.companyId);
          const grad = co ? companyBrandGradient(co) : "linear-gradient(135deg,#64748b,#334155)";
          const abbr = r.assetCode.slice(0, 2).toUpperCase();
          return (
            <div
              key={r.companyId}
              className="relative flex min-w-0 items-center justify-center"
              style={{ width: `${r.pct}%`, background: grad }}
              title={`${r.assetCode} · ${r.pct.toFixed(1)}%`}
            >
              <span className="dash-tabular truncate px-1 text-[11px] font-bold text-white/95 drop-shadow-sm">
                {abbr} {r.pct >= 8 ? `${r.pct.toFixed(0)}%` : ""}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--dash-muted)]">
        {rows.map((r) => (
          <span key={`leg-${r.companyId}`} className="dash-tabular inline-flex items-center gap-1">
            <span className="font-semibold text-[var(--dash-text)]">{r.assetCode.slice(0, 2)}</span>
            <span>{r.pct.toFixed(1)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
