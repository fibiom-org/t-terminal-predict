import { erc20Abi, formatUnits } from 'viem';
import { getPublicClient } from '@/wallet/client.js';
import { CHAINS, getChain, nativeToken } from '@/config/chains.js';
import { trimDecimals } from '@/utils/format.js';
import type { ChainBalances, TokenBalance, TokenInfo } from '@/types/index.js';

function toBalance(token: TokenInfo, raw: bigint): TokenBalance {
  return { token, raw, formatted: trimDecimals(formatUnits(raw, token.decimals), 2) };
}

async function readTokenBalance(chainId: number, token: TokenInfo, owner: `0x${string}`): Promise<TokenBalance> {
  const client = getPublicClient(chainId);
  const raw = (await client.readContract({
    address: token.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [owner],
  })) as bigint;
  return toBalance(token, raw);
}

export async function getChainBalances(chainId: number, owner: `0x${string}`): Promise<ChainBalances> {
  const chain = getChain(chainId);
  try {
    const client = getPublicClient(chainId);
    const [nativeRaw, tokens] = await Promise.all([
      client.getBalance({ address: owner }),
      Promise.all(chain.tokens.map((t) => readTokenBalance(chainId, t, owner))),
    ]);
    return {
      chainId,
      chainName: chain.name,
      native: toBalance(nativeToken(chain), nativeRaw),
      tokens,
      error: null,
    };
  } catch (err) {
    return {
      chainId,
      chainName: chain.name,
      native: null,
      tokens: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function getAllChainBalances(owner: `0x${string}`): Promise<ChainBalances[]> {
  return Promise.all(CHAINS.map((c) => getChainBalances(c.id, owner)));
}
