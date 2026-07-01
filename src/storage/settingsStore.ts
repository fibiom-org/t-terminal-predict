import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { CHAINS, DEFAULT_CHAIN_ID, getChain, isSupportedChain } from '@/config/chains.js';
import { DEFAULT_SOLANA_RPC_URL } from '@/config/nonEvm.js';
import { ENV_RPC_OVERRIDE } from '@/config/index.js';

export type LiveFeature = 'bets' | 'sends' | 'bridges';

const LIVE_FEATURES: readonly LiveFeature[] = ['bets', 'sends', 'bridges'];

interface Settings {
  readonly version: 1;
  activeChainId: number;
  rpcOverrides: Record<number, string>;
  solanaRpcUrl?: string;
  execution: Partial<Record<LiveFeature, boolean>>;
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
  return { version: 1, activeChainId: DEFAULT_CHAIN_ID, rpcOverrides, execution: {} };
}

function sanitizeExecution(raw: unknown): Partial<Record<LiveFeature, boolean>> {
  const out: Partial<Record<LiveFeature, boolean>> = {};
  if (raw && typeof raw === 'object') {
    for (const feature of LIVE_FEATURES) {
      const value = (raw as Record<string, unknown>)[feature];
      if (typeof value === 'boolean') out[feature] = value;
    }
  }
  return out;
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
      solanaRpcUrl: typeof raw.solanaRpcUrl === 'string' ? raw.solanaRpcUrl : undefined,
      execution: sanitizeExecution(raw.execution),
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

export function getSolanaRpcUrl(): string {
  const url = loadSettings().solanaRpcUrl;
  return url && url.trim() ? url.trim() : DEFAULT_SOLANA_RPC_URL;
}

export function setSolanaRpcUrl(url: string): string {
  const settings = loadSettings();
  const trimmed = url.trim();
  if (trimmed) settings.solanaRpcUrl = trimmed;
  else delete settings.solanaRpcUrl;
  persist();
  return getSolanaRpcUrl();
}

export function hasSolanaRpcOverride(): boolean {
  const url = loadSettings().solanaRpcUrl;
  return Boolean(url && url.trim());
}

function envDefaultLive(feature: LiveFeature): boolean {
  switch (feature) {
    case 'bets':
      return process.env.TT_LIVE_BETS === '1';
    case 'sends':
      return process.env.TT_LIVE_SENDS !== '0';
    case 'bridges':
      return process.env.TT_LIVE_BRIDGES !== '0';
  }
}

export function isLiveExecution(feature: LiveFeature): boolean {
  const override = loadSettings().execution[feature];
  return typeof override === 'boolean' ? override : envDefaultLive(feature);
}

export function hasExecutionOverride(feature: LiveFeature): boolean {
  return typeof loadSettings().execution[feature] === 'boolean';
}

export function setLiveExecution(feature: LiveFeature, live: boolean): void {
  loadSettings().execution[feature] = live;
  persist();
}

export function clearLiveExecution(feature: LiveFeature): void {
  delete loadSettings().execution[feature];
  persist();
}

export function clearSettingsCache(): void {
  cache = undefined;
}

export { CHAINS };
