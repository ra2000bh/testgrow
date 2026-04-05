import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { companies } from "@/lib/companies";
import { accountHasTrustline } from "@/lib/stellar";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";

const TEN_MIN_MS = 10 * 60 * 1000;

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
    const user = await User.findOne({ telegramId });
    if (!user) {
      return NextResponse.json(
        { message: "User not found." },
        { status: 404, headers: CACHE_PRIVATE_NO_STORE },
      );
    }
    if (!user.isVerified) {
      return NextResponse.json(
        { message: "Wallet not verified" },
        { status: 403, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    const now = Date.now();
    for (const company of companies) {
      const row = user.trustlines.find((t: { companyId: string }) => t.companyId === company.id);
      const last = row?.lastCheckedAt ? new Date(row.lastCheckedAt).getTime() : 0;
      const stale = !last || now - last > TEN_MIN_MS;

      if (stale) {
        const has = await accountHasTrustline(user.publicKey, company.assetCode, company.issuer);
        if (row) {
          row.confirmed = has;
          row.lastCheckedAt = new Date();
        } else {
          user.trustlines.push({
            companyId: company.id,
            confirmed: has,
            lastCheckedAt: new Date(),
          });
        }
      }
    }

    await user.save();
    return NextResponse.json(
      { trustlines: user.trustlines },
      { headers: CACHE_PRIVATE_NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { message: "Trustline check failed." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}
