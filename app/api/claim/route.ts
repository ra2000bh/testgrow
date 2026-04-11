import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { computePendingReward } from "@/lib/rewards";
import type { Investment } from "@/models/User";
import { accountHasTrustline, sendBatchAssetPayments, toStellarAmount } from "@/lib/stellar";
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

    const publisherSecret = process.env.PUBLISHER_SECRET_KEY?.trim();
    if (!publisherSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "Publisher (reward) wallet is not configured. Set PUBLISHER_SECRET_KEY on the server.",
        },
        { status: 503, headers: CACHE_PRIVATE_NO_STORE },
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

    const payouts: { inv: Investment; pending: number }[] = [];
    for (const inv of list) {
      const pending = computePendingReward(inv);
      if (pending > 0) payouts.push({ inv, pending });
    }

    if (payouts.length === 0) {
      return NextResponse.json(
        { success: false, message: "No rewards to claim." },
        { status: 400, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    for (const { inv } of payouts) {
      const hasLine = await accountHasTrustline(user.publicKey, inv.assetCode, inv.issuer);
      if (!hasLine) {
        return NextResponse.json(
          {
            success: false,
            message: `Add a trustline for ${inv.assetCode} in your Stellar wallet (Trustlines tab), then claim again.`,
          },
          { status: 400, headers: CACHE_PRIVATE_NO_STORE },
        );
      }
    }

    let payments: { assetCode: string; issuerPublicKey: string; amount: string }[];
    try {
      payments = payouts.map(({ inv, pending }) => ({
        assetCode: inv.assetCode,
        issuerPublicKey: inv.issuer,
        amount: toStellarAmount(pending),
      }));
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid reward amount." },
        { status: 400, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    try {
      await sendBatchAssetPayments({
        distributorSecret: publisherSecret,
        destinationPublicKey: user.publicKey,
        payments,
        memo: "StellarGrow rewards",
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Stellar network error";
      return NextResponse.json(
        { success: false, message: `Could not send tokens. ${msg.slice(0, 220)}` },
        { status: 502, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    for (const { inv } of payouts) {
      inv.lastRewardAt = new Date();
      inv.accumulatedReward = 0;
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
