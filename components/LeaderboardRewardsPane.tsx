"use client";

import Link from "next/link";
import { Card } from "@/components/Card";
import { Trophy } from "lucide-react";

export function LeaderboardRewardsPane({
  leaderboardRank,
  leaderboardBonusPercent,
  className = "",
}: {
  leaderboardRank: number | null;
  leaderboardBonusPercent: number;
  className?: string;
}) {
  const ranked = leaderboardRank != null && leaderboardRank >= 1 && leaderboardRank <= 10;
  const bonus = Math.max(0, leaderboardBonusPercent);

  return (
    <Card
      className={`space-y-2 border-[var(--border)] ${
        ranked ? "bg-[rgba(245,197,66,0.08)]" : "bg-[rgba(45,212,191,0.04)]"
      } ${className}`}
      data-page-child
    >
      <div className="flex items-start gap-3">
        <Trophy
          className={`mt-0.5 h-5 w-5 shrink-0 ${ranked ? "text-[#f5c542]" : "text-[var(--text-muted)]"}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1">
          {ranked ? (
            <>
              <p className="sg-text-sm font-medium text-[var(--text-secondary)]">Leaderboard bonus</p>
              <p className="sg-text-md font-semibold text-[var(--text-primary)]">
                You are #{leaderboardRank} on the leaderboard —{" "}
                <span className="font-semibold text-[#f5c542]">+{bonus}%</span> on rewards from your invested
                GROW
              </p>
              <p className="sg-text-sm text-[var(--text-muted)]">
                Stacks with your SEED bonus (same additive formula). Rank updates when balances change.
              </p>
            </>
          ) : (
            <>
              <p className="sg-text-sm font-medium text-[var(--text-secondary)]">Leaderboard bonus</p>
              <p className="sg-text-sm text-[var(--text-secondary)]">
                Not on the leaderboard yet. Reach the top 10 GROW holders for up to{" "}
                <span className="font-semibold text-[var(--primary-green)]">+50%</span> on invested GROW rewards.
              </p>
              <Link
                href="/leaderboard"
                className="inline-block sg-text-sm font-medium text-[var(--primary-green)] underline-offset-2 hover:underline"
              >
                View leaderboard
              </Link>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
