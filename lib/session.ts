import type { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function getSessionFlags(request: NextRequest) {
  const raw = request.cookies.get("stellargrow_telegram_id")?.value;
  const telegramId = raw ? decodeURIComponent(raw.trim()) : "";

  if (!telegramId) {
    return { hasUser: false, isVerified: false };
  }

  await connectToDatabase();
  const user = await User.findOne({ telegramId }).lean();
  if (!user) {
    return { hasUser: false, isVerified: false };
  }

  return {
    hasUser: true,
    isVerified: Boolean(user.isVerified),
  };
}
