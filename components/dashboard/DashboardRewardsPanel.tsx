"use client";

import Link from "next/link";
import { Gift } from "lucide-react";
import { companyBrandGradient, getCompanyById } from "@/lib/companies";
import { computeRewardPerBatch } from "@/lib/rewards";
import type { Investment } from "@/models/User";

export type EnrichedInvestment = Investment & { ratePerMinute: number; accumulatedReward: number };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function DashboardRewardsPanel({
  investments,
  pendingByCompanyId,
  claimingId,
  onClaimOne,
  onClaimAll,
  claimAllDisabled,
}: {
  investments: EnrichedInvestment[];
  pendingByCompanyId: Record<string, number>;
  claimingId: string | null;
  onClaimOne: (companyId: string) => void;
  onClaimAll: () => void;
  claimAllDisabled: boolean;
}) {
  const active = investments.filter((i) => i.tokensInvested > 0);

  if (active.length === 0) {
    return (
      <div className="dash-tile dash-tile-wide py-10 text-center" data-page-child>
        <Gift className="mx-auto mb-3 h-10 w-10 text-[var(--dash-muted)]" aria-hidden />
        <p className="dash-section-label mb-2">Rewards</p>
        <p className="mb-4 text-[13px] text-[var(--dash-muted)]">Stake GROW in a company to start earning reward tokens.</p>
        <Link
          href="/companies"
          className="text-[13px] font-semibold text-[var(--dash-teal)] underline-offset-2 hover:underline"
        >
          Browse companies →
        </Link>
      </div>
    );
  }

  return (
    <div className="dash-tile dash-tile-wide space-y-3" data-page-child>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="dash-section-label">Rewards</p>
        <button
          type="button"
          className="dash-tabular min-h-9 rounded-md border border-[var(--dash-border)] bg-transparent px-3 text-[12px] font-semibold text-[var(--dash-teal)] hover:bg-[rgba(45,212,191,0.08)] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={claimAllDisabled}
          onClick={onClaimAll}
        >
          Claim all
        </button>
      </div>
      <ul className="space-y-2">
        {active.map((inv) => {
          const pending = pendingByCompanyId[inv.companyId] ?? 0;
          const perBatch = computeRewardPerBatch(inv);
          const pulse = pending > perBatch * 0.25;
          const co = getCompanyById(inv.companyId);
          const grad = co ? companyBrandGradient(co) : "linear-gradient(135deg,#475569,#1e293b)";
          return (
            <li
              key={inv.companyId}
              className="flex items-center gap-3 rounded-md border border-[var(--dash-border)] bg-[rgba(8,12,18,0.45)] px-3 py-2.5"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-inner"
                style={{ background: grad }}
              >
                {initials(inv.companyName)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-[var(--dash-text)]">
                    {inv.companyName}
                  </span>
                  <span className="dash-tabular shrink-0 rounded bg-[rgba(45,212,191,0.12)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--dash-teal)]">
                    {inv.assetCode}
                  </span>
                  {pulse ? (
                    <span
                      className="dash-pulse-dot inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--dash-teal)]"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <p className="dash-tabular text-[12px] text-[var(--dash-muted)]">
                  Pending{" "}
                  <span className="font-semibold text-[var(--dash-text)]">{pending.toFixed(4)}</span>{" "}
                  {inv.assetCode}
                </p>
              </div>
              <button
                type="button"
                className="dash-tabular shrink-0 min-h-9 rounded-md border border-[var(--dash-teal)] bg-[rgba(45,212,191,0.12)] px-3 text-[12px] font-semibold text-[var(--dash-teal)] hover:bg-[rgba(45,212,191,0.2)] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={pending <= 0 || claimingId === inv.companyId || claimingId === "__all__"}
                onClick={() => onClaimOne(inv.companyId)}
              >
                {claimingId === inv.companyId ? "…" : "Claim"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
