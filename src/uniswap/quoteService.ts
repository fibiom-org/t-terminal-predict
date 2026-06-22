import { parseUnits } from 'viem';
import { Token, CurrencyAmount, Price } from '@uniswap/sdk-core';
import { getPublicClient } from '@/wallet/client.js';
import { getChain } from '@/config/chains.js';
import { trimDecimals } from '@/utils/format.js';
import type { SwapQuote, SwapSide, TokenInfo, TradingPair } from '@/types/index.js';

const QUOTER_V2_ABI = [
  {
    type: 'function',
    name: 'quoteExactInputSingle',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const;

function toSdkToken(chainId: number, t: TokenInfo): Token {
  return new Token(chainId, t.address, t.decimals, t.symbol, t.name);
}

async function quoteExactInputSingle(
  chainId: number,
  tokenIn: TokenInfo,
  tokenOut: TokenInfo,
  amountInRaw: bigint,
  feeTier: number,
): Promise<bigint> {
  const client = getPublicClient(chainId);
  const { result } = await client.simulateContract({
    address: getChain(chainId).uniswap.quoterV2,
    abi: QUOTER_V2_ABI,
    functionName: 'quoteExactInputSingle',
    args: [
      {
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: amountInRaw,
        fee: feeTier,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
  // result is a tuple [amountOut, ...]
  return (result as readonly bigint[])[0]!;
}

function resolveSide(pair: TradingPair, side: SwapSide): { tokenIn: TokenInfo; tokenOut: TokenInfo } {
  if (side === 'buy') return { tokenIn: pair.base, tokenOut: pair.quote };
  return { tokenIn: pair.quote, tokenOut: pair.base };
}

/** Quotes a swap of `amountInHuman` units of the input token for the given side. */
export async function getSwapQuote(pair: TradingPair, side: SwapSide, amountInHuman: string): Promise<SwapQuote> {
  const { tokenIn, tokenOut } = resolveSide(pair, side);
  const amountInRaw = parseUnits(amountInHuman as `${number}`, tokenIn.decimals);
  if (amountInRaw <= 0n) throw new Error('Amount must be greater than zero.');

  const amountOutRaw = await quoteExactInputSingle(pair.chainId, tokenIn, tokenOut, amountInRaw, pair.feeTier);

  const inAmt = CurrencyAmount.fromRawAmount(toSdkToken(pair.chainId, tokenIn), amountInRaw.toString());
  const outAmt = CurrencyAmount.fromRawAmount(toSdkToken(pair.chainId, tokenOut), amountOutRaw.toString());

  const usdt = toSdkToken(pair.chainId, pair.base);
  const wbtc = toSdkToken(pair.chainId, pair.quote);
  const price = new Price(
    wbtc,
    usdt,
    side === 'buy' ? outAmt.quotient.toString() : inAmt.quotient.toString(),
    side === 'buy' ? inAmt.quotient.toString() : outAmt.quotient.toString(),
  );

  return {
    side,
    pair,
    amountIn: tokenIn,
    amountOut: tokenOut,
    amountInHuman: trimDecimals(inAmt.toSignificant(8), 2),
    amountOutHuman: trimDecimals(outAmt.toSignificant(8), 2),
    price: `${trimDecimals(price.toSignificant(6), 2)} ${pair.base.symbol} / ${pair.quote.symbol}`,
  };
}

export async function getPairPrice(pair: TradingPair): Promise<string> {
  const oneQuote = parseUnits('1', pair.quote.decimals);
  const outRaw = await quoteExactInputSingle(pair.chainId, pair.quote, pair.base, oneQuote, pair.feeTier);
  const out = CurrencyAmount.fromRawAmount(toSdkToken(pair.chainId, pair.base), outRaw.toString());
  return `${trimDecimals(out.toSignificant(8), 2)} ${pair.base.symbol} per 1 ${pair.quote.symbol}`;
}
