"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ArrowUpRight, Building2, Clock, Download, Gift, ShieldCheck, TrendingUp } from "lucide-react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { LinearProgress } from "@/components/LinearProgress";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LoadingPulse } from "@/components/LoadingPulse";
import { companies } from "@/lib/companies";
import { getTelegramId } from "@/lib/client";
import { formatHMS } from "@/lib/format-time";
import { getTelegramUser } from "@/lib/telegram";
import { formatAddress } from "@/lib/stellar";
import { computeBatchProgress, computePendingReward, REWARD_ACCRUAL_MS } from "@/lib/rewards";
import type { Investment } from "@/models/User";
import { animateListCards, prefersReducedMotion } from "@/lib/animations";

function greetingHour(h: number) {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function useNextBatchCountdown(lastRewardAtIso: string, enabled: boolean) {
  const [label, setLabel] = useState("00:00:00");

  useEffect(() => {
    if (!enabled) return;
    const last = new Date(lastRewardAtIso).getTime();
    const tick = () => {
      const elapsed = Date.now() - last;
      const msInto = elapsed % REWARD_ACCRUAL_MS;
      const remain = REWARD_ACCRUAL_MS - msInto;
      setLabel(formatHMS(remain));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [lastRewardAtIso, enabled]);

  return label;
}

function ReadyDot() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const tl = gsap.to(el, {
      opacity: 0.35,
      duration: 0.45,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });
    return () => {
      tl.kill();
    };
  }, []);
  return (
    <span
      ref={ref}
      className="inline-block h-2 w-2 shrink-0 rounded-[var(--radius-full)] bg-[var(--accent-green)]"
      aria-hidden
    />
  );
}

function BatchRow({ inv }: { inv: Investment }) {
  const router = useRouter();
  const meta = computeBatchProgress(inv);
  const companyMeta = companies.find((c) => c.id === inv.companyId);
  const rate = companyMeta?.dailyRate ?? 0;
  const totalDailyReward = inv.tokensInvested * rate;
  const lastIso =
    typeof inv.lastRewardAt === "string"
      ? inv.lastRewardAt
      : new Date(inv.lastRewardAt).toISOString();
  const countdown = useNextBatchCountdown(lastIso, meta.batchesReady === 0);

  return (
    <Card data-stagger-card className="relative space-y-3 border-[var(--border)] pr-11">
      <button
        type="button"
        className="absolute right-2 top-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] hover:bg-[var(--background-primary)] hover:text-[var(--text-primary)]"
        aria-label={`Manage ${inv.companyName} stake on Companies`}
        onClick={() => router.push(`/companies?highlight=${encodeURIComponent(inv.companyId)}`)}
      >
        <ArrowUpRight className="h-5 w-5 min-h-[20px] min-w-[20px] shrink-0" aria-hidden />
      </button>
      <div className="flex flex-wrap items-center gap-2">
        {meta.batchesReady > 0 ? <ReadyDot /> : null}
        <span className="sg-text-md font-semibold text-[var(--text-primary)]">{inv.companyName}</span>
        <span className="sg-chip">{inv.assetCode}</span>
      </div>
      <LinearProgress percent={meta.batchesReady > 0 ? 100 : meta.progressToNextPercent} />
      <p className="sg-text-sm text-[var(--text-secondary)]">
        {meta.batchesReady > 0
          ? `${meta.batchesReady} batch${meta.batchesReady === 1 ? "" : "es"} ready — claim in Rewards`
          : `Next batch in ${countdown}`}
      </p>
      <p className="sg-text-lg font-bold leading-tight text-[var(--text-primary)]">
        Earning {totalDailyReward.toFixed(2)} {inv.assetCode} / day
      </p>
      <p className="sg-text-xs text-[var(--text-muted)]">
        GROW staked · {inv.tokensInvested.toFixed(2)} · earns {inv.assetCode} rewards
      </p>
    </Card>
  );
}

type UserState = {
  publicKey: string;
  growBalance: number;
  totalInvested: number;
  investments: Investment[];
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserState | null>(null);
  const [tick, setTick] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const statRef = useRef<HTMLDivElement>(null);

  const reload = () => {
    const telegramId = getTelegramId();
    fetch(`/api/user?telegramId=${encodeURIComponent(telegramId)}`).then((r) => {
      if (r.status === 404) {
        setUser(null);
        router.replace("/wallet");
        return null;
      }
      return r.json();
    }).then((data) => {
      if (data) setUser(data);
    });
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only load
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    if (!user) return;
    const t = requestAnimationFrame(() => {
      animateListCards(listRef.current);
      animateListCards(statRef.current, "[data-stat-card]");
    });
    return () => cancelAnimationFrame(t);
  }, [user]);

  const totalRewards = useMemo(() => {
    if (!user) return 0;
    return user.investments.reduce((s, i) => s + computePendingReward(i), 0);
  }, [user, tick]);

  const totalClaimable = totalRewards;

  const activeInvestments = useMemo(
    () => (user?.investments ?? []).filter((i) => i.tokensInvested > 0),
    [user],
  );

  const firstName = getTelegramUser()?.first_name?.trim() || "there";
  const hour = new Date().getHours();

  const claimAll = async () => {
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: getTelegramId(), claimAll: true }),
    });
    if (res.ok) reload();
  };

  if (!user) {
    return <LoadingPulse label="Loading your portfolio..." />;
  }

  return (
    <>
      <header
        className="-mx-4 mb-4 flex items-center justify-between gap-3 px-4 py-4"
        style={{ background: "var(--background-dark)" }}
        data-page-child
      >
        <p className="sg-text-md font-medium text-[var(--white)]">
          {greetingHour(hour)}, {firstName}
        </p>
        <div
          className="flex max-w-[52%] items-center gap-1.5 rounded-[var(--radius-md)] px-2 py-1.5"
          style={{ background: "var(--primary-green)" }}
        >
          <ShieldCheck size={14} className="shrink-0 text-[var(--white)]" aria-hidden />
          <span className="sg-text-xs font-medium truncate text-[var(--white)]">
            {formatAddress(user.publicKey)}
          </span>
        </div>
      </header>

      <div
        ref={statRef}
        className="-mx-1 mb-6 flex gap-3 overflow-x-auto pb-1"
        data-page-child
      >
        <Card
          data-stat-card
          className="min-w-[148px] shrink-0 space-y-2 border-[var(--border)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="sg-text-sm text-[var(--text-secondary)]">GROW available</span>
            <TrendingUp size={18} className="shrink-0 text-[var(--accent-green)]" aria-hidden />
          </div>
          <AnimatedNumber
            value={user.growBalance}
            className="sg-text-2xl font-semibold text-[var(--text-primary)]"
          />
          <p className="sg-text-xs text-[var(--text-muted)]">Available to invest</p>
        </Card>
        <Card
          data-stat-card
          className="min-w-[148px] shrink-0 space-y-2 border-[var(--border)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="sg-text-sm text-[var(--text-secondary)]">Total invested</span>
            <Building2 size={18} className="shrink-0 text-[var(--text-muted)]" aria-hidden />
          </div>
          <AnimatedNumber
            value={user.totalInvested}
            className="sg-text-2xl font-semibold text-[var(--text-primary)]"
          />
          <p className="sg-text-xs text-[var(--text-muted)]">Across all companies</p>
        </Card>
        <Card
          data-stat-card
          className="min-w-[148px] shrink-0 space-y-2 border-[var(--border)]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="sg-text-sm text-[var(--text-secondary)]">Pending rewards</span>
            <Gift
              size={18}
              className={`shrink-0 ${totalRewards > 0 ? "text-[var(--warning)]" : "text-[var(--text-muted)]"}`}
              aria-hidden
            />
          </div>
          <AnimatedNumber
            value={totalRewards}
            className="sg-text-2xl font-semibold text-[var(--text-primary)]"
          />
          <p className="sg-text-xs text-[var(--text-muted)]">Ready to claim</p>
        </Card>
      </div>

      <section className="mb-6 space-y-3" data-page-child>
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-[var(--text-secondary)]" aria-hidden />
          <h2 className="sg-text-lg font-semibold text-[var(--text-primary)]">Next reward batch</h2>
        </div>
        <div ref={listRef} className="space-y-3">
          {activeInvestments.map((inv) => (
            <BatchRow key={inv.companyId} inv={inv} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 pb-24" data-page-child>
        <Button
          variant="secondary"
          block
          className="w-full items-start gap-2 text-left [&>span:last-child]:min-w-0 [&>span:last-child]:whitespace-normal [&>span:last-child]:break-words"
          onClick={() => router.push("/companies")}
        >
          <span className="inline-flex shrink-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:min-h-[20px] [&>svg]:min-w-[20px]">
            <Building2 aria-hidden />
          </span>
          <span>Browse companies</span>
        </Button>
        <Button
          variant="primary"
          block
          className="w-full items-start gap-2 text-left [&>span:last-child]:min-w-0 [&>span:last-child]:whitespace-normal [&>span:last-child]:break-words"
          onClick={claimAll}
          disabled={totalClaimable <= 0}
        >
          <span className="inline-flex shrink-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:min-h-[20px] [&>svg]:min-w-[20px]">
            <Download aria-hidden />
          </span>
          <span>Claim all rewards</span>
        </Button>
      </div>

      <div
        className={`pointer-events-none fixed left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 px-4 transition-transform duration-300 ease-out ${
          totalClaimable > 0 ? "translate-y-0" : "translate-y-[140%]"
        }`}
        style={{
          bottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 8px)",
        }}
      >
        <div className="pointer-events-auto">
          <Button
            variant="primary"
            block
            onClick={claimAll}
            disabled={totalClaimable <= 0}
            className="items-start gap-2 text-left [&>span:last-child]:min-w-0 [&>span:last-child]:whitespace-normal [&>span:last-child]:break-words"
          >
            <span className="inline-flex shrink-0 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:min-h-[20px] [&>svg]:min-w-[20px]">
              <Download aria-hidden />
            </span>
            <span>Rewards ready — claim all</span>
          </Button>
        </div>
      </div>
    </>
  );
}
