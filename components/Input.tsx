"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  showValid?: boolean;
  error?: boolean;
};

export function Input({ className = "", showValid, error, ...rest }: InputProps) {
  const shellBorder = error
    ? "border-[var(--error)]"
    : showValid
      ? "border-[var(--success)]"
      : "border-[var(--border)]";
  return (
    <div
      className={`flex h-12 w-full max-w-full items-center gap-2 rounded-[var(--radius-md)] border border-solid bg-[var(--white)] px-3 transition-[box-shadow,border-color] focus-within:border-[var(--primary-green)] focus-within:shadow-[var(--focus-ring)] ${shellBorder} ${className}`.trim()}
    >
      <input
        className="h-full min-w-0 flex-1 border-none bg-transparent p-0 text-[length:var(--text-base)] leading-[var(--text-base-leading)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        {...rest}
      />
      {showValid ? (
        <span className="pointer-events-none shrink-0 text-[var(--success)]">
          <CheckCircle2 size={18} aria-hidden />
        </span>
      ) : null}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="sg-text-sm font-medium text-[var(--text-secondary)]">{children}</label>;
}
