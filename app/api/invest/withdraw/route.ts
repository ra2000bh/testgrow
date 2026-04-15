import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { computePendingReward } from "@/lib/rewards";
import type { Investment } from "@/models/User";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";
import { getWalletGrowBalance } from "@/lib/stellar";

const schema = z.object({
  telegramId: z.string().min(1),
  companyId: z.string().min(1),
});

/** Return principal + any accrued (unclaimed) rewards for this stake to GROW balance; remove the position. */
export async function POST(request: NextRequest) {
  try {
    const { telegramId, companyId } = schema.parse(await request.json());
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

    const pending = computePendingReward(inv);
    const principal = inv.tokensInvested;
    user.totalInvested = Math.max(0, user.totalInvested - principal);
    investments.splice(idx, 1);

    await user.save();
    const chainGrowBalance = await getWalletGrowBalance(user.publicKey);
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
