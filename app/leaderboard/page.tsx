"use client";

import { useEffect, useRef, useState } from "react";
import { PageWrapper } from "@/components/PageWrapper";
import { Card } from "@/components/Card";
import { LeaderboardRow, type LeaderboardRowData } from "@/components/LeaderboardRow";
import { syncTelegramProfile } from "@/lib/client";
import { animateListCards } from "@/lib/animations";
import { Trophy } from "lucide-react";

type LeaderboardPayload = {
  success?: boolean;
  entries?: LeaderboardRowData[];
  viewer?: { rank: number | null; bonusPercent: number; growBalance: number };
  refreshedAt?: string;
  message?: string;
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardRowData[]>([]);
  const [viewer, setViewer] = useState<LeaderboardPayload["viewer"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      await syncTelegramProfile();
      const res = await fetch("/api/leaderboard");
      const data = (await res.json()) as LeaderboardPayload;
      if (!res.ok || !data.success) {
        setError(data.message || "Could not load leaderboard.");
        setEntries([]);
        return;
      }
      setEntries(data.entries ?? []);
      setViewer(data.viewer ?? null);
    } catch {
      setError("Network error while loading leaderboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!loading && entries.length > 0) {
      requestAnimationFrame(() => animateListCards(listRef.current));
    }
  }, [loading, entries.length]);

  const onBoard = viewer?.rank != null && viewer.rank >= 1 && viewer.rank <= 10;

  return (
    <PageWrapper>
      <section className="space-y-4 pb-28 pt-4">
        <div className="flex items-center gap-2 px-0.5" data-page-child>
          <Trophy className="h-6 w-6 text-[#f5c542]" aria-hidden />
          <div>
            <h1 className="sg-text-lg font-semibold text-[var(--text-primary)]">Leaderboard</h1>
            <p className="sg-text-xs text-[var(--text-muted)]">Top 10 GROW holders · rewards bonus by rank</p>
          </div>
        </div>

        <Card className="space-y-2 border-[var(--border)]" data-page-child>
          <p className="sg-text-xs text-[var(--text-secondary)] leading-relaxed">
            #1 +50% · #2 +40% · #3 +30% · #4–10 +10% on invested GROW rewards (stacks with SEED). Names are
            masked for privacy.
          </p>
        </Card>

        {loading ? (
          <Card className="border-[var(--border)] py-8 text-center" data-page-child>
            <p className="sg-text-sm text-[var(--text-muted)]">Loading leaderboard…</p>
          </Card>
        ) : null}

        {error && !loading ? (
          <Card className="border-[var(--error)] py-6 text-center" data-page-child>
            <p className="sg-text-sm text-[var(--error)]">{error}</p>
          </Card>
        ) : null}

        {!loading && !error ? (
          <>
            {entries.length === 0 ? (
              <Card className="border-[var(--border)] py-8 text-center" data-page-child>
                <p className="sg-text-sm text-[var(--text-muted)]">No ranked holders yet.</p>
              </Card>
            ) : (
              <ul ref={listRef} className="space-y-2" data-page-child>
                {entries.map((entry) => (
                  <LeaderboardRow key={entry.rank} entry={entry} />
                ))}
              </ul>
            )}

            {!onBoard && viewer ? (
              <p className="sg-text-sm text-[var(--text-muted)] px-0.5" data-page-child>
                Hold more GROW to reach the top 10. Your balance:{" "}
                <span className="sg-tabular font-medium text-[var(--text-secondary)]">
                  {viewer.growBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>{" "}
                GROW
              </p>
            ) : null}

            {onBoard && viewer ? (
              <p className="sg-text-sm text-[var(--primary-green)] px-0.5 font-medium" data-page-child>
                You are #{viewer.rank} — +{viewer.bonusPercent}% reward bonus active
              </p>
            ) : null}
          </>
        ) : null}
      </section>
    </PageWrapper>
  );
}
