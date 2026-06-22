import { randomBytes, scryptSync, createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';
import type { StoredWallet } from '@/types/index.js';

const KEY_LEN = 32; // AES-256
const SALT_LEN = 16;
const IV_LEN = 12;
const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password.normalize('NFKC'), salt, KEY_LEN, SCRYPT_PARAMS);
}

export function encryptSecret(plaintext: string, password: string): StoredWallet['crypto'] {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(password, salt);

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    cipher: 'aes-256-gcm',
    kdf: 'scrypt',
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
  };
}

export function decryptSecret(crypto: StoredWallet['crypto'], password: string): string {
  const salt = Buffer.from(crypto.salt, 'hex');
  const iv = Buffer.from(crypto.iv, 'hex');
  const key = deriveKey(password, salt);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(crypto.authTag, 'hex'));

  try {
    const plaintext = Buffer.concat([decipher.update(Buffer.from(crypto.ciphertext, 'hex')), decipher.final()]);
    return plaintext.toString('utf8');
  } catch {
    throw new Error('Incorrect password or corrupted wallet file.');
  }
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
