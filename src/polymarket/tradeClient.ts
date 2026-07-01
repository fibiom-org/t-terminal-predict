import { createPublicClient, createWalletClient, erc20Abi, http, maxUint256, parseAbi } from 'viem';
import type { Account, PublicClient, WalletClient } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { createSecureClient } from '@polymarket/client';
import { builderApiKey } from '@polymarket/client/node';
import { signerFrom } from '@polymarket/client/viem';
import { getRpcUrl } from '@/storage/settingsStore.js';
import { loadBuilderCredentials } from '@/storage/credentialsStore.js';
import { COLLATERAL, CONTRACTS, POLYMARKET_CHAIN_ID, USDC_E } from '@/polymarket/config.js';
import type { BuilderCredentials, WalletSession } from '@/types/index.js';

export type TradeClient = Awaited<ReturnType<typeof createSecureClient>>;

const ONRAMP_ABI = parseAbi(['function wrap(address _asset, address _to, uint256 _amount)']);

export interface ViemClients {
  readonly account: Account;
  readonly address: `0x${string}`;
  readonly walletClient: WalletClient;
  readonly publicClient: PublicClient;
}

export interface TradeContext {
  readonly clients: ViemClients;
  readonly client: TradeClient;
  readonly depositWallet: `0x${string}`;
}

export function buildViemClients(session: WalletSession): ViemClients {
  const account = mnemonicToAccount(session.mnemonic);
  const address = account.address;
  if (address.toLowerCase() !== session.addresses.evm.toLowerCase()) {
    throw new Error('Derived trading address does not match your wallet — aborting to protect funds.');
  }
  const rpcUrl = getRpcUrl(POLYMARKET_CHAIN_ID);
  const walletClient = createWalletClient({ account, chain: polygon, transport: http(rpcUrl) });
  const publicClient = createPublicClient({ chain: polygon, transport: http(rpcUrl) });
  return { account, address, walletClient, publicClient };
}

function resolveBuilderCredentials(session: WalletSession): BuilderCredentials {
  const stored = loadBuilderCredentials(session);
  if (stored) return stored;

  const key = process.env.BUILDER_API_KEY;
  const secret = process.env.BUILDER_SECRET;
  const passphrase = process.env.BUILDER_PASS_PHRASE;
  if (!key || !secret || !passphrase) {
    throw new Error(
      'Polymarket trading needs Builder API credentials. Add them in /settings → Execution & API, or set ' +
        'BUILDER_API_KEY, BUILDER_SECRET, and BUILDER_PASS_PHRASE in your .env (from the Polymarket Builder program).',
    );
  }
  return { key, secret, passphrase };
}

function builderAuthorization(session: WalletSession): ReturnType<typeof builderApiKey> {
  const { key, secret, passphrase } = resolveBuilderCredentials(session);
  return builderApiKey({ key, secret, passphrase });
}

export function createTradeClient(clients: ViemClients, session: WalletSession): Promise<TradeClient> {
  return createSecureClient({
    signer: signerFrom(clients.walletClient),
    apiKey: builderAuthorization(session),
  });
}

let contextCache: { key: string; ctx: Promise<TradeContext> } | null = null;

export function resetTradeContext(): void {
  contextCache = null;
}

export function getTradeContext(session: WalletSession): Promise<TradeContext> {
  const key = session.addresses.evm.toLowerCase();
  if (!contextCache || contextCache.key !== key) {
    const ctx = buildTradeContext(session);
    ctx.catch(() => {
      if (contextCache?.key === key) contextCache = null;
    });
    contextCache = { key, ctx };
  }
  return contextCache.ctx;
}

async function buildTradeContext(session: WalletSession): Promise<TradeContext> {
  const clients = buildViemClients(session);
  const client = await createTradeClient(clients, session);
  const depositWallet = client.account.wallet as `0x${string}`;
  return { clients, client, depositWallet };
}

export async function getDepositWallet(session: WalletSession): Promise<`0x${string}`> {
  return (await getTradeContext(session)).depositWallet;
}

export function readPusdBalance(publicClient: PublicClient, owner: `0x${string}`): Promise<bigint> {
  return publicClient.readContract({
    address: COLLATERAL.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [owner],
  }) as Promise<bigint>;
}

export async function ensureFunding(
  clients: ViemClients,
  depositWallet: `0x${string}`,
  requiredRaw: bigint,
): Promise<void> {
  const { publicClient, walletClient, address } = clients;
  const usdce = USDC_E.address as `0x${string}`;
  const onramp = CONTRACTS.onramp as `0x${string}`;

  const balance = await readPusdBalance(publicClient, depositWallet);
  if (balance >= requiredRaw) return;

  const shortfall = requiredRaw - balance;

  const usdceBalance = (await publicClient.readContract({
    address: usdce,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  })) as bigint;
  if (usdceBalance < shortfall) {
    throw new Error('Not enough USDC.e to fund this bet. Bridge USDC.e to Polygon and try again.');
  }

  const allowance = (await publicClient.readContract({
    address: usdce,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address, onramp],
  })) as bigint;
  if (allowance < shortfall) {
    const approveHash = await walletClient.writeContract({
      account: walletClient.account!,
      chain: polygon,
      address: usdce,
      abi: erc20Abi,
      functionName: 'approve',
      args: [onramp, maxUint256],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
  }

  const wrapHash = await walletClient.writeContract({
    account: walletClient.account!,
    chain: polygon,
    address: onramp,
    abi: ONRAMP_ABI,
    functionName: 'wrap',
    args: [usdce, depositWallet, shortfall],
  });
  await publicClient.waitForTransactionReceipt({ hash: wrapHash });
}
