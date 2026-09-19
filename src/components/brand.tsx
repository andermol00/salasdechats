import { BRAND } from "@/lib/constants";

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={`logo-mark ${className}`}
      role="img"
      aria-label="No Trace"
    >
      <defs>
        <linearGradient id="nt-inline" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="0.45" stopColor="#22d3ee" />
          <stop offset="0.72" stopColor="#6366f1" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
      </defs>
      <g fill="url(#nt-inline)">
        <rect x="322" y="146" width="86" height="30" rx="15" />
        <circle cx="446" cy="161" r="16" />
        <rect x="392" y="212" width="62" height="30" rx="15" />
        <rect x="322" y="278" width="98" height="30" rx="15" />
        <circle cx="452" cy="293" r="13" />
        <rect x="300" y="344" width="112" height="30" rx="15" />
        <path d="M168 96 H258 A120 120 0 0 1 378 216 V266 A120 120 0 0 1 258 386 H200 L92 458 L116 386 H168 A120 120 0 0 1 48 266 V216 A120 120 0 0 1 168 96 Z" />
      </g>
      <circle cx="152" cy="241" r="31" fill="#22d3ee" />
      <circle cx="228" cy="241" r="33" fill="#3b82f6" />
      <circle cx="304" cy="241" r="31" fill="#a855f7" />
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <LogoMark />
      {compact ? null : <span className="brand-name">{BRAND}</span>}
    </span>
  );
}
