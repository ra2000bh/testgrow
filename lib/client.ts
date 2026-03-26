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
