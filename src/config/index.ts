import 'dotenv/config';
import { z } from 'zod';
import { CHAINS, findToken, isSupportedChain } from '@/config/chains.js';
import type { TokenInfo, TradingPair } from '@/types/index.js';

const EnvSchema = z.object({
  RPC_URL: z.string().url().optional(),
  CHAIN_ID: z.coerce.number().int().positive().default(1),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid TTerminal configuration:\n${issues}`);
}

export const env = parsed.data;

export const ENV_RPC_OVERRIDE: { chainId: number; url: string } | null =
  env.RPC_URL && isSupportedChain(env.CHAIN_ID) ? { chainId: env.CHAIN_ID, url: env.RPC_URL } : null;

function pair(
  chainId: number,
  baseSymbol: string,
  quoteSymbol: string,
  chartCoinId: string,
  feeTier = 3000,
): TradingPair {
  const base = findToken(chainId, baseSymbol);
  const quote = findToken(chainId, quoteSymbol);
  if (!base || !quote) {
    throw new Error(`Missing token for pair ${baseSymbol}/${quoteSymbol} on chain ${chainId}`);
  }
  return {
    id: `${chainId}-${baseSymbol}-${quoteSymbol}`.toLowerCase(),
    chainId,
    label: `${baseSymbol} / ${quoteSymbol}`,
    base,
    quote,
    feeTier,
    chartCoinId,
  };
}

export const PAIRS: readonly TradingPair[] = [
  // Ethereum
  pair(1, 'USDT', 'WETH', 'ethereum'),
  pair(1, 'USDT', 'WBTC', 'wrapped-bitcoin'),
  // Arbitrum
  pair(42161, 'USDT', 'WETH', 'ethereum'),
  pair(42161, 'USDT', 'WBTC', 'wrapped-bitcoin'),
  pair(42161, 'USDT', 'ARB', 'arbitrum'),
  // Optimism
  pair(10, 'USDT', 'WETH', 'ethereum'),
  pair(10, 'USDT', 'OP', 'optimism'),
  // Base
  pair(8453, 'USDC', 'WETH', 'ethereum'),
  pair(8453, 'USDC', 'cbBTC', 'coinbase-wrapped-btc'),
];

export const DEFAULT_PAIR = PAIRS[0]!;

export function pairsForChain(chainId: number): readonly TradingPair[] {
  return PAIRS.filter((p) => p.chainId === chainId);
}

export const SUPPORTED_TOKENS: readonly TokenInfo[] = CHAINS.flatMap((c) => c.tokens);
