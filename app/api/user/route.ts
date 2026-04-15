import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { computePendingReward, computeRewardRatePerMinute } from "@/lib/rewards";
import type { Investment } from "@/models/User";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";
import { getWalletGrowBalance } from "@/lib/stellar";

export async function GET(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get("telegramId");
    if (!telegramId) {
      return NextResponse.json(
        { message: "telegramId is required." },
        { status: 400, headers: CACHE_PRIVATE_NO_STORE },
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
    if (!rewardsEligible) {
      const now = new Date();
      for (const investment of userInvestments) {
        investment.lastRewardAt = now;
        investment.accumulatedReward = 0;
      }
      await user.save();
    }

    const enrichedInvestments = userInvestments.map((investment) => {
      const pausedReason = rewardsEligible ? null : "Tokens were transferred out - rewards paused";
      return {
        ...investment,
        accumulatedReward: rewardsEligible ? computePendingReward(investment) : 0,
        ratePerMinute: rewardsEligible ? computeRewardRatePerMinute(investment) : 0,
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
