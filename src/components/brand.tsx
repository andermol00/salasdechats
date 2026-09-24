"use client";

import { useState, type CSSProperties } from "react";

/**
 * Brand helpers for No Trace.
 *
 * This file is intentionally SELF-CONTAINED (only React is imported) so it
 * keeps compiling even when other project files come from an older version.
 * The logo uses the PNG at /no-trace-logo.png and falls back to an inline
 * vector if that file is missing, so it can never render as a broken image.
 */

export const LOGO_SRC = "/no-trace-logo.png";
export const BRAND_NAME = "No Trace";

export const BRAND = {
  name: BRAND_NAME,
  shortName: "NO TRACE",
  tagline: "Salas temporales",
  logo: LOGO_SRC,
  logoPath: LOGO_SRC,
  src: LOGO_SRC,
  favicon: "/favicon.svg",
} as const;

const imgStyle: CSSProperties = { height: "auto", width: "auto" };

export function LogoVector({ height = 30 }: { height?: number }) {
  return (
    <svg
      viewBox="0 0 128 76"
      width={(height * 128) / 76}
      height={height}
      role="img"
      aria-label={BRAND_NAME}
    >
      <defs>
        <linearGradient id="ntBrandGrad" x1="0%" y1="12%" x2="100%" y2="88%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="34%" stopColor="#2d7ff9" />
          <stop offset="68%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#e040fb" />
        </linearGradient>
        <mask id="ntBrandCut">
          <rect x="0" y="0" width="128" height="76" fill="#fff" />
          <path
            d="M74 14 C86 20 91 28 91 38 C91 48 86 56 74 62 L92 50 L92 26 Z"
            fill="#000"
          />
        </mask>
      </defs>
      <g mask="url(#ntBrandCut)">
        <path d="M10 70 L20 46 L42 58 Z" fill="url(#ntBrandGrad)" />
        <ellipse
          cx="48"
          cy="38"
          rx="34"
          ry="28"
          fill="none"
          stroke="url(#ntBrandGrad)"
          strokeWidth="8"
        />
      </g>
      <path
        d="M84 15 H109"
        stroke="url(#ntBrandGrad)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path d="M93 38 H104" stroke="#8b5cf6" strokeWidth="8" strokeLinecap="round" />
      <path
        d="M86 57 H107"
        stroke="url(#ntBrandGrad)"
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

export function LogoMark({
  className = "",
  height = 30,
}: {
  className?: string;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <LogoVector height={height} />;

  return (
    <img
      className={className}
      src={LOGO_SRC}
      alt={BRAND_NAME}
      height={height}
      style={{ ...imgStyle, height }}
      onError={() => setFailed(true)}
    />
  );
}

export function BrandName({ className = "" }: { className?: string }) {
  return <span className={className}>{BRAND_NAME}</span>;
}

export function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={className ? `no-trace-brand ${className}` : "no-trace-brand"}>
      <LogoMark height={30} />
      <span>NO TRACE</span>
    </span>
  );
}

export default LogoMark;
