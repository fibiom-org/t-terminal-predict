import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import WalletManagerSolana from '@tetherto/wdk-wallet-solana';
import WalletManagerSpark from '@tetherto/wdk-wallet-spark';
import { getRpcUrl, getSolanaRpcUrl, getSparkNetwork } from '@/storage/settingsStore.js';

interface Disposable {
  dispose?: () => void;
}

let currentMnemonic: string | null = null;
const cache = new Map<string, Disposable>();

function ensureMnemonic(mnemonic: string): void {
  if (currentMnemonic !== null && currentMnemonic !== mnemonic) {
    disposeManagers();
  }
  currentMnemonic = mnemonic;
}

function getCached<T extends Disposable>(key: string, create: () => T): T {
  const existing = cache.get(key);
  if (existing) return existing as T;
  const created = create();
  cache.set(key, created);
  return created;
}

export function getEvmManager(mnemonic: string, chainId: number): WalletManagerEvm {
  ensureMnemonic(mnemonic);
  const rpcUrl = getRpcUrl(chainId);
  return getCached(`evm:${chainId}:${rpcUrl}`, () => new WalletManagerEvm(mnemonic, { provider: rpcUrl, chainId }));
}

export function getSolanaManager(mnemonic: string): WalletManagerSolana {
  ensureMnemonic(mnemonic);
  const rpcUrl = getSolanaRpcUrl();
  return getCached(`solana:${rpcUrl}`, () => new WalletManagerSolana(mnemonic, { provider: rpcUrl }));
}

export function getSparkManager(mnemonic: string): WalletManagerSpark {
  ensureMnemonic(mnemonic);
  const network = getSparkNetwork();
  return getCached(`spark:${network}`, () => new WalletManagerSpark(mnemonic, { network }));
}

export function disposeManagers(): void {
  for (const manager of cache.values()) {
    try {
      manager.dispose?.();
    } catch {
      /* best-effort */
    }
  }
  cache.clear();
  currentMnemonic = null;
}
