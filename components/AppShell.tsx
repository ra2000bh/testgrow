"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getTelegramId, syncSessionCookie } from "@/lib/client";
import { initTelegramWebApp, setupTelegramBackButton } from "@/lib/telegram";
import { BottomNav } from "@/components/BottomNav";
import { PageWrapper } from "@/components/PageWrapper";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    initTelegramWebApp();
  }, []);

  useEffect(() => {
    setupTelegramBackButton(pathname);
  }, [pathname]);

  useEffect(() => {
    syncSessionCookie();
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      const id = getTelegramId();
      if (!id) {
        if (!cancelled) setVerified(false);
        return;
      }
      fetch(`/api/user?telegramId=${encodeURIComponent(id)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled) setVerified(Boolean(data?.isVerified));
        })
        .catch(() => {
          if (!cancelled) setVerified(false);
        });
    };
    const t = window.setTimeout(run, 0);
    const onSession = () => run();
    window.addEventListener("stellargrow:session-update", onSession);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener("stellargrow:session-update", onSession);
    };
  }, [pathname]);

  return (
    <div className="sg-app-shell mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
      <main className="sg-main flex min-h-0 flex-1 flex-col">
        <PageWrapper key={pathname}>{children}</PageWrapper>
      </main>
      <BottomNav verified={verified} />
    </div>
  );
}
