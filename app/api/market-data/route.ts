import { NextResponse } from "next/server";
import { buildMarketSnapshot } from "@/lib/market-data";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";

export async function GET() {
  try {
    const tokens = buildMarketSnapshot();
    return NextResponse.json(
      { tokens, generatedAt: new Date().toISOString() },
      { headers: CACHE_PRIVATE_NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { message: "Failed to build market snapshot." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}
