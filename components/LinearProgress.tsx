"use client";

/** Smooth width updates without resetting to 0 — use for live timers (dashboard batch bar). */
export function LinearProgress({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-[var(--radius-sm)]"
      style={{ background: "var(--border)" }}
    >
      <div
        className="h-full rounded-[var(--radius-sm)] will-change-[width]"
        style={{
          width: `${clamped}%`,
          background: "var(--accent-green)",
          transition: "width 0.95s linear",
        }}
      />
    </div>
  );
}
