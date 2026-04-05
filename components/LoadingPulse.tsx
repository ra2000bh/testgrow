"use client";

import { useEffect, useRef } from "react";
import { animateLoadingPulse, killTweensOf } from "@/lib/animations";
import gsap from "gsap";

export function LoadingPulse({ label }: { label: string }) {
  const dotRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const tl = animateLoadingPulse(dot);
    return () => {
      if (dot) {
        killTweensOf(dot);
        gsap.set(dot, { clearProps: "scale" });
      }
      tl?.kill();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <span
        ref={dotRef}
        className="sg-will-animate block h-2.5 w-2.5 rounded-[var(--radius-full)] bg-[var(--primary-green)]"
        aria-hidden
      />
      <p className="sg-text-sm text-center text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}
