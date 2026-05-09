import type { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { readTelegramIdFromSession } from "@/lib/auth-session";

export async function getSessionFlags(request: NextRequest) {
  const telegramId = readTelegramIdFromSession(request) ?? "";

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
