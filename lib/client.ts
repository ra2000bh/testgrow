"use client";

import { getTelegramUser } from "@/lib/telegram";

export function getTelegramId() {
  const fromTelegram = getTelegramUser()?.id?.toString();
  if (fromTelegram) {
    localStorage.setItem("stellargrow_telegram_id", fromTelegram);
    return fromTelegram;
  }
  return localStorage.getItem("stellargrow_telegram_id") || "";
}

export function syncSessionCookie() {
  if (typeof document === "undefined") return;
  const id = getTelegramId();
  if (!id) return;
  document.cookie = `stellargrow_telegram_id=${encodeURIComponent(id)}; path=/; max-age=31536000; SameSite=Lax`;
}
