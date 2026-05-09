import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";
import { createSignedSessionCookie, getSessionCookieName } from "@/lib/auth-session";
import { getTelegramIdFromInitData, verifyTelegramInitData } from "@/lib/telegram-auth";

const schema = z.object({
  initData: z.string().min(1).optional(),
  telegramId: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = schema.parse(await request.json());
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const initData = body.initData?.trim() ?? "";

    let telegramId: string | null = null;
    if (botToken && initData) {
      const isValid = verifyTelegramInitData(initData, botToken);
      if (!isValid) {
        return NextResponse.json(
          { success: false, message: "Invalid Telegram session data." },
          { status: 401, headers: CACHE_PRIVATE_NO_STORE },
        );
      }
      telegramId = getTelegramIdFromInitData(initData);
    } else if (process.env.NODE_ENV !== "production") {
      telegramId = body.telegramId?.trim() ?? null;
    } else {
      return NextResponse.json(
        { success: false, message: "Server auth is not configured." },
        { status: 503, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    if (!telegramId) {
      return NextResponse.json(
        { success: false, message: "Missing Telegram user id." },
        { status: 400, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    const session = createSignedSessionCookie(telegramId);
    const response = NextResponse.json({ success: true }, { headers: CACHE_PRIVATE_NO_STORE });
    response.cookies.set({
      name: session.name,
      value: session.value,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: session.maxAge,
    });
    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not initialize session." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true }, { headers: CACHE_PRIVATE_NO_STORE });
  response.cookies.set({
    name: getSessionCookieName(),
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
