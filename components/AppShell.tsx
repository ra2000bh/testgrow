"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { getTelegramUser, initTelegramWebApp, setupTelegramBackButton } from "@/lib/telegram";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/companies", label: "Companies" },
  { href: "/rewards", label: "Rewards" },
  { href: "/trustlines", label: "Trustlines" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTelegram =
    typeof window === "undefined"
      ? true
      : Boolean((window as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: unknown } } } }).Telegram?.WebApp?.initDataUnsafe?.user);

  useEffect(() => {
    initTelegramWebApp();
  }, []);

  useEffect(() => {
    setupTelegramBackButton(pathname);
  }, [pathname]);

  if (!isTelegram) {
    return (
      <main className="app-shell flex min-h-dvh items-center justify-center p-4">
        <div className="card max-w-sm text-center">
          <h1 className="text-2xl font-extrabold">StellarGrow</h1>
          <p className="mt-3 text-base text-[#A0A0B0]">
            Please open this app inside Telegram to continue.
          </p>
        </div>
      </main>
    );
  }

  const user = getTelegramUser();

  return (
    <div className="app-shell mx-auto flex min-h-dvh w-full max-w-[480px] flex-col pb-24">
      <header className="px-4 pb-2 pt-4">
        <p className="text-sm text-[#A0A0B0]">Telegram: @{user?.username ?? "guest"}</p>
      </header>
      <main className="flex-1 px-4 pb-4">{children}</main>
      {isTelegram && (
        <nav className="fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 border-t border-[#353550] bg-[#141428] px-2 py-2">
          <div className="grid grid-cols-4 gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-2 py-3 text-center text-sm font-bold ${
                    active ? "bg-[#6A0DAD] text-white" : "bg-[#1A1A2E] text-[#E8E8E8]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
