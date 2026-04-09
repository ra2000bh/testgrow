import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tryVerifyUserByPayment } from "@/lib/verification";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";

const schema = z.object({
  telegramId: z.string().min(1),
});

/** Single Horizon check — use when user taps “Check now” instead of waiting for the stream. */
export async function POST(request: NextRequest) {
  try {
    const { telegramId } = schema.parse(await request.json());
    const result = await tryVerifyUserByPayment(telegramId);

    if (result.kind === "verified") {
      return NextResponse.json(
        { success: true, verified: true },
        { headers: CACHE_PRIVATE_NO_STORE },
      );
    }
    if (result.kind === "error") {
      return NextResponse.json(
        { success: false, verified: false, message: result.message },
        { status: 400, headers: CACHE_PRIVATE_NO_STORE },
      );
    }
    return NextResponse.json(
      {
        success: true,
        verified: false,
        message: "Payment not found yet. Confirm the memo and try again in a few seconds.",
      },
      { headers: CACHE_PRIVATE_NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { success: false, verified: false, message: "Check failed. Try again." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}
