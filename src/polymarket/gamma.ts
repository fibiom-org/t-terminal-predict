import { GAMMA_API_BASE } from '@/polymarket/config.js';
import type { PolyEvent, PolyMarket, PolyOutcome } from '@/polymarket/types.js';

const SPORTS_TAG_SLUG = 'sports';

interface RawMarket {
  readonly id?: string;
  readonly conditionId?: string;
  readonly question?: string;
  readonly groupItemTitle?: string;
  readonly slug?: string;
  readonly active?: boolean;
  readonly closed?: boolean;
  readonly acceptingOrders?: boolean;
  readonly negRisk?: boolean;

  readonly outcomes?: string;
  readonly outcomePrices?: string;
  readonly clobTokenIds?: string;
  readonly bestBid?: number;
  readonly bestAsk?: number;
  readonly spread?: number;
  readonly lastTradePrice?: number;
  readonly oneDayPriceChange?: number;
  readonly volume24hr?: number;
  readonly volumeNum?: number;
  readonly liquidityNum?: number;
  readonly orderMinSize?: number;
  readonly orderPriceMinTickSize?: number;
  readonly endDate?: string;
}

interface RawEvent {
  readonly id?: string;
  readonly title?: string;
  readonly slug?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly negRisk?: boolean;
  readonly featured?: boolean;
  readonly volume?: number;
  readonly volume24hr?: number;
  readonly liquidity?: number;
  readonly commentCount?: number;
  readonly markets?: readonly RawMarket[];
}

function parseStringList(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

function toOutcomes(raw: RawMarket): PolyOutcome[] {
  const labels = parseStringList(raw.outcomes);
  const prices = parseStringList(raw.outcomePrices);
  const tokenIds = parseStringList(raw.clobTokenIds);
  const outcomes: PolyOutcome[] = [];
  for (let i = 0; i < labels.length; i++) {
    const tokenId = tokenIds[i];
    if (!tokenId) continue; // not tradable without a CLOB token id
    outcomes.push({
      label: labels[i] ?? `Outcome ${i + 1}`,
      tokenId,
      price: Number(prices[i] ?? '0') || 0,
    });
  }
  return outcomes;
}

function toMarket(raw: RawMarket): PolyMarket | null {
  if (!raw.conditionId || !raw.question) return null;
  const outcomes = toOutcomes(raw);
  if (outcomes.length === 0) return null;
  return {
    id: raw.id ?? raw.conditionId,
    conditionId: raw.conditionId,
    question: raw.question,
    groupItemTitle: raw.groupItemTitle ?? '',
    slug: raw.slug ?? '',
    active: raw.active ?? false,
    closed: raw.closed ?? false,
    acceptingOrders: raw.acceptingOrders ?? false,
    negRisk: raw.negRisk ?? false,
    outcomes,
    bestBid: raw.bestBid ?? 0,
    bestAsk: raw.bestAsk ?? 0,
    spread: raw.spread ?? 0,
    lastTradePrice: raw.lastTradePrice ?? 0,
    oneDayPriceChange: raw.oneDayPriceChange ?? 0,
    volume24hr: raw.volume24hr ?? 0,
    volume: raw.volumeNum ?? 0,
    liquidity: raw.liquidityNum ?? 0,
    orderMinSize: raw.orderMinSize ?? 0,
    orderPriceMinTickSize: raw.orderPriceMinTickSize ?? 0.01,
    endDate: raw.endDate ?? null,
  };
}

function toEvent(raw: RawEvent): PolyEvent | null {
  const markets = (raw.markets ?? []).map(toMarket).filter((m): m is PolyMarket => m !== null);
  if (markets.length === 0 || !raw.title) return null;
  return {
    id: raw.id ?? raw.slug ?? raw.title,
    title: raw.title.trim(),
    slug: raw.slug ?? '',
    startDate: raw.startDate ?? null,
    endDate: raw.endDate ?? null,
    negRisk: raw.negRisk ?? false,
    featured: raw.featured ?? false,
    volume: raw.volume ?? 0,
    volume24hr: raw.volume24hr ?? 0,
    liquidity: raw.liquidity ?? 0,
    commentCount: raw.commentCount ?? 0,
    markets,
  };
}

export async function fetchSportsEvents(limit = 20): Promise<PolyEvent[]> {
  const params = new URLSearchParams({
    tag_slug: SPORTS_TAG_SLUG,
    closed: 'false',
    active: 'true',
    archived: 'false',
    order: 'startDate',
    ascending: 'true',
    limit: String(limit),
  });
  const res = await fetch(`${GAMMA_API_BASE}/events?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Gamma events request failed (${res.status}): ${text || res.statusText}`);
  }
  const data = (await res.json()) as RawEvent[];
  return data.map(toEvent).filter((e): e is PolyEvent => e !== null);
}
