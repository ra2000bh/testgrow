import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { computePendingReward, computeRewardRatePerMinute } from "@/lib/rewards";
import type { Investment } from "@/models/User";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";

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
    const user = await User.findOne({ telegramId }).lean();
    if (!user) {
      return NextResponse.json(
        { message: "User not found." },
        { status: 404, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    const enrichedInvestments = (user.investments as Investment[]).map((investment) => ({
      ...investment,
      accumulatedReward: computePendingReward(investment),
      ratePerMinute: computeRewardRatePerMinute(investment),
    }));

    const u = user as typeof user & { lastBalanceSyncAt?: Date };

    return NextResponse.json(
      {
        ...user,
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
