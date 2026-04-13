"use client";

import { companyBrandGradient, getCompanyById } from "@/lib/companies";
import type { Investment } from "@/models/User";

type Row = { companyId: string; assetCode: string; pct: number; gradient: string };

const BAR_LABEL_MAX = 5;

function barLabel(code: string) {
  const t = code.trim().toUpperCase();
  return t.slice(0, BAR_LABEL_MAX);
}

export function DashboardAllocationBar({ investments }: { investments: Investment[] }) {
  const rows: Row[] = [];
  let total = 0;
  for (const inv of investments) {
    if (inv.tokensInvested > 0) total += inv.tokensInvested;
  }
  for (const inv of investments) {
    if (inv.tokensInvested <= 0) continue;
    const co = getCompanyById(inv.companyId);
    const gradient = co ? companyBrandGradient(co) : "linear-gradient(135deg,#64748b,#334155)";
    rows.push({
      companyId: inv.companyId,
      assetCode: inv.assetCode,
      pct: total > 0 ? (inv.tokensInvested / total) * 100 : 0,
      gradient,
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
      <div className="flex min-h-[2.25rem] w-full overflow-hidden rounded-md border border-[var(--dash-border)]">
        {rows.map((r) => {
          const showInBar = r.pct >= 7;
          return (
            <div
              key={r.companyId}
              className="relative flex min-w-0 items-center justify-center px-0.5"
              style={{ width: `${r.pct}%`, background: r.gradient }}
              title={`${r.assetCode} · ${r.pct.toFixed(1)}%`}
            >
              {showInBar ? (
                <span className="dash-tabular max-w-full truncate px-0.5 text-center text-[10px] font-bold uppercase tracking-wide text-white drop-shadow-sm">
                  {barLabel(r.assetCode)}
                  {r.pct >= 14 ? (
                    <span className="ml-0.5 opacity-95">{` ${r.pct.toFixed(0)}%`}</span>
                  ) : null}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-col gap-2 border-t border-[var(--dash-border)] pt-3">
        <p className="dash-section-label !tracking-[0.1em]">Legend</p>
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={`leg-${r.companyId}`} className="flex items-center gap-2 text-[12px]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm border border-[rgba(255,255,255,0.2)] shadow-sm"
                style={{ background: r.gradient }}
                aria-hidden
              />
              <span className="dash-tabular min-w-0 font-semibold tracking-wide text-[var(--dash-text)]">
                {r.assetCode}
              </span>
              <span className="dash-tabular shrink-0 text-[var(--dash-muted)]">{r.pct.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
