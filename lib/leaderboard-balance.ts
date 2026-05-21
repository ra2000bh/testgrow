import {
  buildLeaderboardSnapshot,
  getRankForTelegramId,
  leaderboardBonusPercent,
  type LeaderboardSnapshot,
} from "@/lib/leaderboard";
import { connectToDatabase } from "@/lib/mongodb";
import { getWalletGrowBalance } from "@/lib/stellar";
import { User } from "@/models/User";

const DEFAULT_STALE_MS = 3 * 60 * 1000;
const REFRESH_CONCURRENCY = 5;

type UserBalanceDoc = {
  _id: unknown;
  publicKey: string;
  chainGrowBalance?: number;
  chainGrowBalanceUpdatedAt?: Date;
};

export async function updateUserChainGrowBalance(
  user: { publicKey: string; chainGrowBalance?: number; chainGrowBalanceUpdatedAt?: Date },
  chainBalance?: number | null,
): Promise<number | null> {
  const balance =
    chainBalance !== undefined
      ? chainBalance
      : await getWalletGrowBalance(user.publicKey);
  if (balance === null) return null;
  user.chainGrowBalance = Math.max(0, balance);
  user.chainGrowBalanceUpdatedAt = new Date();
  return user.chainGrowBalance;
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>, concurrency: number) {
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      await worker(items[i]!);
    }
  });
  await Promise.all(runners);
}

export async function refreshLeaderboardBalancesIfStale(maxAgeMs = DEFAULT_STALE_MS): Promise<void> {
  await connectToDatabase();
  const cutoff = new Date(Date.now() - maxAgeMs);
  const stale = (await User.find({
    isVerified: true,
    $or: [
      { chainGrowBalanceUpdatedAt: { $exists: false } },
      { chainGrowBalanceUpdatedAt: null },
      { chainGrowBalanceUpdatedAt: { $lt: cutoff } },
    ],
  })
    .select("publicKey chainGrowBalance chainGrowBalanceUpdatedAt")
    .lean()) as UserBalanceDoc[];

  await runPool(
    stale,
    async (doc) => {
      const balance = await getWalletGrowBalance(doc.publicKey);
      if (balance === null) return;
      await User.updateOne(
        { _id: doc._id },
        {
          $set: {
            chainGrowBalance: Math.max(0, balance),
            chainGrowBalanceUpdatedAt: new Date(),
          },
        },
      );
    },
    REFRESH_CONCURRENCY,
  );
}

export async function getVerifiedLeaderboardCandidates(): Promise<
  import("@/lib/leaderboard").LeaderboardCandidate[]
> {
  await connectToDatabase();
  const users = await User.find({ isVerified: true })
    .select(
      "telegramId telegramUsername telegramFirstName telegramPhotoUrl chainGrowBalance createdAt",
    )
    .lean();
  return users.map((u) => ({
    telegramId: String(u.telegramId),
    telegramUsername: u.telegramUsername as string | undefined,
    telegramFirstName: u.telegramFirstName as string | undefined,
    telegramPhotoUrl: u.telegramPhotoUrl as string | undefined,
    chainGrowBalance: Math.max(0, Number(u.chainGrowBalance) || 0),
    createdAt: u.createdAt as Date | undefined,
  }));
}

export async function buildLeaderboardSnapshotForViewer(
  viewerTelegramId: string,
  options?: { refreshStale?: boolean },
): Promise<LeaderboardSnapshot> {
  if (options?.refreshStale) {
    await refreshLeaderboardBalancesIfStale();
  }
  const candidates = await getVerifiedLeaderboardCandidates();
  return buildLeaderboardSnapshot(candidates, viewerTelegramId);
}

export async function resolveLeaderboardRank(telegramId: string): Promise<{
  rank: number | null;
  bonusPercent: number;
}> {
  const snapshot = await buildLeaderboardSnapshotForViewer(telegramId, { refreshStale: false });
  const rank = getRankForTelegramId(snapshot, telegramId);
  return { rank, bonusPercent: leaderboardBonusPercent(rank) };
}
