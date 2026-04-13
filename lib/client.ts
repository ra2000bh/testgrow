"use client";

import { getTelegramUser } from "@/lib/telegram";

function getTelegramIdFromCookie() {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)stellargrow_telegram_id=([^;]*)/);
  if (!m?.[1]) return "";
  try {
    return decodeURIComponent(m[1].trim());
  } catch {
    return m[1].trim();
  }
}

export function getTelegramId() {
  const fromTelegram = getTelegramUser()?.id?.toString();
  if (fromTelegram) {
    localStorage.setItem("stellargrow_telegram_id", fromTelegram);
    return fromTelegram;
  }
  return localStorage.getItem("stellargrow_telegram_id") || getTelegramIdFromCookie() || "";
}

export function syncSessionCookie() {
  if (typeof document === "undefined") return;
  const id = getTelegramId();
  if (!id) return;
  document.cookie = `stellargrow_telegram_id=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
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
  document.cookie = "stellargrow_telegram_id=; path=/; max-age=0; SameSite=Lax";
  window.dispatchEvent(new Event(SESSION_UPDATE_EVENT));
}
