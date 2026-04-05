"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/Button";

export function ErrorCard({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div
      className="sg-card flex gap-3 border-[var(--error)]"
      style={{ background: "var(--background-secondary)" }}
    >
      <AlertCircle className="mt-0.5 shrink-0 text-[var(--error)]" size={18} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="sg-text-base font-medium text-[var(--text-primary)]">{text}</p>
        {onRetry ? (
          <Button variant="secondary" className="mt-3" onClick={onRetry} type="button">
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}
