"use client";

import { SEED_ASSET_CODE } from "@/lib/companies";
import { seedRewardMultiplier } from "@/lib/seed";
import { Card } from "@/components/Card";
import { Sprout } from "lucide-react";

type Variant = "dashboard" | "rewards";

export function SeedRewardsPane({
  seedBalance,
  seedBonusPercent,
  variant = "dashboard",
  className = "",
}: {
  seedBalance: number;
  seedBonusPercent: number;
  variant?: Variant;
  className?: string;
}) {
  const balance = Math.max(0, seedBalance);
  const bonus = Math.max(0, seedBonusPercent);
  const multiplier = seedRewardMultiplier(balance);
  const hasSeed = balance > 0;

  const balanceLabel = balance.toLocaleString(undefined, { maximumFractionDigits: 4 });
  const bonusLabel = bonus.toLocaleString(undefined, { maximumFractionDigits: 2 });

  const content = (
    <SeedPaneContent
      hasSeed={hasSeed}
      balanceLabel={balanceLabel}
      bonusLabel={bonusLabel}
      multiplier={multiplier}
      compact={variant === "dashboard"}
    />
  );

  if (variant === "rewards") {
    return (
      <Card className={`space-y-2 border-[var(--border)] bg-[rgba(45,212,191,0.06)] ${className}`} data-page-child>
        <div className="flex items-start gap-3">
          <Sprout className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary-green)]" aria-hidden />
          <div className="min-w-0 flex-1">{content}</div>
        </div>
      </Card>
    );
  }

  return (
    <div className={`dash-tile dash-tile-wide space-y-2 ${className}`} data-page-child>
      {content}
    </div>
  );
}

function SeedPaneContent({
  hasSeed,
  balanceLabel,
  bonusLabel,
  multiplier,
  compact,
}: {
  hasSeed: boolean;
  balanceLabel: string;
  bonusLabel: string;
  multiplier: number;
  compact: boolean;
}) {
  if (hasSeed) {
    return (
      <>
        <p className={compact ? "dash-section-label" : "sg-text-sm font-medium text-[var(--text-secondary)]"}>
          {compact ? "SEED bonus" : `${SEED_ASSET_CODE} bonus`}
        </p>
        <p
          className={
            compact
              ? "text-[13px] text-[var(--dash-text)]"
              : "sg-text-md font-semibold text-[var(--text-primary)]"
          }
        >
          You have{" "}
          <span className={compact ? "dash-tabular font-semibold" : "sg-tabular font-semibold"}>
            {balanceLabel}
          </span>{" "}
          {SEED_ASSET_CODE} —{" "}
          <span
            className={
              compact ? "font-semibold text-[var(--dash-teal)]" : "font-semibold text-[var(--primary-green)]"
            }
          >
            +{bonusLabel}%
          </span>{" "}
          to your rewards
        </p>
        {compact ? (
          <p className="text-[12px] text-[var(--dash-muted)]">
            <span className="dash-tabular">{multiplier.toFixed(2)}×</span> reward multiplier active
          </p>
        ) : (
          <p className="sg-text-sm text-[var(--text-muted)]">
            Rewards are multiplied by <span className="sg-tabular font-medium">{multiplier.toFixed(2)}×</span>.
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <p className={compact ? "dash-section-label" : "sg-text-sm font-medium text-[var(--text-secondary)]"}>
        {compact ? "SEED bonus" : `${SEED_ASSET_CODE} bonus`}
      </p>
      <p className={compact ? "text-[13px] text-[var(--dash-muted)]" : "sg-text-sm text-[var(--text-secondary)]"}>
        Hold {SEED_ASSET_CODE} for +1% reward boost per token.
        {compact ? " Add the bonus trustline on Trustlines." : " Add the bonus trustline on the Trustlines tab."}
      </p>
    </>
  );
}
