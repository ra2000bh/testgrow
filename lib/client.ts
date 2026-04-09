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
