"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Building2, Gift, Link2, Wallet } from "lucide-react";
import { animateTabIconActive } from "@/lib/animations";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/companies", label: "Companies", Icon: Building2 },
  { href: "/rewards", label: "Rewards", Icon: Gift },
  { href: "/trustlines", label: "Trustlines", Icon: Link2 },
  { href: "/wallet", label: "Wallet", Icon: Wallet },
] as const;

export function BottomNav({ verified }: { verified: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const prevPath = useRef(pathname);
  const iconRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  useEffect(() => {
    const prev = prevPath.current;
    prevPath.current = pathname;
    if (prev === pathname) return;
    const active = NAV.find(
      (n) => pathname === n.href || (n.href !== "/wallet" && pathname.startsWith(`${n.href}/`)),
    );
    if (active) animateTabIconActive(iconRefs.current[active.href] ?? null);
  }, [pathname]);

  return (
    <nav className="sg-bottom-nav" aria-label="Main">
      {NAV.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/wallet" && pathname.startsWith(`${item.href}/`));
        const isWalletTab = item.href === "/wallet";
        const disabledGate = !verified && !isWalletTab;
        const Icon = item.Icon;

        return (
          <button
            key={item.href}
            type="button"
            title={disabledGate ? "Add your wallet first to access this" : undefined}
            onClick={() => {
              if (disabledGate) return;
              router.push(item.href);
            }}
            className={`relative flex flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] py-1 ${
              disabledGate ? "cursor-not-allowed opacity-[0.35]" : "cursor-pointer opacity-100"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {active ? (
              <span
                className="absolute top-1 h-1 w-1 rounded-[var(--radius-full)] bg-[var(--accent-green)]"
                aria-hidden
              />
            ) : null}
            <span
              ref={(el) => {
                iconRefs.current[item.href] = el;
              }}
              className="sg-will-animate flex items-center justify-center"
            >
              <Icon
                size={22}
                strokeWidth={2}
                className={
                  active ? "text-[var(--primary-green)]" : "text-[var(--text-muted)]"
                }
                aria-hidden
              />
            </span>
            <span
              className={`sg-text-xs font-medium leading-[var(--text-xs-leading)] ${
                active ? "text-[var(--primary-green)]" : "text-[var(--text-muted)]"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
