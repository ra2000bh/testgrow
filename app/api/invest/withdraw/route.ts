import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { computePendingReward } from "@/lib/rewards";
import type { Investment } from "@/models/User";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";
import {
  getWalletGrowBalance,
  invalidateStellarAccountCache,
  issuedAssetBalanceFromAccount,
  loadHorizonAccount,
} from "@/lib/stellar";
import { readTelegramIdFromSession } from "@/lib/auth-session";
import { SEED_ASSET_CODE } from "@/lib/companies";
import { resolveLeaderboardRank, updateUserChainGrowBalance } from "@/lib/leaderboard-balance";
import { getSeedIssuer } from "@/lib/seed";

const schema = z.object({
  companyId: z.string().min(1),
});

/** Return principal + any accrued (unclaimed) rewards for this stake to GROW balance; remove the position. */
export async function POST(request: NextRequest) {
  try {
    const telegramId = readTelegramIdFromSession(request);
    if (!telegramId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401, headers: CACHE_PRIVATE_NO_STORE },
      );
    }
    const { companyId } = schema.parse(await request.json());
    await connectToDatabase();
    const user = await User.findOne({ telegramId });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404, headers: CACHE_PRIVATE_NO_STORE },
      );
    }
    if (!user.isVerified) {
      return NextResponse.json(
        { success: false, message: "Wallet not verified" },
        { status: 403, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    const investments = user.investments as Investment[];
    const idx = investments.findIndex((i) => i.companyId === companyId);
    if (idx === -1) {
      return NextResponse.json(
        { success: false, message: "No investment in this company." },
        { status: 400, headers: CACHE_PRIVATE_NO_STORE },
      );
    }
    const inv = investments[idx];
    if (inv.tokensInvested <= 0) {
      return NextResponse.json(
        { success: false, message: "Nothing to withdraw." },
        { status: 400, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    let seedBalance = 0;
    try {
      const horizonAccount = await loadHorizonAccount(user.publicKey);
      seedBalance = Math.max(
        0,
        issuedAssetBalanceFromAccount(horizonAccount, SEED_ASSET_CODE, getSeedIssuer()),
      );
    } catch {
      /* use 0 SEED if Horizon unavailable */
    }
    const { rank: leaderboardRank } = await resolveLeaderboardRank(telegramId);
    const pending = computePendingReward(inv, seedBalance, leaderboardRank);
    const principal = inv.tokensInvested;
    user.totalInvested = Math.max(0, user.totalInvested - principal);
    investments.splice(idx, 1);

    invalidateStellarAccountCache(user.publicKey);
    const chainGrowBalance = await getWalletGrowBalance(user.publicKey);
    if (chainGrowBalance !== null) {
      await updateUserChainGrowBalance(user, chainGrowBalance);
    }
    await user.save();
    const updatedBalance =
      chainGrowBalance === null ? null : Math.max(0, chainGrowBalance - (Number(user.totalInvested) || 0));
    return NextResponse.json(
      { success: true, updatedBalance, returned: principal + pending },
      { headers: CACHE_PRIVATE_NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Withdraw failed." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}
