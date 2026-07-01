import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import WalletManagerSolana from '@tetherto/wdk-wallet-solana';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { getActiveChainId, getRpcUrl, getSolanaRpcUrl } from '@/storage/settingsStore.js';
import { encryptSecret, decryptSecret } from '@/utils/crypto.js';
import { saveWallet, loadWallet, walletExists } from '@/storage/secureStore.js';
import type { StoredWalletV2, WalletAddresses, WalletSession } from '@/types/index.js';

interface Disposable {
  dispose?: () => void;
}

async function withManager<T>(
  manager: Disposable & { getAccount(index?: number): Promise<{ getAddress(): Promise<string> }> },
  fn: (m: typeof manager) => Promise<T>,
): Promise<T> {
  try {
    return await fn(manager);
  } finally {
    try {
      manager.dispose?.();
    } catch {
      /* noop */
    }
  }
}

async function addressOf(manager: {
  getAccount(index?: number): Promise<{ getAddress(): Promise<string> }>;
}): Promise<string> {
  const account = await manager.getAccount(0);
  const address = await account.getAddress();
  (account as Disposable).dispose?.();
  return address;
}

export async function deriveAddresses(mnemonic: string): Promise<WalletAddresses> {
  const chainId = getActiveChainId();
  const [evm, solana] = await Promise.all([
    withManager(new WalletManagerEvm(mnemonic, { provider: getRpcUrl(chainId), chainId }), addressOf),
    withManager(new WalletManagerSolana(mnemonic, { provider: getSolanaRpcUrl() }), addressOf),
  ]);
  return { evm: evm as `0x${string}`, solana };
}

export async function createWallet(): Promise<WalletSession> {
  const mnemonic = generateMnemonic(128); // 12 words
  const addresses = await deriveAddresses(mnemonic);
  return { mnemonic, addresses };
}

export async function importWallet(mnemonicInput: string): Promise<WalletSession> {
  const mnemonic = mnemonicInput.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase. Please check the words and try again.');
  }
  const addresses = await deriveAddresses(mnemonic);
  return { mnemonic, addresses };
}

export function persistWallet(session: WalletSession, password: string): void {
  const record: StoredWalletV2 = {
    version: 2,
    addresses: session.addresses,
    createdAt: new Date().toISOString(),
    crypto: encryptSecret(session.mnemonic, password),
  };
  saveWallet(record);
}

export async function unlockWallet(password: string): Promise<WalletSession> {
  const record = loadWallet();
  if (!record) throw new Error('No wallet found. Create or import one first.');
  const mnemonic = decryptSecret(record.crypto, password);
  const addresses = await deriveAddresses(mnemonic);
  const session: WalletSession = { mnemonic, addresses };
  if (record.version !== 2) {
    const migrated: StoredWalletV2 = {
      version: 2,
      addresses,
      createdAt: record.createdAt,
      crypto: record.crypto,
    };
    saveWallet(migrated);
  }
  return session;
}

export { walletExists };
