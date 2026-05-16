/**
 * Last successful dashboard API payloads (client-only). Survives route unmounts so
 * returning to /dashboard does not flash portfolio $0 while market-data refetches.
 */
import type { EnrichedInvestment } from "@/components/dashboard/DashboardRewardsPanel";
import type { PricePoint } from "@/lib/market-data";

export type SnapshotMarketPayload = {
  tokens: { symbol: string; priceUsd: number; history: PricePoint[] }[];
  generatedAt: string;
};

export type SnapshotUserPayload = {
  publicKey: string;
  growBalance: number;
  totalInvested: number;
  isVerified: boolean;
  lastBalanceSyncAt: string | null;
  investments: EnrichedInvestment[];
  seedBalance?: number;
  seedBonusPercent?: number;
};

let lastUser: SnapshotUserPayload | null = null;
let lastMarket: SnapshotMarketPayload | null = null;

export function getSnapshotUser(): SnapshotUserPayload | null {
  return lastUser;
}

export function setSnapshotUser(u: SnapshotUserPayload | null): void {
  lastUser = u;
}

export function getSnapshotMarket(): SnapshotMarketPayload | null {
  return lastMarket;
}

export function setSnapshotMarket(m: SnapshotMarketPayload | null): void {
  lastMarket = m;
}

export function clearAppDataSnapshot(): void {
  lastUser = null;
  lastMarket = null;
}

/** Companies page `UserState` slice from last user snapshot. */
export function getSnapshotCompaniesUser(): {
  growBalance: number;
  investments: Array<{ companyId: string; tokensInvested: number }>;
} | null {
  const u = lastUser;
  if (!u) return null;
  return {
    growBalance: u.growBalance,
    investments: u.investments.map((inv) => ({
      companyId: inv.companyId,
      tokensInvested: inv.tokensInvested,
    })),
  };
}

/** Rewards rows from snapshot (same filter as rewards `load`). */
export function getSnapshotRewardInvestments(): EnrichedInvestment[] {
  const u = lastUser;
  if (!u) return [];
  return u.investments.filter((i) => i.tokensInvested > 0);
}
