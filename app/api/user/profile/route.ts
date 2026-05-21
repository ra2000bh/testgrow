import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readTelegramIdFromSession } from "@/lib/auth-session";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";
import { connectToDatabase } from "@/lib/mongodb";
import { parseTelegramUserFromInitData } from "@/lib/telegram-profile";
import { verifyTelegramInitData, getTelegramIdFromInitData } from "@/lib/telegram-auth";
import { User } from "@/models/User";

const schema = z.object({
  initData: z.string().min(1).optional(),
  username: z.string().optional(),
  firstName: z.string().optional(),
  photoUrl: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const telegramId = readTelegramIdFromSession(request);
    if (!telegramId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    const body = schema.parse(await request.json());
    let username = body.username?.trim();
    let firstName = body.firstName?.trim();
    let photoUrl = body.photoUrl?.trim() || undefined;

    const initData = body.initData?.trim() ?? "";
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (initData && botToken) {
      if (!verifyTelegramInitData(initData, botToken)) {
        return NextResponse.json(
          { success: false, message: "Invalid Telegram session data." },
          { status: 401, headers: CACHE_PRIVATE_NO_STORE },
        );
      }
      const idFromInit = getTelegramIdFromInitData(initData);
      if (idFromInit && idFromInit !== telegramId) {
        return NextResponse.json(
          { success: false, message: "Telegram user mismatch." },
          { status: 403, headers: CACHE_PRIVATE_NO_STORE },
        );
      }
      const parsed = parseTelegramUserFromInitData(initData);
      if (parsed) {
        username = parsed.username ?? username;
        firstName = parsed.firstName ?? firstName;
        photoUrl = parsed.photoUrl ?? photoUrl;
      }
    }

    await connectToDatabase();
    const user = await User.findOne({ telegramId });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    if (username) user.telegramUsername = username;
    if (firstName) user.telegramFirstName = firstName;
    if (photoUrl) user.telegramPhotoUrl = photoUrl;
    await user.save();

    return NextResponse.json({ success: true }, { headers: CACHE_PRIVATE_NO_STORE });
  } catch {
    return NextResponse.json(
      { success: false, message: "Profile sync failed." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}
