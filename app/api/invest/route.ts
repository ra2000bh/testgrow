import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { getCompanyById } from "@/lib/companies";
import { User } from "@/models/User";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";
import { getWalletGrowBalance } from "@/lib/stellar";

const schema = z.object({
  telegramId: z.string().min(1),
  companyId: z.string().min(1),
  amount: z.number().positive(),
});

/**
 * Allocate app GROW to a company stake. Reward tokens accrue per REWARD_ACCRUAL_MS; users claim
 * on-chain payouts from the Rewards tab (publisher wallet — not sent here).
 */
export async function POST(request: NextRequest) {
  try {
    const { telegramId, companyId, amount } = schema.parse(await request.json());
    const company = getCompanyById(companyId);
    if (!company) {
      return NextResponse.json({ success: false, message: "Company not found." }, { status: 404 });
    }

    await connectToDatabase();
    const user = await User.findOne({ telegramId });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }
    if (!user.isVerified) {
      return NextResponse.json(
        { success: false, message: "Wallet not verified" },
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
    if (amount > maxInvestable) {
      return NextResponse.json(
        { success: false, message: `Insufficient GROW balance. Max investable is ${maxInvestable.toFixed(7)}.` },
        { status: 400, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    user.totalInvested += amount;
    const existing = user.investments.find((inv: { companyId: string }) => inv.companyId === companyId);
    if (existing) {
      existing.tokensInvested += amount;
      existing.investingPublicKey = user.publicKey;
      existing.lastRewardAt = new Date();
    } else {
      user.investments.push({
        companyId,
        companyName: company.name,
        assetCode: company.assetCode,
        issuer: company.issuer,
        investingPublicKey: user.publicKey,
        tokensInvested: amount,
        investedAt: new Date(),
        lastRewardAt: new Date(),
        accumulatedReward: 0,
      });
    }

    await user.save();
    return NextResponse.json(
      { success: true, updatedBalance: Math.max(0, chainGrowBalance - user.totalInvested) },
      { headers: CACHE_PRIVATE_NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Investment request failed." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}
