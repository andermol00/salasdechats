"use client";

import { LogoMark } from "@/components/logo-mark";

export function NoTraceBrand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "no-trace-brand compact" : "no-trace-brand"}>
      <LogoMark height={compact ? 26 : 30} />
      <span>NO TRACE</span>
    </span>
  );
}
