import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { computePendingReward } from "@/lib/rewards";
import type { Investment } from "@/models/User";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";

const schema = z.object({
  telegramId: z.string().min(1),
  companyId: z.string().min(1).optional(),
  claimAll: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    if (!body.claimAll && !body.companyId) {
      return NextResponse.json(
        { success: false, message: "Specify companyId or claimAll." },
        { status: 400, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    await connectToDatabase();
    const user = await User.findOne({ telegramId: body.telegramId });
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
    const list = investments.filter((inv) =>
      body.claimAll ? true : inv.companyId === body.companyId,
    );

    let claimedAny = false;
    for (const inv of list) {
      const pending = computePendingReward(inv);
      if (pending <= 0) continue;
      inv.lastRewardAt = new Date();
      inv.accumulatedReward = 0;
      claimedAny = true;
    }

    if (!claimedAny) {
      return NextResponse.json(
        { success: false, message: "No rewards to claim." },
        { status: 400, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    await user.save();
    return NextResponse.json({ success: true }, { headers: CACHE_PRIVATE_NO_STORE });
  } catch {
    return NextResponse.json(
      { success: false, message: "Claim failed." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}
