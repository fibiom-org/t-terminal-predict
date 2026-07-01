export function compactUsd(n: number): string {
  if (!Number.isFinite(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function usd(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export function probability(price: number): string {
  return `${Math.round(price * 100)}%`;
}

export function cents(price: number): string {
  return `${(price * 100).toFixed(1)}¢`;
}

export function signedPoints(delta: number): string {
  const pts = delta * 100;
  if (Math.abs(pts) < 0.05) return '–0.0';
  const arrow = pts > 0 ? '▲' : '▼';
  return `${arrow}${Math.abs(pts).toFixed(1)}`;
}

export function signedPercent(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

export function shortDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: '2-digit' };
  return d.toLocaleDateString('en-US', opts);
}
