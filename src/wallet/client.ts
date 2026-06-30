import { createPublicClient, http, type Chain, type PublicClient } from 'viem';
import { mainnet, arbitrum, optimism, base, polygon } from 'viem/chains';
import { getRpcUrl } from '@/storage/settingsStore.js';

const VIEM_CHAINS: Record<number, Chain> = {
  1: mainnet,
  42161: arbitrum,
  10: optimism,
  8453: base,
  137: polygon,
};

const cache = new Map<number, PublicClient>();

export function getPublicClient(chainId: number): PublicClient {
  const existing = cache.get(chainId);
  if (existing) return existing;

  const chain = VIEM_CHAINS[chainId];
  if (!chain) throw new Error(`Unsupported chain id: ${chainId}`);

  const client = createPublicClient({
    chain,
    transport: http(getRpcUrl(chainId)),
  });
  cache.set(chainId, client);
  return client;
}

export function resetClients(chainId?: number): void {
  if (typeof chainId === 'number') cache.delete(chainId);
  else cache.clear();
}
