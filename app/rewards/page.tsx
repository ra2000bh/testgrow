"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { companies } from "@/lib/companies";
import { computeBatchProgress, formatRewardEta } from "@/lib/rewards";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import {
  animateCountUp,
  animateListCards,
  animateLoadingPulse,
  killTweensOf,
} from "@/lib/animations";
import Link from "next/link";
import { Building2, Download } from "lucide-react";
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
  const [claiming, setClaiming] = useState<"all" | string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [clock, setClock] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (kind: "success" | "error", text: string) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ kind, text });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  const toFriendlyClaimError = (message: unknown) => {
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
  };

  const load = () => {
    fetch("/api/user")
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
    const id = window.setInterval(() => setClock(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useLayoutEffect(() => {
    requestAnimationFrame(() => animateListCards(listRef.current));
  }, [rows]);

  const pendingForRow = (r: Row) => {
    void clock;
    if (r.rewardsEligible === false) return 0;
    const computed = computeBatchProgress(r).totalPending;
    return Math.max(0, Math.max(r.accumulatedReward, computed));
  };

  const totalPending = rows.reduce((s, r) => s + pendingForRow(r), 0);

  const claim = async (companyId?: string) => {
    setClaiming(companyId ?? "all");
    const body = companyId ? { companyId } : { claimAll: true };
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      setClaiming(null);
      if (!res.ok || !data.success) {
        showToast("error", toFriendlyClaimError((data as { message?: unknown }).message));
        return;
      }
      showToast("success", companyId ? "Reward sent to your wallet." : "All available rewards were sent.");
      load();
    } catch {
      setClaiming(null);
      showToast("error", "Network error while claiming rewards.");
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

      {toast ? (
        <div className="fixed left-1/2 top-3 z-40 w-[calc(100%-1.5rem)] max-w-[480px] -translate-x-1/2 px-2">
          <div
            className={`rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium shadow-lg ${
              toast.kind === "success"
                ? "border-[var(--success)] bg-[#052f2a] text-[#8ef3d5]"
                : "border-[var(--error)] bg-[#3a1116] text-[#fca5a5]"
            }`}
          >
            {toast.text}
          </div>
        </div>
      ) : null}

      <div ref={listRef} className="space-y-3">
        {rows.map((inv) => {
          const company = companies.find((c) => c.id === inv.companyId);
          const meta = computeBatchProgress(inv);
          const pending = pendingForRow(inv);
          const canClaim = pending > 0 && inv.rewardsEligible !== false && meta.batchesReady > 0;
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
              {meta.batchesReady === 0 && inv.rewardsEligible !== false ? (
                <p className="sg-text-sm text-[var(--text-muted)]">
                  Next claim window in ~{formatRewardEta(meta.msUntilNextBatch)}.
                </p>
              ) : null}
              {inv.rewardsEligible === false && inv.pausedReason ? (
                <p className="sg-text-sm font-medium text-[var(--error)]">{inv.pausedReason}</p>
              ) : null}
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
            </Card>
          );
        })}
      </div>

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
            disabled={totalPending <= 0 || rows.every((r) => computeBatchProgress(r).batchesReady === 0) || Boolean(claiming)}
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
