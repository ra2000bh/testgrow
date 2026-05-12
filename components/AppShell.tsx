"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { syncSessionCookie } from "@/lib/client";
import { fetchApiUserCloned, resetApiUserFetchDedupe } from "@/lib/fetch-api-user";
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
    syncSessionCookie().catch(() => {
      /* ignore */
    });
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const run = (forceFresh = false) => {
      if (forceFresh) resetApiUserFetchDedupe();
      fetchApiUserCloned()
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled) setVerified(Boolean(data?.isVerified));
        })
        .catch(() => {
          if (!cancelled) setVerified(false);
        });
    };
    const t = window.setTimeout(() => run(false), 0);
    const onSession = () => run(true);
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
