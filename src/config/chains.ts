import type { ChainConfig, TokenInfo, UniswapAddresses } from '@/types/index.js';

const UNISWAP_CANONICAL: UniswapAddresses = {
  quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
  swapRouter02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  factory: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
};

const UNISWAP_BASE: UniswapAddresses = {
  quoterV2: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  swapRouter02: '0x2626664c2603336E57B271c5C0b26F421741e481',
  factory: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
};

const ETH_TOKENS: readonly TokenInfo[] = [
  { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
];

const ARB_TOKENS: readonly TokenInfo[] = [
  { symbol: 'USDT', name: 'Tether USD', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
  { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', decimals: 8 },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
  { symbol: 'ARB', name: 'Arbitrum', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18 },
];

const OP_TOKENS: readonly TokenInfo[] = [
  { symbol: 'USDT', name: 'Tether USD', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6 },
  { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', decimals: 8 },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  { symbol: 'OP', name: 'Optimism', address: '0x4200000000000000000000000000000000000042', decimals: 18 },
];

const BASE_TOKENS: readonly TokenInfo[] = [
  { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
  { symbol: 'WETH', name: 'Wrapped Ether', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  { symbol: 'cbBTC', name: 'Coinbase Wrapped BTC', address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf', decimals: 8 },
];

export const DEFAULT_CHAIN_ID = 1;

export const CHAINS: readonly ChainConfig[] = [
  {
    id: 1,
    name: 'Ethereum',
    nativeSymbol: 'ETH',
    nativeDecimals: 18,
    defaultRpcUrl: 'https://ethereum-rpc.publicnode.com',
    tokens: ETH_TOKENS,
    uniswap: UNISWAP_CANONICAL,
  },
  {
    id: 42161,
    name: 'Arbitrum',
    nativeSymbol: 'ETH',
    nativeDecimals: 18,
    defaultRpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
    tokens: ARB_TOKENS,
    uniswap: UNISWAP_CANONICAL,
  },
  {
    id: 10,
    name: 'Optimism',
    nativeSymbol: 'ETH',
    nativeDecimals: 18,
    defaultRpcUrl: 'https://optimism-rpc.publicnode.com',
    tokens: OP_TOKENS,
    uniswap: UNISWAP_CANONICAL,
  },
  {
    id: 8453,
    name: 'Base',
    nativeSymbol: 'ETH',
    nativeDecimals: 18,
    defaultRpcUrl: 'https://base-rpc.publicnode.com',
    tokens: BASE_TOKENS,
    uniswap: UNISWAP_BASE,
  },
];

export function getChain(chainId: number): ChainConfig {
  const chain = CHAINS.find((c) => c.id === chainId);
  if (!chain) throw new Error(`Unsupported chain id: ${chainId}`);
  return chain;
}

export function isSupportedChain(chainId: number): boolean {
  return CHAINS.some((c) => c.id === chainId);
}

export function nativeToken(chain: ChainConfig): TokenInfo {
  return {
    symbol: chain.nativeSymbol,
    name: chain.nativeSymbol,
    address: '0x0000000000000000000000000000000000000000',
    decimals: chain.nativeDecimals,
  };
}

export function findToken(chainId: number, symbol: string): TokenInfo | undefined {
  return getChain(chainId).tokens.find((t) => t.symbol === symbol);
}
