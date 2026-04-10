import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";

const schema = z.object({
  telegramId: z.string().min(1),
});

/** Deletes the Telegram user and all portfolio data. Next registration starts fresh. */
export async function POST(request: NextRequest) {
  try {
    const { telegramId } = schema.parse(await request.json());
    await connectToDatabase();
    const result = await User.deleteOne({ telegramId });
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "No account found." },
        { status: 404, headers: CACHE_PRIVATE_NO_STORE },
      );
    }
    return NextResponse.json({ success: true }, { headers: CACHE_PRIVATE_NO_STORE });
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not delete account." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}
