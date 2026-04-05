"use client";

import { useEffect, useRef } from "react";
import { animateProgressBar, killTweensOf } from "@/lib/animations";

export function AnimatedProgress({ percent }: { percent: number }) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;
    const tw = animateProgressBar(fill, percent);
    return () => {
      killTweensOf(fill);
      tw?.kill();
    };
  }, [percent]);

  return (
    <div
      className="h-2 w-full overflow-hidden rounded-[var(--radius-sm)]"
      style={{ background: "var(--border)" }}
    >
      <div
        ref={fillRef}
        className="sg-will-animate h-full rounded-[var(--radius-sm)]"
        style={{ width: "0%", background: "var(--accent-green)" }}
      />
    </div>
  );
}
