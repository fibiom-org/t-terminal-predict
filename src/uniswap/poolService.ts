import { erc20Abi, formatUnits } from 'viem';
import { Token } from '@uniswap/sdk-core';
import { Pool } from '@uniswap/v3-sdk';
import { getPublicClient } from '@/wallet/client.js';
import { PAIRS } from '@/config/index.js';
import { getChain } from '@/config/chains.js';
import { trimDecimals } from '@/utils/format.js';
import type { TokenInfo, TradingPair } from '@/types/index.js';

export interface PairPool {
  readonly pair: TradingPair;
  readonly info: PoolInfo | null;
  readonly error: string | null;
}

export interface PoolReserve {
  readonly token: TokenInfo;
  readonly amount: string;
}

export interface PoolInfo {
  readonly address: `0x${string}`;
  readonly feePercent: string;
  readonly tick: number;
  readonly price: string;
  readonly liquidity: string;
  readonly reserves: readonly [PoolReserve, PoolReserve];
}

const FACTORY_ABI = [
  {
    type: 'function',
    name: 'getPool',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    outputs: [{ name: 'pool', type: 'address' }],
  },
] as const;

const POOL_ABI = [
  {
    type: 'function',
    name: 'slot0',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
  },
  { type: 'function', name: 'liquidity', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint128' }] },
] as const;

function abbreviate(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}k`;
  return value.toFixed(2);
}

function toSdkToken(chainId: number, t: TokenInfo): Token {
  return new Token(chainId, t.address, t.decimals, t.symbol, t.name);
}

export async function getPoolInfo(pair: TradingPair): Promise<PoolInfo> {
  const client = getPublicClient(pair.chainId);

  const poolAddress = (await client.readContract({
    address: getChain(pair.chainId).uniswap.factory,
    abi: FACTORY_ABI,
    functionName: 'getPool',
    args: [pair.base.address, pair.quote.address, pair.feeTier],
  })) as `0x${string}`;

  if (!poolAddress || /^0x0+$/.test(poolAddress)) {
    throw new Error('No Uniswap v3 pool exists for this pair / fee tier.');
  }

  const [slot0, liquidity, baseBal, quoteBal] = await Promise.all([
    client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'slot0' }) as Promise<
      readonly [bigint, number, ...unknown[]]
    >,
    client.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'liquidity' }) as Promise<bigint>,
    client.readContract({
      address: pair.base.address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [poolAddress],
    }) as Promise<bigint>,
    client.readContract({
      address: pair.quote.address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [poolAddress],
    }) as Promise<bigint>,
  ]);

  const sqrtPriceX96 = slot0[0];
  const tick = Number(slot0[1]);

  const base = toSdkToken(pair.chainId, pair.base);
  const quote = toSdkToken(pair.chainId, pair.quote);
  const pool = new Pool(base, quote, pair.feeTier, sqrtPriceX96.toString(), liquidity.toString(), tick);

  const price = pool.priceOf(quote).toSignificant(8);

  return {
    address: poolAddress,
    feePercent: `${(pair.feeTier / 10_000).toFixed(2)}%`,
    tick,
    price: `${trimDecimals(price, 2)} ${pair.base.symbol} / ${pair.quote.symbol}`,
    liquidity: liquidity.toString(),
    reserves: [
      { token: pair.base, amount: abbreviate(Number(formatUnits(baseBal, pair.base.decimals))) },
      { token: pair.quote, amount: abbreviate(Number(formatUnits(quoteBal, pair.quote.decimals))) },
    ],
  };
}

export async function getAllPools(): Promise<PairPool[]> {
  return Promise.all(
    PAIRS.map(async (pair) => {
      try {
        return { pair, info: await getPoolInfo(pair), error: null };
      } catch (err) {
        return { pair, info: null, error: err instanceof Error ? err.message : String(err) };
      }
    }),
  );
}
