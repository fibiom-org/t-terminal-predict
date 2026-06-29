import type { ChainKind } from '@/types/index.js';

export interface SplToken {
  readonly symbol: string;
  readonly name: string;
  readonly mint: string;
  readonly decimals: number;
}

export interface NonEvmChainInfo {
  readonly kind: ChainKind;
  readonly label: string;
  readonly nativeSymbol: string;
  readonly nativeDecimals: number;
}

export const SOLANA: NonEvmChainInfo = {
  kind: 'solana',
  label: 'Solana',
  nativeSymbol: 'SOL',
  nativeDecimals: 9,
};

export const SPARK: NonEvmChainInfo = {
  kind: 'spark',
  label: 'Spark (BTC)',
  nativeSymbol: 'BTC',
  nativeDecimals: 8,
};

export const DEFAULT_SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

export type SparkNetwork = 'MAINNET' | 'TESTNET' | 'SIGNET' | 'REGTEST' | 'LOCAL';
export const SPARK_NETWORKS: readonly SparkNetwork[] = ['MAINNET', 'TESTNET', 'SIGNET', 'REGTEST', 'LOCAL'];
export const DEFAULT_SPARK_NETWORK: SparkNetwork = 'MAINNET';

export const SOLANA_TOKENS: readonly SplToken[] = [
  { symbol: 'USDT', name: 'Tether USD', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
  { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
];
