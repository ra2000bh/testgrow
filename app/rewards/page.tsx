"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getTelegramId } from "@/lib/client";
import { companies } from "@/lib/companies";
import { computeBatchProgress } from "@/lib/rewards";
import { ErrorCard } from "@/components/ErrorCard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import {
  animateCountUp,
  animateListCards,
  animateLoadingPulse,
  killTweensOf,
  prefersReducedMotion,
} from "@/lib/animations";
import Link from "next/link";
import { Building2, CheckCircle2, Download } from "lucide-react";
import type { Investment } from "@/models/User";

type Row = Investment & {
  accumulatedReward: number;
  ratePerMinute?: number;
  rewardsEligible?: boolean;
  pausedReason?: string | null;
};

function InlineLoadingDot() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const tl = animateLoadingPulse(ref.current);
    return () => {
      tl?.kill();
    };
  }, []);
  return (
    <span
      ref={ref}
      className="sg-will-animate inline-block h-2 w-2 rounded-[var(--radius-full)] bg-[var(--primary-green)]"
      aria-hidden
    />
  );
}

function RewardFigure({ value, trackId }: { value: number; trackId: string }) {
  const elRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    killTweensOf(el);
    const tw = animateCountUp(el, value, { decimals: 2 });
    return () => {
      tw?.kill();
    };
  }, [value]);
  return (
    <span
      ref={elRef}
      data-reward-fig={trackId}
      className="sg-text-2xl font-semibold text-[var(--text-primary)] sg-tabular"
    >
      {value.toFixed(2)}
    </span>
  );
}

export default function RewardsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tick, setTick] = useState(0);
  const [claiming, setClaiming] = useState<"all" | string | null>(null);
  const [error, setError] = useState("");
  const [sentId, setSentId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const load = () => {
    fetch(`/api/user?telegramId=${encodeURIComponent(getTelegramId())}`)
      .then((r) => r.json())
      .then((data) => {
        const inv = (data.investments || []) as Row[];
        setRows(inv.filter((i) => i.tokensInvested > 0));
      });
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useLayoutEffect(() => {
    requestAnimationFrame(() => animateListCards(listRef.current));
  }, [rows]);

  const pendingForRow = (r: Row) => {
    if (r.rewardsEligible === false) return 0;
    const rate = r.ratePerMinute ?? 0;
    return Math.max(0, r.accumulatedReward + (rate * tick) / 60);
  };

  const totalPending = rows.reduce((s, r) => s + pendingForRow(r), 0);

  const runCountDown = (el: HTMLElement | null, from: number) => {
    if (!el) return;
    killTweensOf(el);
    if (prefersReducedMotion()) {
      el.textContent = "0.00";
      return;
    }
    const state = { n: from };
    gsap.to(state, {
      n: 0,
      duration: 0.8,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = state.n.toFixed(2);
      },
    });
  };

  const claim = async (companyId?: string) => {
    setError("");
    setClaiming(companyId ?? "all");
    const body = companyId
      ? { telegramId: getTelegramId(), companyId }
      : { telegramId: getTelegramId(), claimAll: true };
    const res = await fetch("/api/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setClaiming(null);
    if (!res.ok || !data.success) return setError(data.message || "Claim failed.");

    if (companyId) {
      const row = rows.find((r) => r.companyId === companyId);
      const amt = row ? pendingForRow(row) : 0;
      const el = document.querySelector<HTMLElement>(`[data-reward-fig="${companyId}"]`);
      runCountDown(el, amt);
      setSentId(companyId);
      window.setTimeout(() => {
        setSentId(null);
        load();
      }, 1400);
    } else {
      load();
    }
  };

  return (
    <section className="space-y-4 pb-28 pt-4">
      {rows.length > 0 ? (
        <p className="sg-text-xs text-[var(--text-muted)] px-0.5" data-page-child>
          Claim sends accrued reward tokens to your wallet. “Claim all” uses one Stellar transaction with multiple
          payments when you have several assets to receive.
        </p>
      ) : null}
      {rows.length === 0 ? (
        <Card className="space-y-3 border-[var(--border)]" data-page-child>
          <h2 className="sg-text-md font-semibold text-[var(--text-primary)]">No rewards yet</h2>
          <p className="sg-text-sm leading-[var(--text-sm-leading)] text-[var(--text-secondary)]">
            Allocate app GROW on the Companies tab first. Each company pays rewards in its own token (HOLAH,
            KITET, …) at the published rate per GROW staked. Accruals stack each interval — claim here to receive
            tokens in your Stellar wallet (trustlines required).
          </p>
          <Link href="/companies" className="block">
            <Button variant="primary" block type="button">
              <Building2 size={18} aria-hidden />
              <span>Go to Companies</span>
            </Button>
          </Link>
        </Card>
      ) : null}

      <div ref={listRef} className="space-y-3">
        {rows.map((inv) => {
          const company = companies.find((c) => c.id === inv.companyId);
          const meta = computeBatchProgress(inv);
          const pending = pendingForRow(inv);
          const canClaim = pending > 0 && inv.rewardsEligible !== false;
          const busy = claiming === inv.companyId;
          return (
            <Card key={inv.companyId} data-stagger-card className="space-y-3 border-[var(--border)]" data-page-child>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="sg-text-md font-semibold text-[var(--text-primary)]">{inv.companyName}</h2>
                <span className="sg-chip">{inv.assetCode}</span>
              </div>
              <p className="sg-text-sm text-[var(--text-secondary)]">
                {meta.batchesReady} batch{meta.batchesReady === 1 ? "" : "es"} accumulated
              </p>
              <RewardFigure value={pending} trackId={inv.companyId} />
              <p className="sg-text-sm text-[var(--text-muted)]">
                {company
                  ? `${company.dailyRate.toFixed(2)} ${inv.assetCode} per GROW staked · per accrual interval`
                  : null}
              </p>
              {inv.rewardsEligible === false && inv.pausedReason ? (
                <p className="sg-text-sm font-medium text-[var(--error)]">{inv.pausedReason}</p>
              ) : null}
              {sentId === inv.companyId ? (
                <div className="flex items-center gap-2 text-[var(--success)]">
                  <CheckCircle2 size={16} aria-hidden />
                  <span className="sg-text-sm font-medium">Sent to your wallet</span>
                </div>
              ) : (
                <Button
                  variant="primary"
                  block
                  disabled={!canClaim || Boolean(claiming)}
                  onClick={() => claim(inv.companyId)}
                >
                  {busy ? (
                    <>
                      <InlineLoadingDot />
                      <span>Sending…</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} aria-hidden />
                      <span>Claim</span>
                    </>
                  )}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {error ? <ErrorCard text={error} /> : null}

      <div
        className={`pointer-events-none fixed left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 px-4 transition-transform duration-300 ease-out ${
          totalPending > 0 ? "translate-y-0" : "translate-y-[140%]"
        }`}
        style={{
          bottom: "calc(64px + env(safe-area-inset-bottom, 0px) + 8px)",
        }}
      >
        <div className="pointer-events-auto">
          <Button
            variant="primary"
            block
            disabled={totalPending <= 0 || Boolean(claiming)}
            onClick={() => claim()}
          >
            {claiming === "all" ? (
              <>
                <InlineLoadingDot />
                <span>Sending…</span>
              </>
            ) : (
              <>
                <Download size={16} aria-hidden />
                <span>Claim all</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
