import { companies } from "@/lib/companies";
import { combinedRewardMultiplier } from "@/lib/leaderboard";
import type { Investment } from "@/models/User";

/** Production accrual interval: one reward batch every 24 hours. */
export const REWARD_ACCRUAL_MS = 24 * 60 * 60 * 1000;

/** @deprecated use REWARD_ACCRUAL_MS */
export const DAY_MS = REWARD_ACCRUAL_MS;

/** Discrete accrual batches: floor((now - lastRewardAt) / interval) */
export function computeBatchesReady(investment: Investment): number {
  const last = new Date(investment.lastRewardAt).getTime();
  return Math.max(0, Math.floor((Date.now() - last) / REWARD_ACCRUAL_MS));
}

export function computeRewardPerBatch(
  investment: Investment,
  seedBalance = 0,
  leaderboardRank: number | null = null,
): number {
  const company = companies.find((c) => c.id === investment.companyId);
  if (!company) return 0;
  const base = investment.tokensInvested * company.dailyRate;
  return base * combinedRewardMultiplier(seedBalance, leaderboardRank);
}

/** Reward tokens accrued per minute (continuous UI projection between batch boundaries). */
export function computeRewardRatePerMinute(
  investment: Investment,
  seedBalance = 0,
  leaderboardRank: number | null = null,
): number {
  if (investment.tokensInvested <= 0) return 0;
  const perBatch = computeRewardPerBatch(investment, seedBalance, leaderboardRank);
  const minutesPerBatch = REWARD_ACCRUAL_MS / 60_000;
  if (minutesPerBatch <= 0) return 0;
  return perBatch / minutesPerBatch;
}

/** Total claimable from stacked accrual batches (no cap). */
export function computePendingReward(
  investment: Investment,
  seedBalance = 0,
  leaderboardRank: number | null = null,
): number {
  return computeBatchesReady(investment) * computeRewardPerBatch(investment, seedBalance, leaderboardRank);
}

/**
 * After claiming N batches, advance the accrual anchor by N periods (not "now"),
 * so partial progress toward the next batch is preserved.
 */
export function lastRewardAtAfterClaim(investment: Investment, batchesClaimed: number): Date {
  const lastMs = new Date(investment.lastRewardAt).getTime();
  if (!Number.isFinite(lastMs) || batchesClaimed <= 0) {
    return new Date();
  }
  return new Date(lastMs + batchesClaimed * REWARD_ACCRUAL_MS);
}

export function computeBatchProgress(
  investment: Investment,
  seedBalance = 0,
  leaderboardRank: number | null = null,
): {
  batchesReady: number;
  rewardPerBatch: number;
  totalPending: number;
  progressToNextPercent: number;
  msUntilNextBatch: number;
} {
  const company = companies.find((c) => c.id === investment.companyId);
  if (!company || investment.tokensInvested <= 0) {
    return {
      batchesReady: 0,
      rewardPerBatch: 0,
      totalPending: 0,
      progressToNextPercent: 0,
      msUntilNextBatch: REWARD_ACCRUAL_MS,
    };
  }
  const last = new Date(investment.lastRewardAt).getTime();
  const elapsed = Math.max(0, Date.now() - last);
  const batchesReady = Math.floor(elapsed / REWARD_ACCRUAL_MS);
  const rewardPerBatch =
    investment.tokensInvested * company.dailyRate * combinedRewardMultiplier(seedBalance, leaderboardRank);
  const totalPending = batchesReady * rewardPerBatch;
  const msIntoCurrent = elapsed % REWARD_ACCRUAL_MS;
  const progressToNextPercent = batchesReady > 0 ? 100 : (msIntoCurrent / REWARD_ACCRUAL_MS) * 100;
  const msUntilNextBatch = batchesReady > 0 ? 0 : REWARD_ACCRUAL_MS - msIntoCurrent;
  return {
    batchesReady,
    rewardPerBatch,
    totalPending,
    progressToNextPercent,
    msUntilNextBatch,
  };
}

/** @deprecated use computePendingReward — kept for any external imports */
export function computeUpdatedReward(
  investment: Investment,
  seedBalance = 0,
  leaderboardRank: number | null = null,
): number {
  return computePendingReward(investment, seedBalance, leaderboardRank);
}

/** Compact ETA for UI (minutes under ~90m, otherwise whole hours). */
export function formatRewardEta(ms: number): string {
  if (ms <= 0) return "soon";
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 90) return `${minutes} min`;
  const hours = Math.ceil(ms / 3_600_000);
  return `${hours} hr`;
}
