export function GrowLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      width={64}
      height={64}
      aria-hidden
      role="img"
    >
      <title>GROW</title>
      <circle cx="32" cy="36" r="22" fill="var(--background-secondary)" stroke="var(--border)" />
      <path
        d="M32 44c-4-8-2-16 4-22 2 6 1 14-4 22z"
        fill="var(--primary-green)"
      />
      <path
        d="M32 44c4-6 6-12 5-18-4 4-7 10-5 18z"
        fill="var(--accent-green)"
      />
      <path
        d="M32 22v8M28 26h8"
        stroke="var(--primary-green)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
