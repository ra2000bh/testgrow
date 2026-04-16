"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { companies, companyBrandGradient } from "@/lib/companies";
import { companyInitials } from "@/lib/company-display";
import { getTelegramId } from "@/lib/client";
import { ErrorCard } from "@/components/ErrorCard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { animateInvestSheet, animateListCards } from "@/lib/animations";
import { MinusCircle, TrendingUp } from "lucide-react";

type UserState = {
  growBalance: number;
  investments: Array<{ companyId: string; tokensInvested: number }>;
};

export default function CompaniesPage() {
  const [user, setUser] = useState<UserState | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [sliderVal, setSliderVal] = useState(0);
  const [error, setError] = useState("");
  const [sheetError, setSheetError] = useState("");
  const [investSubmitting, setInvestSubmitting] = useState(false);
  const [liveMaxGrow, setLiveMaxGrow] = useState<number | null>(null);
  const [balanceRefreshing, setBalanceRefreshing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const reload = () => {
    fetch(`/api/user?telegramId=${encodeURIComponent(getTelegramId())}`)
      .then((r) => r.json())
      .then(setUser);
  };

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const highlight = params.get("highlight");
    if (!highlight) return;
    const t = window.setTimeout(() => {
      document.getElementById(`company-${highlight}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
    return () => window.clearTimeout(t);
  }, [user]);

  useLayoutEffect(() => {
    const s = sheetRef.current;
    const b = backdropRef.current;
    if (!s || !b) return;
    gsap.set(s, { yPercent: 100 });
    gsap.set(b, { opacity: 0 });
    b.style.pointerEvents = "none";
  }, []);

  useLayoutEffect(() => {
    if (!user) return;
    requestAnimationFrame(() => animateListCards(listRef.current));
  }, [user]);

  const open = Boolean(selectedCompany);
  useLayoutEffect(() => {
    animateInvestSheet(sheetRef.current, backdropRef.current, open);
  }, [open]);

  const company = companies.find((c) => c.id === selectedCompany);
  const maxGrow = liveMaxGrow ?? user?.growBalance ?? 0;

  const syncSlider = (v: number) => {
    const x = Math.max(0, Math.min(maxGrow, v));
    setSliderVal(x);
    setAmount(x);
  };

  const invest = async () => {
    setSheetError("");
    if (!selectedCompany || !user) return;
    setInvestSubmitting(true);
    try {
      const res = await fetch("/api/invest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: getTelegramId(), companyId: selectedCompany, amount }),
      });
      let data: { success?: boolean; message?: string } = {};
      try {
        data = await res.json();
      } catch {
        setSheetError("Could not read server response.");
        return;
      }
      if (!res.ok || !data.success) {
        setSheetError(data.message || "Investment failed.");
        return;
      }
      setSelectedCompany(null);
      setAmount(0);
      setSliderVal(0);
      reload();
    } catch (e) {
      setSheetError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setInvestSubmitting(false);
    }
  };

  const refreshInvestableBalance = async () => {
    if (!user) return;
    setBalanceRefreshing(true);
    try {
      const res = await fetch("/api/user/grow-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: getTelegramId() }),
      });
      const data = (await res.json()) as { success?: boolean; growBalance?: number; message?: string };
      if (!res.ok || !data.success || typeof data.growBalance !== "number") {
        setSheetError(data.message || "Could not refresh balance from Stellar.");
        return;
      }
      setLiveMaxGrow(data.growBalance);
      const clamped = Math.max(0, Math.min(data.growBalance, amount));
      setSliderVal(clamped);
      setAmount(clamped);
    } catch {
      setSheetError("Could not refresh balance from Stellar.");
    } finally {
      setBalanceRefreshing(false);
    }
  };

  const withdrawStake = async (companyId: string, companyName: string) => {
    setError("");
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Remove your entire stake in ${companyName}? Principal and any accrued rewards return to your GROW balance.`,
      )
    ) {
      return;
    }
    const res = await fetch("/api/invest/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: getTelegramId(), companyId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return setError(data.message || "Could not remove stake.");
    reload();
  };

  const dailyPreview = company ? amount * company.dailyRate : 0;

  const actionBtn =
    "w-full !min-h-[40px] justify-center gap-1 px-3 py-2 text-[12px] leading-tight font-semibold [&>svg]:h-4 [&>svg]:w-4 [&>svg]:min-h-4 [&>svg]:min-w-4 [&>svg]:shrink-0";

  return (
    <section className="relative pb-4 pt-4">
      <div ref={listRef} className="space-y-3">
        {companies.map((c) => {
          const current = user?.investments.find((inv) => inv.companyId === c.id)?.tokensInvested || 0;
          return (
            <Card
              key={c.id}
              id={`company-${c.id}`}
              data-stagger-card
              className="space-y-4 border-[var(--border)]"
              data-page-child
            >
              <div className="flex gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] text-[12px] font-semibold text-white"
                  style={{ background: companyBrandGradient(c) }}
                  aria-hidden
                >
                  {companyInitials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="sg-text-md font-bold text-[var(--text-primary)]">{c.name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="sg-chip">{c.country}</span>
                    <span className="sg-chip">{c.industry}</span>
                  </div>
                  <p className="sg-text-sm mt-2 font-semibold leading-[var(--text-sm-leading)] text-[var(--text-primary)]">
                    +{c.dailyRate.toFixed(2)} {c.assetCode} per GROW · daily
                  </p>
                </div>
              </div>

              <p className="sg-text-sm text-[var(--text-secondary)]">
                GROW staked · {current.toFixed(2)} · earns {c.assetCode} rewards
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className={actionBtn}
                  onClick={() => {
                    setSheetError("");
                    setSelectedCompany(c.id);
                    const cap = Math.max(0, user?.growBalance ?? 0);
                    const start = cap > 0 ? cap / 2 : 0;
                    setLiveMaxGrow(null);
                    setSliderVal(start);
                    setAmount(start);
                    void refreshInvestableBalance();
                  }}
                  disabled={!user || maxGrow <= 0}
                >
                  <TrendingUp aria-hidden />
                  <span>Invest</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  className={actionBtn}
                  disabled={!user || current <= 0}
                  onClick={() => withdrawStake(c.id, c.name)}
                >
                  <MinusCircle aria-hidden />
                  <span>Remove stake</span>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorCard text={error} />
        </div>
      ) : null}

      <div
        ref={backdropRef}
        className="fixed inset-0 z-50 opacity-0"
        style={{ background: "var(--overlay-scrim)" }}
        aria-hidden
        onClick={() => setSelectedCompany(null)}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[51] flex justify-center">
        <div
          ref={sheetRef}
          className="pointer-events-auto w-full max-w-[480px] max-h-[calc(100vh-16px)] overflow-y-auto rounded-t-[var(--radius-xl)] border border-[var(--border)] border-b-0 bg-[var(--dash-surface)] px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
          role="dialog"
          aria-modal="true"
          aria-label="Invest"
        >
          {company ? (
            <div className="space-y-4">
              <p className="sg-text-md font-semibold text-[var(--text-primary)]">{company.name}</p>
              <p className="sg-text-sm text-[var(--text-secondary)]">
                Available GROW · {maxGrow.toFixed(2)}
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void refreshInvestableBalance()}
                  disabled={balanceRefreshing || investSubmitting}
                  className="sg-text-xs text-[var(--text-muted)] disabled:opacity-50"
                >
                  {balanceRefreshing ? "Refreshing balance…" : "Refresh from Stellar"}
                </button>
              </div>
              <div>
                <label className="sr-only" htmlFor="invest-range">
                  Amount slider
                </label>
                <input
                  id="invest-range"
                  type="range"
                  min={0}
                  max={maxGrow || 0}
                  step="0.01"
                  value={sliderVal}
                  onChange={(e) => syncSlider(Number(e.target.value))}
                  className="w-full accent-[var(--primary-green)]"
                  disabled={maxGrow <= 0 || balanceRefreshing}
                />
              </div>
              <div>
                <label className="sr-only" htmlFor="invest-num">
                  Amount
                </label>
                <input
                  id="invest-num"
                  type="number"
                  min={0}
                  max={maxGrow}
                  step="0.01"
                  value={Number.isFinite(amount) ? amount : 0}
                  onChange={(e) => syncSlider(Number(e.target.value))}
                  className="sg-input"
                />
              </div>
              <p className="sg-text-sm leading-[var(--text-sm-leading)] text-[var(--text-secondary)]">
                You commit app GROW to this stake. Rewards accrue as{" "}
                <span className="font-semibold text-[var(--text-primary)]">{company.assetCode}</span> at{" "}
                <span className="font-semibold sg-tabular">{company.dailyRate.toFixed(2)}</span> per 1 GROW staked per
                accrual period. Claim from <span className="font-medium">Rewards</span> — payouts are sent from the
                publisher wallet (trustline required).
              </p>
              <p className="sg-text-xs text-[var(--text-muted)]">
                At this amount: ~{dailyPreview.toFixed(4)} {company.assetCode} per accrual interval while staked.
              </p>
              {sheetError ? (
                <div className="rounded-[var(--radius-md)] border border-[var(--error)] bg-[rgba(248,113,113,0.1)] px-3 py-2">
                  <p className="sg-text-sm text-[var(--error)]">{sheetError}</p>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setSelectedCompany(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-[2]"
                  onClick={invest}
                  disabled={amount <= 0 || investSubmitting || balanceRefreshing}
                >
                  {investSubmitting ? "Saving…" : "Confirm"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
