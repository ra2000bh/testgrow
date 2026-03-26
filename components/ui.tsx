"use client";

export function SpinnerLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-[#3a3a52] bg-[#1A1A2E] p-4">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#E8E8E8] border-t-transparent" />
      <p className="text-sm text-[#E8E8E8]">{text}</p>
    </div>
  );
}

export function ErrorCard({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-[#6A0DAD] bg-[#2a1d40] p-5">
      <p className="font-semibold text-[#F0F0F0]">{text}</p>
      {onRetry ? (
        <button className="btn-outline mt-4" onClick={onRetry} type="button">
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function ProgressBar({ label, value }: { label: string; value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-[#E8E8E8]">{label}</p>
      <div className="h-3 min-h-[12px] rounded-full bg-[#2b2b44]">
        <div className="h-3 rounded-full bg-[#6A0DAD]" style={{ width: `${clamped}%` }} />
      </div>
      <p className="text-sm text-[#A0A0B0]">{clamped.toFixed(0)}%</p>
    </div>
  );
}
