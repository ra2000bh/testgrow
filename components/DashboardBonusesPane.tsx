"use client";

import Link from "next/link";
import { SEED_ASSET_CODE } from "@/lib/companies";
import { seedRewardMultiplier } from "@/lib/seed";
import { SeedRewardsPane } from "@/components/SeedRewardsPane";
import { Sprout, Trophy } from "lucide-react";

export function DashboardBonusesPane({
  seedBalance,
  seedBonusPercent,
  leaderboardRank,
  leaderboardBonusPercent,
  className = "",
}: {
  seedBalance: number;
  seedBonusPercent: number;
  leaderboardRank: number | null;
  leaderboardBonusPercent: number;
  className?: string;
}) {
  const ranked = leaderboardRank != null && leaderboardRank >= 1 && leaderboardRank <= 10;

  if (!ranked) {
    return (
      <SeedRewardsPane
        seedBalance={seedBalance}
        seedBonusPercent={seedBonusPercent}
        variant="dashboard"
        className={className}
      />
    );
  }

  const balance = Math.max(0, seedBalance);
  const bonus = Math.max(0, seedBonusPercent);
  const lbBonus = Math.max(0, leaderboardBonusPercent);
  const multiplier = seedRewardMultiplier(balance);
  const hasSeed = balance > 0;
  const balanceLabel = balance.toLocaleString(undefined, { maximumFractionDigits: 4 });
  const bonusLabel = bonus.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className={`dash-tile dash-tile-wide space-y-4 ${className}`} data-page-child>
      <p className="dash-section-label">Bonuses</p>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <Sprout className="mt-0.5 h-4 w-4 shrink-0 text-[var(--dash-teal)]" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[12px] font-medium text-[var(--dash-muted)]">{SEED_ASSET_CODE}</p>
            {hasSeed ? (
              <>
                <p className="text-[13px] text-[var(--dash-text)]">
                  You have <span className="dash-tabular font-semibold">{balanceLabel}</span> {SEED_ASSET_CODE} -{" "}
                  <span className="font-semibold text-[var(--dash-teal)]">+{bonusLabel}%</span> to your rewards
                </p>
                <p className="text-[12px] text-[var(--dash-muted)]">
                  <span className="dash-tabular">{multiplier.toFixed(2)}×</span> reward multiplier active
                </p>
              </>
            ) : (
              <p className="text-[13px] text-[var(--dash-muted)]">
                Hold {SEED_ASSET_CODE} for +1% reward boost per token. Add the bonus trustline on Wallet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--dash-border)] pt-3 space-y-2">
        <div className="flex items-start gap-2">
          <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-[#f5c542]" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[12px] font-medium text-[var(--dash-muted)]">Leaderboard</p>
            <p className="text-[13px] text-[var(--dash-text)]">
              Rank <span className="dash-tabular font-semibold">#{leaderboardRank}</span> -{" "}
              <span className="font-semibold text-[#f5c542]">+{lbBonus}%</span> on invested GROW rewards
            </p>
            <Link
              href="/leaderboard"
              className="inline-block text-[12px] font-semibold text-[var(--dash-teal)] underline-offset-2 hover:underline"
            >
              View leaderboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
