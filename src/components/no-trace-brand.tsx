export function NoTraceBrand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "no-trace-brand compact" : "no-trace-brand"}>
      <img src="/no-trace-logo.png" alt="" aria-hidden />
      <span>NO TRACE</span>
    </span>
  );
}
