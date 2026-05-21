"use client";

import { useEffect, useRef, useState } from "react";
import { Medal } from "lucide-react";

export type LeaderboardRowData = {
  rank: number;
  maskedName: string;
  photoUrl: string | null;
  growBalance: number;
  bonusPercent: number;
  isYou: boolean;
};

function rankMedalClass(rank: number): string {
  if (rank === 1) return "text-[#f5c542]";
  if (rank === 2) return "text-[#c0c5ce]";
  if (rank === 3) return "text-[#cd7f32]";
  return "text-[var(--text-muted)]";
}

function initialsFromMasked(name: string): string {
  const c = name.replace(/•/g, "").trim();
  if (!c) return "?";
  return c.slice(0, 2).toUpperCase();
}

export function LeaderboardRow({ entry }: { entry: LeaderboardRowData }) {
  const rowRef = useRef<HTMLLIElement>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(entry.photoUrl) && !photoFailed;

  useEffect(() => {
    if (!entry.isYou || entry.rank === 1) return;
    rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [entry.isYou, entry.rank]);

  const growLabel = entry.growBalance.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <li
      ref={rowRef}
      data-leaderboard-you={entry.isYou ? "true" : undefined}
      className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-3 ${
        entry.isYou
          ? "border-2 border-[var(--primary-green)] bg-[rgba(45,212,191,0.08)]"
          : "border border-[var(--border)] bg-[var(--dash-surface)]"
      }`}
    >
      <div className="flex w-8 shrink-0 flex-col items-center gap-0.5">
        {entry.rank <= 3 ? (
          <Medal size={18} className={rankMedalClass(entry.rank)} aria-hidden />
        ) : null}
        <span className="sg-text-xs font-semibold text-[var(--text-muted)] sg-tabular">#{entry.rank}</span>
      </div>

      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-full)] bg-[var(--border)]">
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.photoUrl!}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center sg-text-xs font-semibold text-[var(--text-secondary)]">
            {initialsFromMasked(entry.maskedName)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="sg-text-sm font-semibold text-[var(--text-primary)] truncate">{entry.maskedName}</p>
          {entry.isYou ? (
            <span className="rounded-[var(--radius-full)] bg-[var(--primary-green)] px-2 py-0.5 sg-text-xs font-semibold text-[#031208]">
              You
            </span>
          ) : null}
        </div>
        <p className="sg-text-xs text-[var(--text-muted)]">+{entry.bonusPercent}% reward bonus</p>
      </div>

      <div className="shrink-0 text-right">
        <p className="sg-text-sm font-semibold text-[var(--primary-green)] sg-tabular">{growLabel}</p>
        <p className="sg-text-xs text-[var(--text-muted)]">GROW</p>
      </div>
    </li>
  );
}
