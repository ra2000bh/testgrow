import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { getCompanyById } from "@/lib/companies";
import { User } from "@/models/User";

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

    await connectToDatabase();
    const user = await User.findOne({ telegramId });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }
    if (user.growBalance < amount) {
      return NextResponse.json({ success: false, message: "Insufficient GROW balance." }, { status: 400 });
    }

    user.growBalance -= amount;
    user.totalInvested += amount;
    const existing = user.investments.find((inv: { companyId: string }) => inv.companyId === companyId);
    if (existing) {
      existing.tokensInvested += amount;
      existing.lastRewardAt = new Date();
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
    return NextResponse.json({ success: true, updatedBalance: user.growBalance });
  } catch {
    return NextResponse.json({ success: false, message: "Investment request failed." }, { status: 500 });
  }
}
