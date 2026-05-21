import type { UserDoc } from "@/models/User";

export const LEADERBOARD_SIZE = 10;

const BONUS_BY_RANK: Record<number, number> = {
  1: 50,
  2: 40,
  3: 30,
};

/** Bonus percent for ranks 4–10. */
const BONUS_RANK_4_TO_10 = 10;

export type LeaderboardProfileFields = {
  telegramUsername?: string | null;
  telegramFirstName?: string | null;
  telegramPhotoUrl?: string | null;
};

export type LeaderboardCandidate = LeaderboardProfileFields & {
  telegramId: string;
  chainGrowBalance: number;
  createdAt?: Date;
};

export type LeaderboardEntry = {
  rank: number;
  maskedName: string;
  photoUrl: string | null;
  growBalance: number;
  bonusPercent: number;
  isYou: boolean;
};

export type LeaderboardSnapshot = {
  entries: LeaderboardEntry[];
  rankByTelegramId: Map<string, number>;
  refreshedAt: Date;
};

export function leaderboardBonusPercent(rank: number | null | undefined): number {
  if (rank == null || !Number.isFinite(rank) || rank < 1) return 0;
  const r = Math.floor(rank);
  if (r <= 3) return BONUS_BY_RANK[r] ?? 0;
  if (r <= LEADERBOARD_SIZE) return BONUS_RANK_4_TO_10;
  return 0;
}

export function maskDisplayName(name: string): string {
  const n = name.trim();
  if (!n) return "•••";
  if (n.length <= 4) return `${n[0]}•••`;
  return `${n[0]}•••${n[n.length - 1]}`;
}

export function resolveDisplayName(user: LeaderboardProfileFields): string {
  const username = user.telegramUsername?.trim();
  if (username) return username;
  const first = user.telegramFirstName?.trim();
  if (first) return first;
  return "Player";
}

export function combinedRewardMultiplier(seedBalance: number, leaderboardRank: number | null | undefined): number {
  const seed = Math.max(0, seedBalance);
  const lb = leaderboardBonusPercent(leaderboardRank) * 0.01;
  return 1 + seed * 0.01 + lb;
}

function compareCandidates(a: LeaderboardCandidate, b: LeaderboardCandidate): number {
  const balDiff = (b.chainGrowBalance ?? 0) - (a.chainGrowBalance ?? 0);
  if (balDiff !== 0) return balDiff;
  const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  if (aCreated !== bCreated) return aCreated - bCreated;
  return String(a.telegramId).localeCompare(String(b.telegramId));
}

export function sortLeaderboardCandidates(candidates: LeaderboardCandidate[]): LeaderboardCandidate[] {
  return [...candidates].sort(compareCandidates);
}

export function buildLeaderboardSnapshot(
  candidates: LeaderboardCandidate[],
  viewerTelegramId: string,
): LeaderboardSnapshot {
  const sorted = sortLeaderboardCandidates(candidates);
  const top = sorted.slice(0, LEADERBOARD_SIZE);
  const rankByTelegramId = new Map<string, number>();
  top.forEach((u, i) => rankByTelegramId.set(u.telegramId, i + 1));

  const entries: LeaderboardEntry[] = top.map((u, i) => {
    const rank = i + 1;
    return {
      rank,
      maskedName: maskDisplayName(resolveDisplayName(u)),
      photoUrl: u.telegramPhotoUrl?.trim() || null,
      growBalance: Math.max(0, Number(u.chainGrowBalance) || 0),
      bonusPercent: leaderboardBonusPercent(rank),
      isYou: u.telegramId === viewerTelegramId,
    };
  });

  return { entries, rankByTelegramId, refreshedAt: new Date() };
}

export function getRankForTelegramId(snapshot: LeaderboardSnapshot, telegramId: string): number | null {
  const rank = snapshot.rankByTelegramId.get(telegramId);
  return rank ?? null;
}

export function userDocToLeaderboardCandidate(
  user: UserDoc & { createdAt?: Date; chainGrowBalance?: number },
): LeaderboardCandidate {
  return {
    telegramId: user.telegramId,
    telegramUsername: user.telegramUsername,
    telegramFirstName: user.telegramFirstName,
    telegramPhotoUrl: user.telegramPhotoUrl,
    chainGrowBalance: Math.max(0, Number(user.chainGrowBalance) || 0),
    createdAt: user.createdAt,
  };
}
