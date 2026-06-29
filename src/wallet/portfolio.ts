import { formatUnits } from 'viem';
import { getAllChainBalances } from '@/wallet/balanceService.js';
import { getSolanaManager, getSparkManager } from '@/wallet/managers.js';
import { SOLANA, SOLANA_TOKENS, SPARK } from '@/config/nonEvm.js';
import { trimDecimals } from '@/utils/format.js';
import type { ChainBalances, TokenBalance, TokenInfo, WalletSession } from '@/types/index.js';

const SOLANA_GROUP_ID = 501;
const SPARK_GROUP_ID = 998;

function tokenInfo(symbol: string, name: string, decimals: number): TokenInfo {
  return { symbol, name, address: '0x0000000000000000000000000000000000000000', decimals };
}

function toBalance(token: TokenInfo, raw: bigint): TokenBalance {
  return { token, raw, formatted: trimDecimals(formatUnits(raw, token.decimals), 2) };
}

async function getSolanaBalances(session: WalletSession): Promise<ChainBalances> {
  const base: Omit<ChainBalances, 'native' | 'tokens' | 'error'> = {
    chainId: SOLANA_GROUP_ID,
    chainName: SOLANA.label,
    kind: 'solana',
    address: session.addresses.solana,
  };
  try {
    const account = await getSolanaManager(session.mnemonic).getAccount(0);
    const nativeRaw = await account.getBalance();
    const tokens = await Promise.all(
      SOLANA_TOKENS.map(async (t) => {
        const raw = await account.getTokenBalance(t.mint);
        return toBalance(tokenInfo(t.symbol, t.name, t.decimals), raw);
      }),
    );
    return {
      ...base,
      native: toBalance(tokenInfo(SOLANA.nativeSymbol, SOLANA.nativeSymbol, SOLANA.nativeDecimals), nativeRaw),
      tokens,
      error: null,
    };
  } catch (err) {
    return { ...base, native: null, tokens: [], error: err instanceof Error ? err.message : String(err) };
  }
}

async function getSparkBalances(session: WalletSession): Promise<ChainBalances> {
  const base: Omit<ChainBalances, 'native' | 'tokens' | 'error'> = {
    chainId: SPARK_GROUP_ID,
    chainName: SPARK.label,
    kind: 'spark',
    address: session.addresses.spark,
  };
  try {
    const account = await getSparkManager(session.mnemonic).getAccount(0);
    const nativeRaw = await account.getBalance();
    return {
      ...base,
      native: toBalance(tokenInfo(SPARK.nativeSymbol, SPARK.nativeSymbol, SPARK.nativeDecimals), nativeRaw),
      tokens: [],
      error: null,
    };
  } catch (err) {
    return { ...base, native: null, tokens: [], error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getPortfolio(session: WalletSession): Promise<ChainBalances[]> {
  const [evm, solana, spark] = await Promise.all([
    getAllChainBalances(session.addresses.evm),
    getSolanaBalances(session),
    getSparkBalances(session),
  ]);
  return [...evm, solana, spark];
}
