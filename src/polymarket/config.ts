import { POLYGON_CHAIN_ID, POLYGON_USDC_E } from '@/config/chains.js';
import type { TokenInfo } from '@/types/index.js';

export const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';
export const DATA_API_BASE = 'https://data-api.polymarket.com';
export const CLOB_API_BASE = 'https://clob.polymarket.com';
export const RELAYER_API_BASE = 'https://relayer-v2.polymarket.com';

export const POLYMARKET_CHAIN_ID = POLYGON_CHAIN_ID;

export const COLLATERAL: TokenInfo = {
  symbol: 'pUSD',
  name: 'Polymarket USD',
  address: '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB',
  decimals: 6,
};

/** USDC.e is wrapped into pUSD through the CollateralOnramp. */
export const USDC_E: TokenInfo = POLYGON_USDC_E;

export const CONTRACTS = {
  ctf: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
  exchange: '0xE111180000d2663C0091e4f400237545B87B996B',
  negRiskExchange: '0xe2222d279d744050d28e00520010520000310F59',
  negRiskAdapter: '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
  onramp: '0x93070a847efEf7F70739046A929D47a521F5B8ee',
  depositWalletFactory: '0x00000000000Fb5C9ADea0298D729A0CB3823Cc07',
} as const;

export const MIN_GAS_POL = 0.05;

export const MIN_BET_USD = 1;
