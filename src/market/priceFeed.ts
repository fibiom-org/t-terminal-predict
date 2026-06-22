import type { PriceHistory } from '@/types/index.js';

const BASE = 'https://api.coingecko.com/api/v3';

interface MarketChartResponse {
  prices: [number, number][];
}

/**
 * Fetches the quote asset's USD price history for the last `days` days.
 * @throws if the request fails or returns no data.
 */
export async function getPriceHistory(coinId: string, days = 7): Promise<PriceHistory> {
  const url = `${BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`price feed returned HTTP ${res.status}`);
    const json = (await res.json()) as MarketChartResponse;
    const prices = (json.prices ?? []).map(([, p]) => p).filter((p) => Number.isFinite(p));
    if (prices.length < 2) throw new Error('price feed returned insufficient data');

    const first = prices[0]!;
    const last = prices[prices.length - 1]!;
    return {
      prices,
      last,
      changePct: first === 0 ? 0 : ((last - first) / first) * 100,
      days,
    };
  } finally {
    clearTimeout(timeout);
  }
}
