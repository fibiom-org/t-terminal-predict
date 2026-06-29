export type ChainKind = 'evm' | 'solana' | 'spark';

export interface TokenInfo {
  readonly symbol: string;
  readonly name: string;
  readonly address: `0x${string}`;
  readonly decimals: number;
}

export interface UniswapAddresses {
  readonly quoterV2: `0x${string}`;

  readonly swapRouter02: `0x${string}`;

  readonly factory: `0x${string}`;
}

export interface ChainConfig {
  readonly id: number;
  readonly name: string;

  readonly nativeSymbol: string;

  readonly nativeDecimals: number;

  readonly defaultRpcUrl: string;

  readonly tokens: readonly TokenInfo[];

  readonly uniswap: UniswapAddresses;
}

export interface TradingPair {
  readonly id: string;

  readonly chainId: number;

  readonly label: string;
  readonly base: TokenInfo;
  readonly quote: TokenInfo;

  readonly feeTier: number;

  readonly chartCoinId: string;
}

export interface PriceHistory {
  readonly prices: readonly number[];
  readonly last: number;
  readonly changePct: number;
  readonly days: number;
}

export interface TokenBalance {
  readonly token: TokenInfo;
  readonly raw: bigint;
  readonly formatted: string;
}

export interface ChainBalances {
  readonly chainId: number;
  readonly chainName: string;

  readonly kind?: ChainKind;
  readonly address?: string;

  readonly native: TokenBalance | null;

  readonly tokens: readonly TokenBalance[];

  readonly error: string | null;
}

export interface WalletAddresses {
  readonly evm: `0x${string}`;
  readonly solana: string;
  readonly spark: string;
}

interface EncryptedSecret {
  readonly cipher: 'aes-256-gcm';
  readonly kdf: 'scrypt';
  readonly salt: string;
  readonly iv: string;
  readonly authTag: string;
  readonly ciphertext: string;
}

export interface StoredWalletV1 {
  readonly version: 1;
  readonly address: `0x${string}`;
  readonly createdAt: string;
  readonly crypto: EncryptedSecret;
}

export interface StoredWalletV2 {
  readonly version: 2;
  readonly addresses: WalletAddresses;
  readonly createdAt: string;
  readonly crypto: EncryptedSecret;
}

export type StoredWallet = StoredWalletV1 | StoredWalletV2;

export interface WalletSession {
  readonly mnemonic: string;
  readonly addresses: WalletAddresses;
}

export type SwapSide = 'buy' | 'sell';

export interface SwapQuote {
  readonly side: SwapSide;
  readonly pair: TradingPair;
  readonly amountIn: TokenInfo;
  readonly amountOut: TokenInfo;
  readonly amountInHuman: string;
  readonly amountOutHuman: string;

  readonly price: string;
}

export interface SwapResult {
  readonly ok: boolean;
  readonly hash?: string;
  readonly message: string;
  readonly simulated: boolean;
}

export interface SendResult {
  readonly ok: boolean;
  readonly hash?: string;
  readonly message: string;
  readonly simulated: boolean;
}
