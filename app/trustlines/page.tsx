"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { companies } from "@/lib/companies";
import { getTelegramId } from "@/lib/client";
import { AnimatedProgress } from "@/components/AnimatedProgress";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingPulse } from "@/components/LoadingPulse";
import { animateListCards } from "@/lib/animations";
import { Link2, ShieldCheck } from "lucide-react";

type TRow = { companyId: string; confirmed: boolean };

export default function TrustlinesPage() {
  const [trustlines, setTrustlines] = useState<TRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const sync = useCallback(async () => {
    setError("");
    const res = await fetch(`/api/check-trustlines?telegramId=${encodeURIComponent(getTelegramId())}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Could not check trustlines.");
      return;
    }
    setTrustlines(data.trustlines || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await sync();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sync]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      setRefreshing(true);
      sync().finally(() => setRefreshing(false));
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sync]);

  const activeCount = useMemo(() => {
    const map = Object.fromEntries(trustlines.map((t) => [t.companyId, t.confirmed]));
    return companies.filter((c) => map[c.id]).length;
  }, [trustlines]);

  const progressPct = (activeCount / companies.length) * 100;

  useLayoutEffect(() => {
    if (loading) return;
    requestAnimationFrame(() => animateListCards(listRef.current));
  }, [loading, trustlines]);

  if (loading) {
    return <LoadingPulse label="Checking trustlines on Stellar…" />;
  }

  return (
    <section className="space-y-4 pb-4">
      <Card className="space-y-3 border-[var(--border)]" data-page-child>
        <p className="sg-text-sm font-medium text-[var(--text-secondary)]">
          {activeCount} of {companies.length} trustlines active
        </p>
        <AnimatedProgress percent={progressPct} />
      </Card>

      {refreshing ? <LoadingPulse label="Rechecking trustlines…" /> : null}

      {error ? <ErrorCard text={error} onRetry={() => sync()} /> : null}

      <div ref={listRef} className="space-y-3">
        {companies.map((company) => {
          const row = trustlines.find((t) => t.companyId === company.id);
          const active = Boolean(row?.confirmed);
          const lobstr = `https://lobstr.co/assets/${company.assetCode}:${company.issuer}`;
          return (
            <Card key={company.id} data-stagger-card className="space-y-3 border-[var(--border)]" data-page-child>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="sg-text-md font-semibold text-[var(--text-primary)]">{company.name}</h2>
                <span className="sg-chip">{company.assetCode}</span>
              </div>
              <div className="flex items-center gap-2">
                {active ? (
                  <>
                    <ShieldCheck size={14} className="text-[var(--success)]" aria-hidden />
                    <span className="sg-text-sm font-medium text-[var(--success)]">Active</span>
                  </>
                ) : (
                  <>
                    <Link2 size={14} className="text-[var(--text-muted)]" aria-hidden />
                    <span className="sg-text-sm font-medium text-[var(--text-muted)]">Not added</span>
                  </>
                )}
              </div>
              {!active ? (
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => window.open(lobstr, "_blank", "noopener,noreferrer")}
                >
                  <Link2 size={16} aria-hidden />
                  <span>Add in Lobstr</span>
                </Button>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
