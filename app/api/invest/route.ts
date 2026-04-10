import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { getCompanyById } from "@/lib/companies";
import { User } from "@/models/User";
import { accountHasTrustline, sendAssetPayment, toStellarAmount } from "@/lib/stellar";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";

const schema = z.object({
  telegramId: z.string().min(1),
  companyId: z.string().min(1),
  amount: z.number().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const { telegramId, companyId, amount } = schema.parse(await request.json());
    const company = getCompanyById(companyId);
    if (!company) {
      return NextResponse.json({ success: false, message: "Company not found." }, { status: 404 });
    }

    const secret = process.env.STELLAR_SECRET_KEY?.trim();
    if (!secret) {
      return NextResponse.json(
        { success: false, message: "Payout wallet is not configured on the server." },
        { status: 503, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    await connectToDatabase();
    const user = await User.findOne({ telegramId });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }
    if (!user.isVerified) {
      return NextResponse.json(
        { success: false, message: "Wallet not verified" },
        { status: 403 },
      );
    }
    if (user.growBalance < amount) {
      return NextResponse.json({ success: false, message: "Insufficient GROW balance." }, { status: 400 });
    }

    const hasLine = await accountHasTrustline(
      user.publicKey,
      company.assetCode,
      company.issuer,
    );
    if (!hasLine) {
      return NextResponse.json(
        {
          success: false,
          message: `Add a trustline for ${company.assetCode} in your Stellar wallet first (Trustlines tab), then try again.`,
        },
        { status: 400, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    const beforeInv = user.investments.find(
      (i: { companyId: string }) => i.companyId === companyId,
    ) as
      | {
          companyId: string;
          tokensInvested: number;
          lastRewardAt: Date;
        }
      | undefined;
    const prevTokensForCompany = beforeInv?.tokensInvested ?? 0;
    const prevLastRewardAt = beforeInv ? new Date(beforeInv.lastRewardAt) : undefined;

    user.growBalance -= amount;
    user.totalInvested += amount;
    if (beforeInv) {
      beforeInv.tokensInvested += amount;
      beforeInv.lastRewardAt = new Date();
    } else {
      user.investments.push({
        companyId,
        companyName: company.name,
        assetCode: company.assetCode,
        issuer: company.issuer,
        tokensInvested: amount,
        investedAt: new Date(),
        lastRewardAt: new Date(),
        accumulatedReward: 0,
      });
    }

    await user.save();

    let stellarAmount: string;
    try {
      stellarAmount = toStellarAmount(amount);
    } catch {
      user.growBalance += amount;
      user.totalInvested -= amount;
      if (beforeInv) {
        beforeInv.tokensInvested = prevTokensForCompany;
        if (prevLastRewardAt) beforeInv.lastRewardAt = prevLastRewardAt;
      } else {
        const idx = user.investments.findIndex(
          (i: { companyId: string }) => i.companyId === companyId,
        );
        if (idx >= 0) user.investments.splice(idx, 1);
      }
      await user.save();
      return NextResponse.json(
        { success: false, message: "Invalid invest amount." },
        { status: 400, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    try {
      await sendAssetPayment({
        distributorSecret: secret,
        destinationPublicKey: user.publicKey,
        assetCode: company.assetCode,
        issuerPublicKey: company.issuer,
        amount: stellarAmount,
        memo: `Grow invest ${company.assetCode}`,
      });
    } catch (e: unknown) {
      user.growBalance += amount;
      user.totalInvested -= amount;
      if (beforeInv) {
        beforeInv.tokensInvested = prevTokensForCompany;
        if (prevLastRewardAt) beforeInv.lastRewardAt = prevLastRewardAt;
      } else {
        const idx = user.investments.findIndex(
          (i: { companyId: string }) => i.companyId === companyId,
        );
        if (idx >= 0) user.investments.splice(idx, 1);
      }
      await user.save();

      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Stellar network error";
      return NextResponse.json(
        {
          success: false,
          message: `Could not send ${company.assetCode} to your wallet. ${msg.slice(0, 200)}`,
        },
        { status: 502, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    return NextResponse.json(
      { success: true, updatedBalance: user.growBalance, sentAsset: company.assetCode, sentAmount: stellarAmount },
      { headers: CACHE_PRIVATE_NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Investment request failed." },
      { status: 500 },
    );
  }
}
