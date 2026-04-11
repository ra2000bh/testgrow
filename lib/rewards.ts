import { companies } from "@/lib/companies";
import type { Investment } from "@/models/User";

// DEV MODE: rewards every 1 minute — change to 24h for production
export const REWARD_ACCRUAL_MS = 60 * 1000;
// export const REWARD_ACCRUAL_MS = 24 * 60 * 60 * 1000;

/** @deprecated use REWARD_ACCRUAL_MS */
export const DAY_MS = REWARD_ACCRUAL_MS;

/** Discrete accrual batches: floor((now - lastRewardAt) / interval) */
export function computeBatchesReady(investment: Investment): number {
  const last = new Date(investment.lastRewardAt).getTime();
  return Math.max(0, Math.floor((Date.now() - last) / REWARD_ACCRUAL_MS));
}

export function computeRewardPerBatch(investment: Investment): number {
  const company = companies.find((c) => c.id === investment.companyId);
  if (!company) return 0;
  return investment.tokensInvested * company.dailyRate;
}

/** Total claimable from stacked accrual batches (no cap). */
export function computePendingReward(investment: Investment): number {
  return computeBatchesReady(investment) * computeRewardPerBatch(investment);
}

export function computeBatchProgress(investment: Investment): {
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
  const rewardPerBatch = investment.tokensInvested * company.dailyRate;
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
export function computeUpdatedReward(investment: Investment): number {
  return computePendingReward(investment);
}
