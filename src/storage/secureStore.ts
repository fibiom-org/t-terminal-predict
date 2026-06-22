import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import type { StoredWallet } from '@/types/index.js';

const DIR = join(homedir(), '.tterminal');
const WALLET_FILE = join(DIR, 'wallet.json');

function ensureDir(): void {
  if (!existsSync(DIR)) {
    mkdirSync(DIR, { recursive: true, mode: 0o700 });
  } else {
    try {
      chmodSync(DIR, 0o700);
    } catch {
      /* best-effort on platforms without POSIX perms */
    }
  }
}

export function walletExists(): boolean {
  return existsSync(WALLET_FILE);
}

export function walletPath(): string {
  return WALLET_FILE;
}

export function saveWallet(wallet: StoredWallet): void {
  ensureDir();
  writeFileSync(WALLET_FILE, JSON.stringify(wallet, null, 2), { mode: 0o600 });
  try {
    chmodSync(WALLET_FILE, 0o600);
  } catch {
    /* best-effort */
  }
}

export function loadWallet(): StoredWallet | null {
  if (!walletExists()) return null;
  const raw = readFileSync(WALLET_FILE, 'utf8');
  return JSON.parse(raw) as StoredWallet;
}
