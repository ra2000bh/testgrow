import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tryVerifyUserByPayment } from "@/lib/verification";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";

const schema = z.object({
  telegramId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { telegramId } = schema.parse(await request.json());

    const deadline = Date.now() + 30_000;

    while (Date.now() < deadline) {
      const last = await tryVerifyUserByPayment(telegramId);
      if (last.kind === "verified") {
        return NextResponse.json(
          { success: true, message: "Wallet verified." },
          { headers: CACHE_PRIVATE_NO_STORE },
        );
      }
      if (last.kind === "error") {
        return NextResponse.json(
          { success: false, message: last.message },
          { status: 400, headers: CACHE_PRIVATE_NO_STORE },
        );
      }
      await new Promise((r) => setTimeout(r, 5000));
    }

    return NextResponse.json(
      {
        success: false,
        message: "We couldn't find your payment yet. Please wait a moment and try again.",
      },
      { headers: CACHE_PRIVATE_NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Verification failed. Please retry." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}
