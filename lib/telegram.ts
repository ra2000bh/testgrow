"use client";

import WebApp from "@twa-dev/sdk";

export function initTelegramWebApp() {
  try {
    WebApp.ready();
    WebApp.expand();
    return Boolean(WebApp.initDataUnsafe?.user);
  } catch {
    return false;
  }
}

export function getTelegramUser() {
  try {
    return WebApp.initDataUnsafe?.user ?? null;
  } catch {
    return null;
  }
}

export function setupTelegramBackButton(pathname: string) {
  try {
    if (pathname === "/") {
      WebApp.BackButton.hide();
      return;
    }
    WebApp.BackButton.show();
    WebApp.BackButton.onClick(() => window.history.back());
  } catch {
    // ignore outside Telegram
  }
}
