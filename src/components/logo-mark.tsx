"use client";

import { useState } from "react";

/**
 * Vector fallback of the No Trace logo. Rendered inline (no network
 * request) so the brand can never appear as a broken image.
 */
export function LogoVector({
  height = 30,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 128 76"
      width={(height * 128) / 76}
      height={height}
      role="img"
      aria-label="No Trace"
    >
      <defs>
        <linearGradient id="ntLogoGrad" x1="0%" y1="12%" x2="100%" y2="88%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="34%" stopColor="#2d7ff9" />
          <stop offset="68%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#e040fb" />
        </linearGradient>
        <mask id="ntLogoCut">
          <rect x="0" y="0" width="128" height="76" fill="#fff" />
          <path
            d="M74 14 C86 20 91 28 91 38 C91 48 86 56 74 62 L92 50 L92 26 Z"
            fill="#000"
          />
        </mask>
      </defs>
      <g mask="url(#ntLogoCut)">
        <path d="M10 70 L20 46 L42 58 Z" fill="url(#ntLogoGrad)" />
        <ellipse
          cx="48"
          cy="38"
          rx="34"
          ry="28"
          fill="none"
          stroke="url(#ntLogoGrad)"
          strokeWidth="8"
        />
      </g>
      <path
        d="M84 15 H109"
        stroke="url(#ntLogoGrad)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path d="M93 38 H104" stroke="#8b5cf6" strokeWidth="8" strokeLinecap="round" />
      <path
        d="M86 57 H107"
        stroke="url(#ntLogoGrad)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <circle cx="118" cy="8" r="4" fill="#7c5cf6" />
      <circle cx="114" cy="68" r="4" fill="#d946ef" />
      <circle cx="34" cy="38" r="7" fill="#22d3ee" />
      <circle cx="51" cy="38" r="7" fill="#2d7ff9" />
      <circle cx="68" cy="38" r="7" fill="#c026d3" />
    </svg>
  );
}

/**
 * PNG logo with automatic inline-SVG fallback. If `public/no-trace-logo.png`
 * is missing, the vector version is shown instead of a broken image icon.
 */
export function LogoMark({
  height = 30,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <LogoVector height={height} className={className} />;
  }

  return (
    <img
      className={className}
      src="/no-trace-logo.png"
      alt="No Trace"
      height={height}
      style={{ height, width: "auto" }}
      onError={() => setFailed(true)}
    />
  );
}
