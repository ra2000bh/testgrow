export function GrowLogo({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-16 w-16 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--background-secondary)] ${className}`.trim()}
      aria-hidden
    >
      <img src="/bot-logo.png" alt="StellarGrow bot logo" className="h-full w-full object-cover" />
    </div>
  );
}
