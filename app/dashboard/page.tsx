"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { DashboardAllocationBar } from "@/components/dashboard/DashboardAllocationBar";
import { DashboardInsights } from "@/components/dashboard/DashboardInsights";
import type { EnrichedInvestment } from "@/components/dashboard/DashboardRewardsPanel";
import { DashboardRewardsPanel } from "@/components/dashboard/DashboardRewardsPanel";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardTickerStrip } from "@/components/dashboard/DashboardTickerStrip";
import { PortfolioChartPanel } from "@/components/dashboard/PortfolioChartPanel";
import { companies, GROW_ASSET_CODE } from "@/lib/companies";
import { GROW_TO_XLM_RATE, growBalanceToXlmDisplay } from "@/lib/grow-xlm";
import { disconnectSession } from "@/lib/client";
import {
  buildPortfolioChartSeries,
  computePortfolioUsd,
  computeTodayChangeUsd,
  mergeLivePortfolioPoint,
  portfolioSymbolsForAverage,
  type ChartRange,
} from "@/lib/dashboard-portfolio";
import { formatAddress } from "@/lib/stellar";
import { getTelegramUser } from "@/lib/telegram";
import { computeBatchProgress, formatRewardEta } from "@/lib/rewards";
import type { PricePoint } from "@/lib/market-data";

function greetingHour(h: number) {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type MarketPayload = {
  tokens: { symbol: string; priceUsd: number; history: PricePoint[] }[];
  generatedAt: string;
};

type UserPayload = {
  publicKey: string;
  growBalance: number;
  totalInvested: number;
  isVerified: boolean;
  lastBalanceSyncAt: string | null;
  investments: EnrichedInvestment[];
};

const MARKET_POLL_MS: Record<ChartRange, number> = {
  "1W": 3 * 60_000,
  "1M": 2 * 60_000,
  "3M": 2 * 60_000,
};

function changePctFromHistory(history: PricePoint[]): number {
  if (history.length < 2) return 0;
  const a = history[history.length - 2].v;
  const b = history[history.length - 1].v;
  if (!(a > 0)) return 0;
  return ((b - a) / a) * 100;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserPayload | null>(null);
  const [market, setMarket] = useState<MarketPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(0);
  const [chartRange, setChartRange] = useState<ChartRange>("3M");
  const [chartAnimKey, setChartAnimKey] = useState(0);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimNotice, setClaimNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [loadError, setLoadError] = useState("");
  const claimNoticeTimerRef = useRef<number | null>(null);

  const showClaimNotice = useCallback((kind: "success" | "error", text: string) => {
    if (claimNoticeTimerRef.current) window.clearTimeout(claimNoticeTimerRef.current);
    setClaimNotice({ kind, text });
    claimNoticeTimerRef.current = window.setTimeout(() => {
      setClaimNotice(null);
      claimNoticeTimerRef.current = null;
    }, 3500);
  }, []);

  const toFriendlyClaimError = useCallback((message: unknown) => {
    if (typeof message !== "string" || !message.trim()) {
      return "Something went wrong while sending rewards. Please contact support.";
    }
    const msg = message.trim();
    const lower = msg.toLowerCase();
    if (lower.includes("trustline")) return msg;
    if (lower.includes("no rewards")) return "No claimable rewards yet. Please wait for the next reward window.";
    if (lower.includes("wallet not verified")) return "Please verify your wallet before claiming rewards.";
    if (lower.includes("network") || lower.includes("horizon")) {
      return "Stellar network is temporarily unavailable. Please try again shortly.";
    }
    return "Something went wrong while sending rewards. Please contact support.";
  }, []);

  const reload = useCallback(() => {
    return Promise.all([
      fetch("/api/user").then((r) => {
        if (r.status === 401) {
          setUser(null);
          router.replace("/wallet");
          return null;
        }
        if (r.status === 404) {
          setUser(null);
          router.replace("/wallet");
          return null;
        }
        return r.json();
      }),
      fetch("/api/market-data").then((r) => (r.ok ? r.json() : null)),
    ]).then(([u, m]) => {
      if (u) {
        setUser(u as UserPayload);
      }
      if (m) setMarket(m as MarketPayload);
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    setLoadError("");
    reload().catch(() => {
      setLoadError("Could not load dashboard.");
      setLoading(false);
    });
  }, [reload]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (claimNoticeTimerRef.current) window.clearTimeout(claimNoticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const intervalMs = MARKET_POLL_MS[chartRange];
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/market-data")
        .then((r) => (r.ok ? r.json() : null))
        .then((m) => {
          if (m) setMarket(m as MarketPayload);
        })
        .catch(() => {
          /* ignore transient market refresh failures */
        });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [chartRange]);

  useEffect(() => {
    setChartAnimKey((k) => k + 1);
  }, [chartRange]);

  const histories = useMemo(() => {
    const h: Record<string, PricePoint[]> = {};
    if (!market?.tokens) return h;
    for (const t of market.tokens) {
      h[t.symbol] = t.history;
    }
    return h;
  }, [market]);

  const pendingByCompanyId = useMemo(() => {
    void clock;
    if (!user) return {};
    const map: Record<string, number> = {};
    for (const inv of user.investments) {
      const computed = computeBatchProgress(inv).totalPending;
      map[inv.companyId] = Math.max(0, Math.max(inv.accumulatedReward, computed));
    }
    return map;
  }, [user, clock]);

  const pricesBySymbol = useMemo(() => {
    if (!market?.tokens) return {} as Record<string, number>;
    return Object.fromEntries(market.tokens.map((t) => [t.symbol, t.priceUsd]));
  }, [market]);

  const portfolioUsd = useMemo(() => {
    if (!user) return 0;
    const v = computePortfolioUsd({
      growBalance: user.growBalance,
      investments: user.investments,
      pendingByCompanyId,
      prices: pricesBySymbol,
    });
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }, [user, pendingByCompanyId, pricesBySymbol]);

  const holdingsBySymbol = useMemo(() => {
    const map: Record<string, number> = {};
    if (!user) return map;
    for (const inv of user.investments) {
      const pending = pendingByCompanyId[inv.companyId] ?? 0;
      const walletHeld = Math.max(0, inv.walletAssetBalance ?? 0);
      map[inv.assetCode] = (map[inv.assetCode] ?? 0) + walletHeld + pending;
    }
    return map;
  }, [user, pendingByCompanyId]);

  const chartSymbols = useMemo(() => {
    if (!user) return [] as string[];
    return portfolioSymbolsForAverage(user.growBalance, user.investments);
  }, [user]);

  const chartRows3M = useMemo(() => {
    if (!user || chartSymbols.length === 0) return [];
    const built = buildPortfolioChartSeries({
      range: "3M",
      holdingsBySymbol,
      histories,
    });
    return mergeLivePortfolioPoint(built, portfolioUsd);
  }, [user, chartSymbols, holdingsBySymbol, histories, portfolioUsd]);

  const chartRows = useMemo(() => {
    if (!user || chartSymbols.length === 0) return [];
    const built = buildPortfolioChartSeries({
      range: chartRange,
      holdingsBySymbol,
      histories,
    });
    return mergeLivePortfolioPoint(built, portfolioUsd);
  }, [user, chartRange, chartSymbols, holdingsBySymbol, histories, portfolioUsd]);

  const { deltaUsd, deltaPct } = useMemo(
    () => computeTodayChangeUsd(chartRows3M, portfolioUsd),
    [chartRows3M, portfolioUsd],
  );

  const tickerItems = useMemo(() => {
    if (!market?.tokens) return [];
    return market.tokens.map((t) => ({
      symbol: t.symbol,
      price: t.priceUsd,
      changePct: changePctFromHistory(t.history),
    }));
  }, [market]);

  const insightLines = useMemo(() => {
    void clock;
    if (!user) return [];
    const active = user.investments.filter((i) => i.tokensInvested > 0);
    const best = active
      .map((i) => {
        const c = companies.find((x) => x.id === i.companyId);
        return c ? { name: c.name, rate: c.dailyRate } : null;
      })
      .filter(Boolean) as { name: string; rate: number }[];
    const bestLine =
      best.length > 0
        ? `Best performer: ${best.reduce((a, b) => (b.rate > a.rate ? b : a)).name} (${best.reduce((a, b) => (b.rate > a.rate ? b : a)).rate.toFixed(2)}% / day on staked GROW).`
        : "Stake with a company to see performance insights.";

    const msList = active.map((i) => computeBatchProgress(i).msUntilNextBatch);
    const ms = msList.length ? Math.min(...msList) : 0;
    const accrualLine =
      active.length > 0
        ? `Next accrual window: ~${formatRewardEta(ms)} until the next reward batch boundary (estimate).`
        : "No active stakes - accruals start after you invest.";

    const driftLine =
      Math.abs(deltaUsd) < 0.0001
        ? "Portfolio drift: flat vs prior close on the blended benchmark."
        : `Portfolio drift: ${deltaUsd >= 0 ? "+" : ""}$${deltaUsd.toFixed(2)} (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(2)}%) vs prior close.`;

    return [bestLine, accrualLine, driftLine];
  }, [user, deltaUsd, deltaPct, clock]);

  const claimAllDisabled = useMemo(() => {
    if (!user) return true;
    if (claimingId) return true;
    return !user.investments.some((i) => (pendingByCompanyId[i.companyId] ?? 0) > 0.0000001);
  }, [user, pendingByCompanyId, claimingId]);

  const growXlmApprox = growBalanceToXlmDisplay(user?.growBalance ?? 0);

  const lastSyncLabel = useMemo(() => {
    void clock;
    if (!user?.lastBalanceSyncAt) return "Never synced on-chain";
    const m = Math.max(0, Math.floor((Date.now() - new Date(user.lastBalanceSyncAt).getTime()) / 60_000));
    if (m < 1) return "Last synced <1m ago";
    return `Last synced ${m}m ago`;
  }, [user?.lastBalanceSyncAt, clock]);

  const onClaimAll = async () => {
    setClaimingId("__all__");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimAll: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showClaimNotice("error", toFriendlyClaimError((data as { message?: unknown }).message));
        return;
      }
      showClaimNotice("success", "Rewards sent successfully to your wallet.");
      await reload();
    } finally {
      setClaimingId(null);
    }
  };

  const onClaimOne = async (companyId: string) => {
    setClaimingId(companyId);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showClaimNotice("error", toFriendlyClaimError((data as { message?: unknown }).message));
        return;
      }
      showClaimNotice("success", "Reward sent successfully to your wallet.");
      await reload();
    } finally {
      setClaimingId(null);
    }
  };

  const onSync = async () => {
    setSyncError("");
    setSyncBusy(true);
    try {
      const res = await fetch("/api/user/balance-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncError(typeof data.message === "string" ? data.message : "Sync failed.");
        return;
      }
      await reload();
    } finally {
      setSyncBusy(false);
    }
  };

  const onDisconnect = () => {
    disconnectSession();
    router.replace("/wallet");
  };

  const firstName = getTelegramUser()?.first_name?.trim() || "there";
  const hour = new Date().getHours();
  const activeStakeCount = user?.investments.filter((i) => i.tokensInvested > 0).length ?? 0;

  if (loadError) {
    return (
      <div className="px-4 py-8 text-center text-[var(--error)]" data-page-child>
        {loadError}
      </div>
    );
  }

  if (loading || !user || !market) {
    return <DashboardSkeleton />;
  }

  const upDay = deltaUsd >= 0;

  return (
    <div
      className="dash-root relative -mx-4 w-[calc(100%+2rem)] max-w-[calc(100%+2rem)] px-4 pb-28 pt-2"
      data-page-child
    >
      {claimNotice ? (
        <div className="pointer-events-none fixed left-1/2 top-3 z-40 w-[calc(100%-1rem)] max-w-[480px] -translate-x-1/2 px-1">
          <div
            className={`rounded-md border px-3 py-2 text-[12px] font-medium shadow-lg ${
              claimNotice.kind === "success"
                ? "border-[var(--dash-teal)] bg-[#052f2a] text-[#8ef3d5]"
                : "border-[var(--dash-red)] bg-[#3a1116] text-[#fca5a5]"
            }`}
          >
            {claimNotice.text}
          </div>
        </div>
      ) : null}
      <div className="dash-bg-image" aria-hidden />
      <div className="dash-inner space-y-3">
        <header
          className="mb-1 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--dash-border)] pb-3"
          data-page-child
        >
          <div>
            <p className="text-[15px] font-medium text-[var(--dash-text)]">
              {greetingHour(hour)}, {firstName}
            </p>
            <p className="dash-section-label mt-1">Portfolio terminal</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div
              className={`flex max-w-[220px] items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium ${
                user.isVerified
                  ? "border-[var(--dash-teal)] bg-[rgba(45,212,191,0.1)] text-[var(--dash-teal)]"
                  : "border-[rgba(248,113,113,0.45)] bg-[rgba(248,113,113,0.08)] text-[var(--dash-red)]"
              }`}
            >
              {user.isVerified ? (
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              <span className="dash-tabular truncate">{formatAddress(user.publicKey)}</span>
            </div>
            <div className="flex items-center gap-2">
              {!user.isVerified ? (
                <Link
                  href="/wallet"
                  className="text-[11px] font-semibold text-[var(--dash-teal)] underline-offset-2 hover:underline"
                >
                  Verify wallet
                </Link>
              ) : null}
              <button
                type="button"
                onClick={onDisconnect}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--dash-border)] px-2 py-1 text-[11px] font-semibold text-[var(--dash-muted)] hover:border-[var(--dash-red)] hover:text-[var(--dash-red)]"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                Disconnect
              </button>
            </div>
          </div>
        </header>

        <div data-page-child>
          <DashboardTickerStrip items={tickerItems} />
        </div>

        <section className="dash-tile dash-tile-wide" data-page-child>
          <p className="dash-section-label mb-1">Portfolio value</p>
          <div className="dash-tabular text-[34px] font-semibold leading-none tracking-tight text-[var(--dash-gold)]">
            $<AnimatedNumber value={portfolioUsd} decimals={2} className="text-[34px] font-semibold text-[var(--dash-gold)]" />
          </div>
          <div
            className={`mt-2 flex items-center gap-1.5 text-[13px] font-medium ${
              upDay ? "text-[var(--dash-green)]" : "text-[var(--dash-red)]"
            }`}
          >
            {upDay ? <ArrowUpRight className="h-4 w-4" aria-hidden /> : <ArrowDownRight className="h-4 w-4" aria-hidden />}
            <span className="dash-tabular">
              Today: {deltaUsd >= 0 ? "+" : ""}${deltaUsd.toFixed(2)} ({deltaPct >= 0 ? "+" : ""}
              {deltaPct.toFixed(2)}%)
            </span>
          </div>
          <PortfolioChartPanel
            range={chartRange}
            onRangeChange={setChartRange}
            data={chartRows}
            chartKey={`${chartRange}-${chartAnimKey}`}
          />
        </section>

        <div className="grid grid-cols-2 gap-2" data-page-child>
          <section className="dash-tile">
            <p className="dash-section-label mb-2">Available balance</p>
            <p className="dash-tabular text-[20px] font-semibold text-[var(--dash-text)]">
              {user.growBalance.toFixed(4)} <span className="text-[13px] text-[var(--dash-muted)]">{GROW_ASSET_CODE}</span>
            </p>
            <p className="dash-tabular mt-1 text-[12px] leading-snug text-[var(--dash-muted)]">
              ≈ {growXlmApprox} XLM <span className="text-[var(--dash-label)]">(1 {GROW_ASSET_CODE} ≈ {GROW_TO_XLM_RATE} XLM)</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--dash-border)] pt-3">
              <span className="text-[11px] text-[var(--dash-muted)]">{lastSyncLabel}</span>
              <button
                type="button"
                disabled={syncBusy}
                onClick={onSync}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--dash-teal)] bg-[rgba(45,212,191,0.1)] px-2 py-1 text-[11px] font-semibold text-[var(--dash-teal)] hover:bg-[rgba(45,212,191,0.18)] disabled:opacity-40"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncBusy ? "animate-spin" : ""}`} aria-hidden />
                Sync
              </button>
            </div>
            {syncError ? <p className="mt-2 text-[11px] text-[var(--dash-red)]">{syncError}</p> : null}
          </section>

          <section className="dash-tile">
            <p className="dash-section-label mb-2">Total staked</p>
            <p className="dash-tabular text-[20px] font-semibold text-[var(--dash-text)]">
              {user.totalInvested.toFixed(4)} <span className="text-[13px] text-[var(--dash-muted)]">{GROW_ASSET_CODE}</span>
            </p>
            <p className="mt-2 text-[12px] leading-snug text-[var(--dash-muted)]">
              Across {activeStakeCount} {activeStakeCount === 1 ? "company / asset" : "companies / assets"}.
            </p>
            <p className="dash-tabular mt-3 text-[11px] text-[var(--dash-label)]">
              Reward tokens accrue per configured batch interval.
            </p>
          </section>
        </div>

        <DashboardRewardsPanel
          investments={user.investments}
          pendingByCompanyId={pendingByCompanyId}
          claimingId={claimingId}
          onClaimOne={onClaimOne}
          onClaimAll={onClaimAll}
          claimAllDisabled={claimAllDisabled}
        />

        <DashboardInsights lines={insightLines} />

        <DashboardAllocationBar investments={user.investments} />

        <p className="text-center text-[10px] text-[var(--dash-label)]" data-page-child>
          Invest in what GROWS
        </p>
      </div>
    </div>
  );
}
