"use client";

import { getTelegramUser } from "@/lib/telegram";
import { clearAppDataSnapshot } from "@/lib/app-data-snapshot";

export function getTelegramId() {
  const fromTelegram = getTelegramUser()?.id?.toString();
  if (fromTelegram) {
    localStorage.setItem("stellargrow_telegram_id", fromTelegram);
    return fromTelegram;
  }
  return localStorage.getItem("stellargrow_telegram_id") || "";
}

export async function syncSessionCookie() {
  if (typeof window === "undefined") return;
  const tg = (
    window as unknown as {
      Telegram?: { WebApp?: { initData?: string } };
    }
  ).Telegram?.WebApp;
  const initData = tg?.initData?.trim() || "";
  const fallbackTelegramId = getTelegramId();
  if (!initData && !fallbackTelegramId) return;
  await fetch("/api/session/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      initData: initData || undefined,
      telegramId: fallbackTelegramId || undefined,
    }),
  });
}

const SESSION_UPDATE_EVENT = "stellargrow:session-update";

/** Clears stored Telegram session (local + cookie). */
export function disconnectSession() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("stellargrow_telegram_id");
  } catch {
    /* ignore */
  }
  clearAppDataSnapshot();
  fetch("/api/session/init", { method: "DELETE" }).catch(() => {
    /* ignore */
  });
  window.dispatchEvent(new Event(SESSION_UPDATE_EVENT));
}
