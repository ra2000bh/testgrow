import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GROW_ASSET_CODE } from "@/lib/companies";
import { connectToDatabase } from "@/lib/mongodb";
import { getIssuedAssetBalance } from "@/lib/stellar";
import { User } from "@/models/User";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";

const SYNC_COOLDOWN_MS = 60_000;

const schema = z.object({
  telegramId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { telegramId } = schema.parse(await request.json());
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

    const last = user.lastBalanceSyncAt ? new Date(user.lastBalanceSyncAt).getTime() : 0;
    if (last > 0 && Date.now() - last < SYNC_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil((SYNC_COOLDOWN_MS - (Date.now() - last)) / 1000);
      return NextResponse.json(
        {
          success: false,
          message: `Sync is rate-limited. Try again in ${retryAfterSec}s.`,
          retryAfterMs: SYNC_COOLDOWN_MS - (Date.now() - last),
        },
        {
          status: 429,
          headers: { ...CACHE_PRIVATE_NO_STORE, "Retry-After": String(Math.max(1, retryAfterSec)) },
        },
      );
    }

    const issuer = process.env.NEXT_PUBLIC_STELLAR_ISSUER_ADDRESS?.trim();
    if (!issuer) {
      return NextResponse.json(
        { success: false, message: "Issuer address is not configured." },
        { status: 503, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    const onChain = await getIssuedAssetBalance(user.publicKey, GROW_ASSET_CODE, issuer);
    if (onChain === null) {
      return NextResponse.json(
        { success: false, message: "Could not read account from Stellar Horizon." },
        { status: 502, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    user.growBalance = onChain;
    user.lastBalanceSyncAt = new Date();
    await user.save();

    return NextResponse.json(
      {
        success: true,
        growBalance: user.growBalance,
        lastBalanceSyncAt: user.lastBalanceSyncAt.toISOString(),
      },
      { headers: CACHE_PRIVATE_NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Balance sync failed." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}
