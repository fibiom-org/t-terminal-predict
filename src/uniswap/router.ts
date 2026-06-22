import { getChain } from '@/config/chains.js';
import type { SwapQuote, SwapResult, WalletSession } from '@/types/index.js';

export interface SwapExecutor {
  readonly simulated: boolean;
  execute(session: WalletSession, quote: SwapQuote): Promise<SwapResult>;
}

export class MockSwapExecutor implements SwapExecutor {
  readonly simulated = true;

  async execute(_session: WalletSession, quote: SwapQuote): Promise<SwapResult> {
    // Simulate a short confirmation delay.
    await new Promise((resolve) => setTimeout(resolve, 600));
    const fakeHash = `0x${'0'.repeat(64)}`;
    return {
      ok: true,
      hash: fakeHash,
      simulated: true,
      message:
        `Simulated ${quote.side} of ${quote.amountInHuman} ${quote.amountIn.symbol} ` +
        `→ ${quote.amountOutHuman} ${quote.amountOut.symbol}. No on-chain transaction was sent.`,
    };
  }
}

export class UniswapSwapExecutor implements SwapExecutor {
  readonly simulated = false;

  async execute(_session: WalletSession, quote: SwapQuote): Promise<SwapResult> {
    void getChain(quote.pair.chainId).uniswap.swapRouter02;
    return {
      ok: false,
      simulated: false,
      message: 'Real on-chain swaps are not enabled yet. Set up the Uniswap router executor to go live.',
    };
  }
}

export function getSwapExecutor(): SwapExecutor {
  return new MockSwapExecutor();
}
