"use client";

import { useEffect, useRef } from "react";
import { animateCountUp, killTweensOf } from "@/lib/animations";

export function AnimatedNumber({
  value,
  decimals = 2,
  className = "",
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tw = animateCountUp(el, value, { decimals });
    return () => {
      if (el) killTweensOf(el);
      tw?.kill();
    };
  }, [value, decimals]);

  return (
    <span ref={ref} className={`sg-tabular ${className}`.trim()}>
      {value.toFixed(decimals)}
    </span>
  );
}
