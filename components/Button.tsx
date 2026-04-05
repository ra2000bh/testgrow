"use client";

import {
  forwardRef,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createButtonPressHandlers } from "@/lib/animations";

function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (node: T | null) => {
    refs.forEach((r) => {
      if (typeof r === "function") r(node);
      else if (r) (r as React.MutableRefObject<T | null>).current = node;
    });
  };
}

type Variant = "primary" | "secondary" | "ghost" | "destructive";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  block?: boolean;
  size?: "md" | "sm";
  children: ReactNode;
};

const variantClass: Record<Variant, string> = {
  primary: "sg-btn-primary",
  secondary: "sg-btn-secondary",
  ghost: "sg-btn-ghost",
  destructive: "sg-btn-destructive",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", block, size = "md", className = "", disabled, children, ...rest },
  ref,
) {
  const innerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el || disabled) return;
    const h = createButtonPressHandlers(el);
    el.addEventListener("mousedown", h.onMouseDown);
    el.addEventListener("mouseup", h.onMouseUp);
    el.addEventListener("mouseleave", h.onMouseLeave);
    return () => {
      el.removeEventListener("mousedown", h.onMouseDown);
      el.removeEventListener("mouseup", h.onMouseUp);
      el.removeEventListener("mouseleave", h.onMouseLeave);
    };
  }, [disabled]);

  const cls = [
    "sg-btn",
    "sg-will-animate",
    variantClass[variant],
    size === "sm" ? "sg-btn-sm" : "",
    block ? "sg-btn-block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={mergeRefs(ref, innerRef)}
      type="button"
      className={cls}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
});
