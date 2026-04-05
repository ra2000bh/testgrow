"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { companies } from "@/lib/companies";
import { companyInitials, countryFlagEmoji } from "@/lib/company-display";
import { getTelegramId } from "@/lib/client";
import { ErrorCard } from "@/components/ErrorCard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { animateInvestSheet, animateListCards } from "@/lib/animations";
import { Link2, TrendingUp } from "lucide-react";

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
  const maxGrow = user?.growBalance ?? 0;


  const syncSlider = (v: number) => {
    const x = Math.max(0, Math.min(maxGrow, v));
    setSliderVal(x);
    setAmount(x);
  };

  const invest = async () => {
    if (!selectedCompany || !user) return;
    const res = await fetch("/api/invest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: getTelegramId(), companyId: selectedCompany, amount }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return setError(data.message || "Investment failed");
    setSelectedCompany(null);
    setAmount(0);
    reload();
  };

  const dailyPreview = company ? amount * company.dailyRate : 0;

  return (
    <section className="relative pb-4">
      <div ref={listRef} className="space-y-3">
        {companies.map((c) => {
          const current = user?.investments.find((inv) => inv.companyId === c.id)?.tokensInvested || 0;
          const lobstr = `https://lobstr.co/assets/${c.assetCode}:${c.issuer}`;
          return (
            <Card key={c.id} data-stagger-card className="space-y-3 border-[var(--border)]" data-page-child>
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] sg-text-sm font-semibold text-[var(--white)]"
                  style={{ background: "var(--primary-green)" }}
                  aria-hidden
                >
                  {companyInitials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="sg-text-md font-semibold text-[var(--text-primary)]">{c.name}</h2>
                    <span className="text-base" aria-hidden>
                      {countryFlagEmoji(c.country)}
                    </span>
                    <span className="sg-chip">{c.industry}</span>
                  </div>
                  <p className="sg-text-lg mt-2 font-semibold text-[var(--text-primary)]">
                    +{c.dailyRate.toFixed(2)} {c.assetCode} per GROW · daily
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
                <p className="sg-text-sm text-[var(--text-secondary)]">
                  Your investment · {current.toFixed(2)} GROW
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedCompany(c.id);
                      const cap = Math.max(0, user?.growBalance ?? 0);
                      const start = cap > 0 ? cap / 2 : 0;
                      setSliderVal(start);
                      setAmount(start);
                    }}
                    disabled={!user || maxGrow <= 0}
                  >
                    <TrendingUp size={16} aria-hidden />
                    <span>Invest</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => window.open(lobstr, "_blank", "noopener,noreferrer")}
                  >
                    <Link2 size={16} aria-hidden />
                    <span>Trustline</span>
                  </Button>
                </div>
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
          className="pointer-events-auto w-full max-w-[480px] rounded-t-[var(--radius-xl)] border border-[var(--border)] border-b-0 bg-[var(--background-secondary)] px-4 pb-8 pt-4"
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
                  disabled={maxGrow <= 0}
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
              <p className="sg-text-sm text-[var(--text-secondary)]">
                You will earn{" "}
                <span className="font-semibold text-[var(--text-primary)] sg-tabular">
                  {dailyPreview.toFixed(4)}
                </span>{" "}
                {company.assetCode} daily
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={() => setSelectedCompany(null)}>
                  Cancel
                </Button>
                <Button variant="primary" className="flex-[2]" onClick={invest} disabled={amount <= 0}>
                  Confirm
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
