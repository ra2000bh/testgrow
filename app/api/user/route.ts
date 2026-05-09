import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { computePendingReward, computeRewardRatePerMinute } from "@/lib/rewards";
import type { Investment } from "@/models/User";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";
import { getIssuedAssetBalance, getWalletGrowBalance } from "@/lib/stellar";
import { readTelegramIdFromSession } from "@/lib/auth-session";

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

    const totalInvested = Number(user.totalInvested) || 0;
    let chainGrowBalance: number | null = null;
    if (user.isVerified) {
      chainGrowBalance = await getWalletGrowBalance(user.publicKey);
      if (chainGrowBalance === null) {
        return NextResponse.json(
          { message: "Could not read GROW balance from Stellar Horizon." },
          { status: 502, headers: CACHE_PRIVATE_NO_STORE },
        );
      }
    }
    const effectiveChainBalance = chainGrowBalance ?? (Number(user.growBalance) || 0);
    const investableGrowBalance = Math.max(0, effectiveChainBalance - totalInvested);
    const rewardsEligible = effectiveChainBalance + 1e-7 >= totalInvested;

    const userInvestments = user.investments as Investment[];
    const walletAssetBalances = new Map<string, number>();
    const assetsToFetch = new Map<string, { assetCode: string; issuer: string }>();
    for (const investment of userInvestments) {
      const key = `${investment.assetCode}:${investment.issuer}`;
      if (!assetsToFetch.has(key)) {
        assetsToFetch.set(key, { assetCode: investment.assetCode, issuer: investment.issuer });
      }
    }
    if (user.isVerified && assetsToFetch.size > 0) {
      await Promise.all(
        [...assetsToFetch.entries()].map(async ([key, asset]) => {
          const n = await getIssuedAssetBalance(user.publicKey, asset.assetCode, asset.issuer);
          walletAssetBalances.set(key, typeof n === "number" && Number.isFinite(n) ? Math.max(0, n) : 0);
        }),
      );
    }
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
        accumulatedReward: rewardsEligible ? computePendingReward(investment) : 0,
        ratePerMinute: rewardsEligible ? computeRewardRatePerMinute(investment) : 0,
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
