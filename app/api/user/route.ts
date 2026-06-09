import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { computePendingReward, computeRewardRatePerMinute } from "@/lib/rewards";
import type { Investment } from "@/models/User";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";
import {
  growBalanceFromAccount,
  issuedAssetBalanceFromAccount,
  loadHorizonAccount,
  primeGrowBalanceCache,
} from "@/lib/stellar";
import { readTelegramIdFromSession } from "@/lib/auth-session";
import { SEED_ASSET_CODE, syncInvestmentAssetCodes } from "@/lib/companies";
import { resolveLeaderboardRank, updateUserChainGrowBalance } from "@/lib/leaderboard-balance";
import { getSeedIssuer, seedBonusPercent, seedRewardMultiplier } from "@/lib/seed";

export async function GET(request: NextRequest) {
  try {
    const telegramId = readTelegramIdFromSession(request);
    if (!telegramId) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401, headers: CACHE_PRIVATE_NO_STORE },
      );
    }
    await connectToDatabase();
    const user = await User.findOne({ telegramId });
    if (!user) {
      return NextResponse.json(
        { message: "User not found." },
        { status: 404, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    if (syncInvestmentAssetCodes(user.investments)) {
      await user.save();
    }

    const totalInvested = Number(user.totalInvested) || 0;
    let chainGrowBalance: number | null = null;
    let horizonAccount: Awaited<ReturnType<typeof loadHorizonAccount>> | undefined;
    if (user.isVerified) {
      try {
        horizonAccount = await loadHorizonAccount(user.publicKey);
      } catch {
        return NextResponse.json(
          { message: "Could not read GROW balance from Stellar Horizon." },
          { status: 502, headers: CACHE_PRIVATE_NO_STORE },
        );
      }
      chainGrowBalance = growBalanceFromAccount(horizonAccount);
      if (chainGrowBalance === null) {
        return NextResponse.json(
          { message: "Could not read GROW balance from Stellar Horizon." },
          { status: 502, headers: CACHE_PRIVATE_NO_STORE },
        );
      }
      primeGrowBalanceCache(user.publicKey, chainGrowBalance);
      await updateUserChainGrowBalance(user, chainGrowBalance);
      await user.save();
    }
    const effectiveChainBalance = chainGrowBalance ?? (Number(user.growBalance) || 0);
    const investableGrowBalance = Math.max(0, effectiveChainBalance - totalInvested);
    const rewardsEligible = effectiveChainBalance + 1e-7 >= totalInvested;

    let seedBalance = 0;
    if (user.isVerified && horizonAccount !== undefined) {
      const seedIssuer = getSeedIssuer();
      seedBalance = Math.max(0, issuedAssetBalanceFromAccount(horizonAccount, SEED_ASSET_CODE, seedIssuer));
    }

    const userInvestments = user.investments as Investment[];
    const walletAssetBalances = new Map<string, number>();
    const assetsToFetch = new Map<string, { assetCode: string; issuer: string }>();
    for (const investment of userInvestments) {
      const key = `${investment.assetCode}:${investment.issuer}`;
      if (!assetsToFetch.has(key)) {
        assetsToFetch.set(key, { assetCode: investment.assetCode, issuer: investment.issuer });
      }
    }
    if (user.isVerified && assetsToFetch.size > 0 && horizonAccount !== undefined) {
      for (const [key, asset] of assetsToFetch.entries()) {
        const n = issuedAssetBalanceFromAccount(horizonAccount, asset.assetCode, asset.issuer);
        walletAssetBalances.set(key, Math.max(0, n));
      }
    }
    const { rank: leaderboardRank, bonusPercent: leaderboardBonusPercent } =
      user.isVerified ? await resolveLeaderboardRank(telegramId) : { rank: null, bonusPercent: 0 };

    if (!rewardsEligible) {
      const now = new Date();
      for (const investment of userInvestments) {
        investment.lastRewardAt = now;
        investment.accumulatedReward = 0;
      }
      await user.save();
    }

    const enrichedInvestments = userInvestments.map((investment) => {
      const maybeDoc = investment as unknown as { toObject?: () => Investment };
      const baseInvestment = typeof maybeDoc.toObject === "function" ? maybeDoc.toObject() : investment;
      const pausedReason = rewardsEligible ? null : "Tokens were transferred out - rewards paused";
      return {
        ...baseInvestment,
        accumulatedReward: rewardsEligible
          ? computePendingReward(investment, seedBalance, leaderboardRank)
          : 0,
        ratePerMinute: rewardsEligible
          ? computeRewardRatePerMinute(investment, seedBalance, leaderboardRank)
          : 0,
        walletAssetBalance: walletAssetBalances.get(`${investment.assetCode}:${investment.issuer}`) ?? 0,
        rewardsEligible,
        pausedReason,
      };
    });

    const userObj = user.toObject();
    const u = userObj as typeof userObj & { lastBalanceSyncAt?: Date };

    return NextResponse.json(
      {
        ...userObj,
        growBalance: investableGrowBalance,
        chainGrowBalance: effectiveChainBalance,
        rewardsEligible,
        rewardsPausedReason: rewardsEligible ? null : "Tokens were transferred out - rewards paused",
        memoWallet: process.env.STELLAR_MEMO_WALLET_PUBLIC_KEY || "",
        lastBalanceSyncAt: u.lastBalanceSyncAt
          ? new Date(u.lastBalanceSyncAt).toISOString()
          : null,
        investments: enrichedInvestments,
        seedBalance,
        seedBonusPercent: seedBonusPercent(seedBalance),
        seedRewardMultiplier: seedRewardMultiplier(seedBalance),
        leaderboardRank,
        leaderboardBonusPercent,
      },
      { headers: CACHE_PRIVATE_NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { message: "Failed to load user data." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}
