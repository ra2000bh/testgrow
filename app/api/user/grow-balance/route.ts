import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getWalletGrowBalance } from "@/lib/stellar";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";

const schema = z.object({
  telegramId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { telegramId } = schema.parse(await request.json());
    await connectToDatabase();
    const user = await User.findOne({ telegramId }).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404, headers: CACHE_PRIVATE_NO_STORE },
      );
    }
    if (!user.isVerified) {
      return NextResponse.json(
        { success: false, message: "Wallet not verified." },
        { status: 403, headers: CACHE_PRIVATE_NO_STORE },
      );
    }
    const chainGrowBalance = await getWalletGrowBalance(user.publicKey);
    if (chainGrowBalance === null) {
      return NextResponse.json(
        { success: false, message: "Could not read GROW balance from Stellar Horizon." },
        { status: 502, headers: CACHE_PRIVATE_NO_STORE },
      );
    }
    const totalInvested = Number(user.totalInvested) || 0;
    const maxInvestable = Math.max(0, chainGrowBalance - totalInvested);
    return NextResponse.json(
      {
        success: true,
        growBalance: maxInvestable,
        chainGrowBalance,
        totalInvested,
        rewardsEligible: chainGrowBalance + 1e-7 >= totalInvested,
      },
      { headers: CACHE_PRIVATE_NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch GROW balance." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}
