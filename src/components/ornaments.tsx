/* ── Shared ornament components ─────────────────────────── */

export function Fleuron({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 24" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M50 12h34" />
        <path d="M50 12H16" />
        <path d="M84 12c-6-4-6-8 0-9M84 12c-6 4-6 8 0 9" />
        <path d="M16 12c6-4 6-8 0-9M16 12c6 4 6 8 0 9" />
        <circle cx="50" cy="12" r="4" />
        <path d="M50 4c3 3 3 5 0 8-3-3-3-5 0-8zM50 20c3-3 3-5 0-8-3 3-3 5 0 8z" />
      </g>
    </svg>
  );
}

export function Cross({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6z" />
    </svg>
  );
}
