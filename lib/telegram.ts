"use client";

type TelegramUser = { id?: number; username?: string; first_name?: string };

type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  /** Signed init string; may contain `user` when initDataUnsafe is empty on some clients. */
  initData?: string;
  initDataUnsafe?: { user?: TelegramUser };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
};

function parseUserFromInitData(webApp: TelegramWebApp): TelegramUser | null {
  try {
    const raw = webApp.initData;
    if (!raw || typeof raw !== "string") return null;
    const params = new URLSearchParams(raw);
    const userJson = params.get("user");
    if (!userJson) return null;
    return JSON.parse(userJson) as TelegramUser;
  } catch {
    return null;
  }
}

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
    const unsafe = WebApp.initDataUnsafe?.user;
    if (unsafe?.id != null) return unsafe;
    const parsed = parseUserFromInitData(WebApp);
    if (parsed?.id != null) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function setupTelegramBackButton(pathname: string) {
  try {
    const WebApp = getWebApp();
    if (!WebApp) return;
    if (pathname === "/" || pathname === "/wallet") {
      WebApp.BackButton.hide();
      return;
    }
    WebApp.BackButton.show();
    WebApp.BackButton.onClick(() => window.history.back());
  } catch {
    // ignore outside Telegram
  }
}
