import 'dotenv/config';
import { z } from 'zod';
import { isSupportedChain } from '@/config/chains.js';

const EnvSchema = z.object({
  RPC_URL: z.string().url().optional(),
  CHAIN_ID: z.coerce.number().int().positive().default(1),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid TTerminal configuration:\n${issues}`);
}

export const env = parsed.data;

export const ENV_RPC_OVERRIDE: { chainId: number; url: string } | null =
  env.RPC_URL && isSupportedChain(env.CHAIN_ID) ? { chainId: env.CHAIN_ID, url: env.RPC_URL } : null;
