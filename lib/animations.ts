import gsap from "gsap";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function animatePageEnter(
  root: HTMLElement | null,
  childrenSelector = "[data-page-child]",
): gsap.core.Tween | gsap.core.Timeline | null {
  if (!root || prefersReducedMotion()) return null;
  const children = root.querySelectorAll(childrenSelector);
  gsap.set(root, { opacity: 0, y: 16, willChange: "transform, opacity" });
  const tl = gsap.timeline();
  tl.to(root, { opacity: 1, y: 0, duration: 0.26, ease: "power2.out" });
  if (children.length) {
    tl.from(
      children,
      { opacity: 0, y: 12, duration: 0.22, ease: "power2.out", stagger: 0.06 },
      0.04,
    );
  }
  tl.eventCallback("onComplete", () => {
    gsap.set(root, { clearProps: "willChange" });
  });
  return tl;
}

export function animatePageExit(root: HTMLElement | null): gsap.core.Tween | null {
  if (!root || prefersReducedMotion()) return null;
  return gsap.to(root, {
    opacity: 0,
    y: -12,
    duration: 0.18,
    ease: "power2.in",
    onComplete: () => {
      gsap.set(root, { clearProps: "willChange" });
    },
  });
}

export function createButtonPressHandlers(el: HTMLElement | null): {
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
} {
  if (!el || prefersReducedMotion()) {
    return { onMouseDown: () => {}, onMouseUp: () => {}, onMouseLeave: () => {} };
  }
  return {
    onMouseDown: () => {
      gsap.killTweensOf(el);
      gsap.to(el, { scale: 0.97, duration: 0.08, ease: "none" });
    },
    onMouseUp: () => {
      gsap.to(el, { scale: 1, duration: 0.12, ease: "power2.out" });
    },
    onMouseLeave: () => {
      gsap.to(el, { scale: 1, duration: 0.12, ease: "power2.out" });
    },
  };
}

export function animateCountUp(
  el: HTMLElement | null,
  endValue: number,
  options?: { duration?: number; decimals?: number; onUpdate?: (n: number) => void },
): gsap.core.Tween | null {
  if (!el) return null;
  const duration = options?.duration ?? 0.8;
  const decimals = options?.decimals ?? 2;
  if (prefersReducedMotion()) {
    const text = endValue.toFixed(decimals);
    el.textContent = text;
    options?.onUpdate?.(endValue);
    return null;
  }
  const state = { value: 0 };
  return gsap.to(state, {
    value: endValue,
    duration,
    ease: "power2.out",
    onUpdate: () => {
      const n = state.value;
      el.textContent = n.toFixed(decimals);
      options?.onUpdate?.(n);
    },
  });
}

export function animateProgressBar(
  fillEl: HTMLElement | null,
  percent: number,
): gsap.core.Tween | null {
  if (!fillEl) return null;
  const clamped = Math.max(0, Math.min(100, percent));
  if (prefersReducedMotion()) {
    gsap.set(fillEl, { width: `${clamped}%` });
    return null;
  }
  gsap.set(fillEl, { width: "0%" });
  return gsap.to(fillEl, {
    width: `${clamped}%`,
    duration: 1.2,
    ease: "power3.out",
  });
}

export function animateListCards(
  container: HTMLElement | null,
  cardSelector = "[data-stagger-card]",
): gsap.core.Tween | gsap.core.Timeline | null {
  if (!container || prefersReducedMotion()) return null;
  const cards = container.querySelectorAll(cardSelector);
  if (!cards.length) return null;
  return gsap.fromTo(
    cards,
    { opacity: 0, y: 20, willChange: "transform, opacity" },
    {
      opacity: 1,
      y: 0,
      duration: 0.3,
      stagger: 0.08,
      ease: "power2.out",
      onComplete: () => {
        gsap.set(cards, { clearProps: "willChange" });
      },
    },
  );
}

export function animateLoadingPulse(dot: HTMLElement | null): gsap.core.Timeline | null {
  if (!dot || prefersReducedMotion()) return null;
  const tl = gsap.timeline({ repeat: -1 });
  tl.to(dot, { scale: 1.4, duration: 0.45, ease: "power1.inOut" }).to(dot, {
    scale: 1,
    duration: 0.45,
    ease: "power1.inOut",
  });
  tl.duration(0.9);
  return tl;
}

export function animateTabIconActive(icon: HTMLElement | null): gsap.core.Timeline | null {
  if (!icon || prefersReducedMotion()) return null;
  return gsap
    .timeline()
    .to(icon, { scale: 1.15, duration: 0.1, ease: "power2.out" })
    .to(icon, { scale: 1, duration: 0.1, ease: "power2.in" });
}

export function animateInvestSheet(
  sheet: HTMLElement | null,
  backdrop: HTMLElement | null,
  open: boolean,
): gsap.core.Timeline | null {
  if (!sheet || !backdrop) return null;
  if (prefersReducedMotion()) {
    gsap.set(backdrop, { opacity: open ? 1 : 0 });
    backdrop.style.pointerEvents = open ? "auto" : "none";
    gsap.set(sheet, { yPercent: open ? 0 : 100 });
    return null;
  }

  gsap.killTweensOf([sheet, backdrop]);

  if (open) {
    backdrop.style.pointerEvents = "auto";
    gsap.set(sheet, { yPercent: 100 });
    return gsap
      .timeline()
      .to(backdrop, { opacity: 1, duration: 0.2, ease: "none" })
      .to(sheet, { yPercent: 0, duration: 0.3, ease: "power2.out" }, 0);
  }

  const y = Number(gsap.getProperty(sheet, "yPercent"));
  if (Number.isFinite(y) && y >= 99) {
    gsap.set(backdrop, { opacity: 0 });
    backdrop.style.pointerEvents = "none";
    return null;
  }

  return gsap
    .timeline({
      onComplete: () => {
        backdrop.style.pointerEvents = "none";
      },
    })
    .to(sheet, { yPercent: 100, duration: 0.25, ease: "power2.in" })
    .to(backdrop, { opacity: 0, duration: 0.2, ease: "none" }, 0);
}

export function animateVerificationCelebration(
  icon: HTMLElement | null,
  ripple: HTMLElement | null,
): gsap.core.Timeline | null {
  if (!icon) return null;
  if (prefersReducedMotion()) {
    gsap.set(icon, { scale: 1 });
    return null;
  }
  const tl = gsap.timeline();
  tl.fromTo(icon, { scale: 0.5 }, { scale: 1.1, duration: 0.35, ease: "power2.out" })
    .to(icon, { scale: 1, duration: 0.2, ease: "power2.inOut" });
  if (ripple) {
    tl.fromTo(
      ripple,
      { scale: 0, opacity: 0.6 },
      { scale: 2.5, opacity: 0, duration: 0.8, ease: "power2.out" },
      0,
    );
  }
  return tl;
}

export function animateStickyBarUp(bar: HTMLElement | null, visible: boolean): gsap.core.Tween | null {
  if (!bar) return null;
  if (prefersReducedMotion()) {
    gsap.set(bar, { y: visible ? 0 : 80 });
    return null;
  }
  return gsap.to(bar, {
    y: visible ? 0 : 80,
    duration: 0.35,
    ease: "power2.out",
  });
}

export function killTweensOf(target: gsap.TweenTarget): void {
  gsap.killTweensOf(target);
}
