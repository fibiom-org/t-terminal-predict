import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { CHAINS, DEFAULT_CHAIN_ID, getChain, isSupportedChain } from '@/config/chains.js';
import { ENV_RPC_OVERRIDE } from '@/config/index.js';

interface Settings {
  readonly version: 1;
  activeChainId: number;

  rpcOverrides: Record<number, string>;
}

const DIR = join(homedir(), '.tterminal');
const SETTINGS_FILE = join(DIR, 'settings.json');

let cache: Settings | undefined;

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

function defaults(): Settings {
  const rpcOverrides: Record<number, string> = {};

  if (ENV_RPC_OVERRIDE) rpcOverrides[ENV_RPC_OVERRIDE.chainId] = ENV_RPC_OVERRIDE.url;
  return { version: 1, activeChainId: DEFAULT_CHAIN_ID, rpcOverrides };
}

export function loadSettings(): Settings {
  if (cache) return cache;
  if (!existsSync(SETTINGS_FILE)) {
    cache = defaults();
    return cache;
  }
  try {
    const raw = JSON.parse(readFileSync(SETTINGS_FILE, 'utf8')) as Partial<Settings>;
    const activeChainId =
      typeof raw.activeChainId === 'number' && isSupportedChain(raw.activeChainId)
        ? raw.activeChainId
        : DEFAULT_CHAIN_ID;
    cache = {
      version: 1,
      activeChainId,
      rpcOverrides: { ...raw.rpcOverrides },
    };
  } catch {
    cache = defaults();
  }
  return cache;
}

function persist(): void {
  if (!cache) return;
  ensureDir();
  writeFileSync(SETTINGS_FILE, JSON.stringify(cache, null, 2), { mode: 0o600 });
  try {
    chmodSync(SETTINGS_FILE, 0o600);
  } catch {
    /* best-effort */
  }
}

export function settingsPath(): string {
  return SETTINGS_FILE;
}

export function getActiveChainId(): number {
  return loadSettings().activeChainId;
}

export function setActiveChainId(chainId: number): void {
  if (!isSupportedChain(chainId)) throw new Error(`Unsupported chain id: ${chainId}`);
  loadSettings().activeChainId = chainId;
  persist();
}

export function getRpcUrl(chainId: number): string {
  const override = loadSettings().rpcOverrides[chainId];
  return override && override.trim() ? override.trim() : getChain(chainId).defaultRpcUrl;
}

export function setRpcUrl(chainId: number, url: string): string {
  const settings = loadSettings();
  const trimmed = url.trim();
  if (trimmed) settings.rpcOverrides[chainId] = trimmed;
  else delete settings.rpcOverrides[chainId];
  persist();
  return getRpcUrl(chainId);
}

export function hasRpcOverride(chainId: number): boolean {
  const override = loadSettings().rpcOverrides[chainId];
  return Boolean(override && override.trim());
}

export { CHAINS };
