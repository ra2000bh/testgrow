"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { animatePageEnter } from "@/lib/animations";

export function PageWrapper({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const tl = animatePageEnter(ref.current, "[data-page-child]");
    return () => {
      tl?.kill();
    };
  }, []);

  return (
    <div ref={ref} className="flex min-h-0 flex-1 flex-col">
      {children}
    </div>
  );
}
