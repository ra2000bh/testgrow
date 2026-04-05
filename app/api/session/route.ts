import { NextRequest, NextResponse } from "next/server";
import { getSessionFlags } from "@/lib/session";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";

export async function GET(request: NextRequest) {
  try {
    const data = await getSessionFlags(request);
    return NextResponse.json(data, { headers: CACHE_PRIVATE_NO_STORE });
  } catch {
    return NextResponse.json(
      { hasUser: false, isVerified: false },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}
