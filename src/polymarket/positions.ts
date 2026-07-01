import { DATA_API_BASE } from '@/polymarket/config.js';
import type { PolyPosition } from '@/polymarket/types.js';

interface RawPosition {
  readonly asset?: string;
  readonly title?: string;
  readonly outcome?: string;
  readonly size?: number;
  readonly avgPrice?: number;
  readonly curPrice?: number;
  readonly initialValue?: number;
  readonly currentValue?: number;
  readonly cashPnl?: number;
  readonly percentPnl?: number;
  readonly realizedPnl?: number;
  readonly endDate?: string;
  readonly redeemable?: boolean;
  readonly mergeable?: boolean;
}

function toPosition(raw: RawPosition): PolyPosition | null {
  if (!raw.asset || !raw.size) return null;
  return {
    title: raw.title ?? 'Unknown market',
    outcome: raw.outcome ?? '',
    tokenId: raw.asset,
    size: raw.size ?? 0,
    avgPrice: raw.avgPrice ?? 0,
    curPrice: raw.curPrice ?? 0,
    initialValue: raw.initialValue ?? 0,
    value: raw.currentValue ?? 0,
    pnl: raw.cashPnl ?? 0,
    pnlPercent: raw.percentPnl ?? 0,
    realizedPnl: raw.realizedPnl ?? 0,
    endDate: raw.endDate ?? null,
    redeemable: raw.redeemable ?? false,
    mergeable: raw.mergeable ?? false,
  };
}

export async function fetchPositions(owner: string): Promise<PolyPosition[]> {
  const params = new URLSearchParams({
    user: owner,
    sizeThreshold: '0.01',
    sortBy: 'CURRENT',
    sortDirection: 'DESC',
  });
  const res = await fetch(`${DATA_API_BASE}/positions?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Positions request failed (${res.status}): ${text || res.statusText}`);
  }
  const data = (await res.json()) as RawPosition[];
  return data.map(toPosition).filter((p): p is PolyPosition => p !== null);
}
