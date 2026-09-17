export function FlameMark({ className = "" }: { className?: string }) {
  return (
    <span className={`flame-mark ${className}`} aria-hidden>
      <svg viewBox="0 0 32 40" className="flame-svg">
        <path
          className="flame-outer"
          d="M16 2c3 6 10 10 10 20 0 8-5.2 16-10 16S6 30 6 22C6 12 13 8 16 2z"
        />
        <path
          className="flame-inner"
          d="M16 14c1.6 3 5 5 5 10 0 4-2.4 8-5 8s-5-4-5-8c0-5 3.4-7 5-10z"
        />
      </svg>
    </span>
  );
}
