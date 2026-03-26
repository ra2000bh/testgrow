"use client";

type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  initDataUnsafe?: { user?: { id?: number; username?: string } };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
};

function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return (
    window as unknown as {
      Telegram?: { WebApp?: TelegramWebApp };
    }
  ).Telegram?.WebApp ?? null;
}

export function initTelegramWebApp() {
  try {
    const WebApp = getWebApp();
    if (!WebApp) return false;
    WebApp.ready();
    WebApp.expand();
    return Boolean(WebApp.initDataUnsafe?.user);
  } catch {
    return false;
  }
}

export function getTelegramUser() {
  try {
    const WebApp = getWebApp();
    if (!WebApp) return null;
    return WebApp.initDataUnsafe?.user ?? null;
  } catch {
    return null;
  }
}

export function setupTelegramBackButton(pathname: string) {
  try {
    const WebApp = getWebApp();
    if (!WebApp) return;
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
