"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  showValid?: boolean;
  error?: boolean;
};

export function Input({ className = "", showValid, error, ...rest }: InputProps) {
  const border = error ? "sg-input-error" : showValid ? "sg-input-valid" : "";
  return (
    <div className="relative w-full">
      <input className={`sg-input pr-10 ${border} ${className}`.trim()} {...rest} />
      {showValid ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--success)]">
          <CheckCircle2 size={18} aria-hidden />
        </span>
      ) : null}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="sg-text-sm font-medium text-[var(--text-secondary)]">{children}</label>;
}
