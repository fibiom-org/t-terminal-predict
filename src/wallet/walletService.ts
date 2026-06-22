import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { getActiveChainId, getRpcUrl } from '@/storage/settingsStore.js';
import { encryptSecret, decryptSecret } from '@/utils/crypto.js';
import { saveWallet, loadWallet, walletExists } from '@/storage/secureStore.js';
import type { StoredWallet, WalletSession } from '@/types/index.js';

export async function deriveAddress(mnemonic: string): Promise<`0x${string}`> {
  const chainId = getActiveChainId();
  const manager = new WalletManagerEvm(mnemonic, { provider: getRpcUrl(chainId), chainId });
  try {
    const account = await manager.getAccount(0);
    const address = await account.getAddress();
    account.dispose();
    return address as `0x${string}`;
  } finally {
    try {
      (manager as { dispose?: () => void }).dispose?.();
    } catch {
      /* noop */
    }
  }
}

export async function createWallet(): Promise<WalletSession> {
  const mnemonic = generateMnemonic(128); // 12 words
  const address = await deriveAddress(mnemonic);
  return { address, mnemonic };
}

export async function importWallet(mnemonicInput: string): Promise<WalletSession> {
  const mnemonic = mnemonicInput.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase. Please check the words and try again.');
  }
  const address = await deriveAddress(mnemonic);
  return { address, mnemonic };
}

export function persistWallet(session: WalletSession, password: string): void {
  const record: StoredWallet = {
    version: 1,
    address: session.address,
    createdAt: new Date().toISOString(),
    crypto: encryptSecret(session.mnemonic, password),
  };
  saveWallet(record);
}

export async function unlockWallet(password: string): Promise<WalletSession> {
  const record = loadWallet();
  if (!record) throw new Error('No wallet found. Create or import one first.');
  const mnemonic = decryptSecret(record.crypto, password);
  return { address: record.address, mnemonic };
}

export { walletExists };
