import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { computeUpdatedReward } from "@/lib/rewards";
import type { Investment } from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const telegramId = request.nextUrl.searchParams.get("telegramId");
    if (!telegramId) {
      return NextResponse.json({ message: "telegramId is required." }, { status: 400 });
    }
    await connectToDatabase();
    const user = await User.findOne({ telegramId }).lean();
    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const enrichedInvestments = (user.investments as Investment[]).map((investment) => ({
      ...investment,
      accumulatedReward: computeUpdatedReward(investment),
    }));

    return NextResponse.json({
      ...user,
      memoWallet: process.env.STELLAR_MEMO_WALLET_PUBLIC_KEY || "",
      investments: enrichedInvestments,
    });
  } catch {
    return NextResponse.json({ message: "Failed to load user data." }, { status: 500 });
  }
}
