import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { encryptSecret, decryptSecret } from '@/utils/crypto.js';
import type { BuilderCredentials, StoredCredentials, WalletSession } from '@/types/index.js';

const DIR = join(homedir(), '.tterminal');
const CREDENTIALS_FILE = join(DIR, 'credentials.json');

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


export function hasBuilderCredentials(): boolean {
  return existsSync(CREDENTIALS_FILE);
}

export function credentialsPath(): string {
  return CREDENTIALS_FILE;
}

export function saveBuilderCredentials(creds: BuilderCredentials, session: WalletSession): void {
  ensureDir();
  const record: StoredCredentials = {
    version: 1,
    crypto: encryptSecret(JSON.stringify(creds), session.mnemonic),
  };
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(record, null, 2), { mode: 0o600 });
  try {
    chmodSync(CREDENTIALS_FILE, 0o600);
  } catch {
    /* best-effort */
  }
}

export function loadBuilderCredentials(session: WalletSession): BuilderCredentials | null {
  if (!hasBuilderCredentials()) return null;
  try {
    const record = JSON.parse(readFileSync(CREDENTIALS_FILE, 'utf8')) as StoredCredentials;
    // Decryption fails if the file belongs to a different (e.g. since-restored)
    // seed phrase; treat that like "not set" so trading falls back to the env.
    const parsed = JSON.parse(decryptSecret(record.crypto, session.mnemonic)) as BuilderCredentials;
    if (!parsed.key || !parsed.secret || !parsed.passphrase) return null;
    return { key: parsed.key, secret: parsed.secret, passphrase: parsed.passphrase };
  } catch {
    return null;
  }
}

export function clearBuilderCredentials(): void {
  rmSync(CREDENTIALS_FILE, { force: true });
}
