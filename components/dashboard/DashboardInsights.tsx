"use client";

import { useEffect, useState } from "react";

export function DashboardInsights({ lines }: { lines: string[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (lines.length === 0) return;
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % lines.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [lines.length]);

  const text = lines[idx] ?? "";

  return (
    <div className="dash-tile dash-tile-wide min-h-[52px]" data-page-child aria-live="polite">
      <p className="dash-section-label mb-2">Insights</p>
      <p
        key={idx}
        className="dash-insight-line text-[14px] leading-snug text-[var(--dash-text)]"
      >
        {text}
      </p>
    </div>
  );
}
