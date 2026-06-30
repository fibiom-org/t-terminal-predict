import { formatUnits, parseUnits } from 'viem';
import { address } from '@solana/addresses';
import { AccountRole, type Instruction } from '@solana/instructions';
import { appendTransactionMessageInstructions, createTransactionMessage } from '@solana/transaction-messages';
import { pipe } from '@solana/functional';
import { CHAINS, getChain, nativeToken, POLYGON_CHAIN_ID, POLYGON_USDC_E } from '@/config/chains.js';
import { SOLANA, SOLANA_TOKENS } from '@/config/nonEvm.js';
import { getPublicClient } from '@/wallet/client.js';
import { getEvmManager, getSolanaManager } from '@/wallet/managers.js';
import { trimDecimals } from '@/utils/format.js';
import type { ChainKind, WalletSession } from '@/types/index.js';

const ZERO_EVM = '0x0000000000000000000000000000000000000000';

const RELAY_SOLANA_CHAIN_ID = 792703809;
const SOLANA_GROUP_ID = 501;
const SOLANA_NATIVE_CURRENCY = '11111111111111111111111111111111';

const RELAY_API_BASE = 'https://api.relay.link';
const STATUS_TIMEOUT_MS = 90_000;
const STATUS_POLL_MS = 2_000;


const BRIDGEABLE_EVM_SYMBOLS = ['USDC', 'USDT'] as const;

export interface BridgeToken {
  readonly symbol: string;
  readonly name: string;
  readonly decimals: number;
  readonly relayCurrency: string;
  readonly native: boolean;
}

export interface BridgeChain {
  readonly kind: ChainKind;
  readonly id: number;
  readonly relayChainId: number;
  readonly label: string;
  readonly tokens: readonly BridgeToken[];
}

function evmBridgeChain(chainId: number): BridgeChain {
  const chain = getChain(chainId);
  const native = nativeToken(chain);
  const tokens: BridgeToken[] = [];

  if (chainId === POLYGON_CHAIN_ID) {
    tokens.push({
      symbol: POLYGON_USDC_E.symbol,
      name: POLYGON_USDC_E.name,
      decimals: POLYGON_USDC_E.decimals,
      relayCurrency: POLYGON_USDC_E.address,
      native: false,
    });
  } else {
    tokens.push({
      symbol: native.symbol,
      name: native.name,
      decimals: native.decimals,
      relayCurrency: ZERO_EVM,
      native: true,
    });
    for (const symbol of BRIDGEABLE_EVM_SYMBOLS) {
      const token = chain.tokens.find((t) => t.symbol === symbol);
      if (token) {
        tokens.push({
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          relayCurrency: token.address,
          native: false,
        });
      }
    }
  }

  return { kind: 'evm', id: chainId, relayChainId: chainId, label: chain.name, tokens };
}

function solanaBridgeChain(): BridgeChain {
  const tokens: BridgeToken[] = [
    {
      symbol: SOLANA.nativeSymbol,
      name: SOLANA.nativeSymbol,
      decimals: SOLANA.nativeDecimals,
      relayCurrency: SOLANA_NATIVE_CURRENCY,
      native: true,
    },
    ...SOLANA_TOKENS.map((t) => ({
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      relayCurrency: t.mint,
      native: false,
    })),
  ];
  return { kind: 'solana', id: SOLANA_GROUP_ID, relayChainId: RELAY_SOLANA_CHAIN_ID, label: SOLANA.label, tokens };
}

export const BRIDGE_CHAINS: readonly BridgeChain[] = [...CHAINS.map((c) => evmBridgeChain(c.id)), solanaBridgeChain()];

export function bridgeChainsExcept(id: number): readonly BridgeChain[] {
  return BRIDGE_CHAINS.filter((c) => c.id !== id);
}

export interface BridgeRequest {
  readonly source: BridgeChain;
  readonly sourceToken: BridgeToken;
  readonly dest: BridgeChain;
  readonly destToken: BridgeToken;
  readonly amountHuman: string;
}

export interface ValidatedBridge extends BridgeRequest {
  readonly amountRaw: bigint;
}

export function validateBridgeRequest(req: BridgeRequest): ValidatedBridge {
  if (req.source.id === req.dest.id) {
    throw new Error('Source and destination must be different chains.');
  }
  const amount = req.amountHuman.trim();
  if (!/^\d*\.?\d+$/.test(amount) || Number(amount) <= 0) {
    throw new Error('Enter a positive amount.');
  }
  const amountRaw = parseUnits(amount as `${number}`, req.sourceToken.decimals);
  if (amountRaw <= 0n) throw new Error('Amount must be greater than zero.');
  return { ...req, amountRaw };
}

export interface BridgeQuote {
  readonly requestId: string | null;
  readonly amountOutRaw: bigint;
  readonly amountOutFormatted: string;
  readonly etaSeconds: number | null;
  readonly raw: RelayQuote | null;
  readonly simulated: boolean;
}

export interface BridgeResult {
  readonly ok: boolean;
  readonly hash?: string;
  readonly message: string;
  readonly simulated: boolean;
  readonly amountOutFormatted?: string;
}

function senderAddress(session: WalletSession, chain: BridgeChain): string {
  return chain.kind === 'evm' ? session.addresses.evm : session.addresses.solana;
}

function recipientAddress(session: WalletSession, chain: BridgeChain): string {
  return chain.kind === 'evm' ? session.addresses.evm : session.addresses.solana;
}

interface RelayRawInstruction {
  readonly programId: string;
  readonly keys: ReadonlyArray<{ pubkey: string; isSigner: boolean; isWritable: boolean }>;
  readonly data: string;
}

interface RelayStepItem {
  readonly data?: {
    readonly to?: string;
    readonly value?: string | number;
    readonly data?: string;
    readonly instructions?: readonly RelayRawInstruction[];
  };
}

interface RelayStep {
  readonly kind?: string;
  readonly requestId?: string;
  readonly items?: readonly RelayStepItem[];
}

interface RelayQuote {
  readonly steps?: readonly RelayStep[];
  readonly details?: {
    readonly currencyOut?: { readonly amount?: string; readonly amountFormatted?: string };
    readonly timeEstimate?: number;
  };
}

async function postRelayQuote(body: Record<string, unknown>): Promise<RelayQuote> {
  const res = await fetch(`${RELAY_API_BASE}/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Relay quote failed (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as RelayQuote;
}

function buildQuoteBody(session: WalletSession, req: ValidatedBridge): Record<string, unknown> {
  const sender = senderAddress(session, req.source);
  return {
    user: sender,
    originChainId: req.source.relayChainId,
    originCurrency: req.sourceToken.relayCurrency,
    destinationChainId: req.dest.relayChainId,
    destinationCurrency: req.destToken.relayCurrency,
    tradeType: 'EXACT_INPUT',
    recipient: recipientAddress(session, req.dest),
    amount: req.amountRaw.toString(),
    useExternalLiquidity: false,
    referrer: 'relay.link/bridge',
    refundTo: sender,
  };
}

function parseQuote(quote: RelayQuote, req: ValidatedBridge, simulated: boolean): BridgeQuote {
  const outAmount = quote.details?.currencyOut?.amount;
  const amountOutRaw = outAmount ? BigInt(outAmount) : req.amountRaw;
  const requestId = quote.steps?.find((s) => s.requestId)?.requestId ?? null;
  return {
    requestId,
    amountOutRaw,
    amountOutFormatted: trimDecimals(formatUnits(amountOutRaw, req.destToken.decimals), 2),
    etaSeconds: quote.details?.timeEstimate ?? null,
    raw: quote,
    simulated,
  };
}


function accountRole(isSigner: boolean, isWritable: boolean): AccountRole {
  if (isSigner && isWritable) return AccountRole.WRITABLE_SIGNER;
  if (isSigner) return AccountRole.READONLY_SIGNER;
  if (isWritable) return AccountRole.WRITABLE;
  return AccountRole.READONLY;
}

function toInstruction(raw: RelayRawInstruction): Instruction {
  return {
    programAddress: address(raw.programId),
    accounts: raw.keys.map((k) => ({ address: address(k.pubkey), role: accountRole(k.isSigner, k.isWritable) })),
    data: Uint8Array.from(Buffer.from(raw.data, 'hex')),
  };
}

function buildSolanaMessage(instructions: readonly RelayRawInstruction[]) {
  const ixs = instructions.map(toInstruction);
  return pipe(createTransactionMessage({ version: 0 }), (m) => appendTransactionMessageInstructions(ixs, m));
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFill(requestId: string): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < STATUS_TIMEOUT_MS) {
    const res = await fetch(`${RELAY_API_BASE}/intents/status/v3?requestId=${requestId}`);
    const data = (await res.json()) as { status?: string; error?: string };
    if (data.status === 'success') return true;
    if (data.status === 'failure' || data.status === 'refunded') {
      throw new Error(`Relay bridge ${data.status}: ${data.error ?? 'unknown error'}`);
    }
    await sleep(STATUS_POLL_MS);
  }
  return false;
}

export interface BridgeExecutor {
  readonly simulated: boolean;
  quote(session: WalletSession, req: ValidatedBridge): Promise<BridgeQuote>;
  execute(session: WalletSession, req: ValidatedBridge, quote: BridgeQuote): Promise<BridgeResult>;
}

export class MockBridgeExecutor implements BridgeExecutor {
  readonly simulated = true;

  async quote(_session: WalletSession, req: ValidatedBridge): Promise<BridgeQuote> {
    await sleep(300);
    // Assume a ~0.1% bridge cost for the simulated estimate.
    const out = (req.amountRaw * 999n) / 1000n;
    return {
      requestId: null,
      amountOutRaw: out,
      amountOutFormatted: trimDecimals(formatUnits(out, req.destToken.decimals), 2),
      etaSeconds: 30,
      raw: null,
      simulated: true,
    };
  }

  async execute(_session: WalletSession, req: ValidatedBridge, quote: BridgeQuote): Promise<BridgeResult> {
    await sleep(700);
    return {
      ok: true,
      hash: `0x${'0'.repeat(64)}`,
      simulated: true,
      amountOutFormatted: quote.amountOutFormatted,
      message:
        `Simulated bridge of ${req.amountHuman} ${req.sourceToken.symbol} (${req.source.label}) → ` +
        `${quote.amountOutFormatted} ${req.destToken.symbol} (${req.dest.label}). No funds moved.`,
    };
  }
}

export class RelayBridgeExecutor implements BridgeExecutor {
  readonly simulated = false;

  async quote(session: WalletSession, req: ValidatedBridge): Promise<BridgeQuote> {
    const quote = await postRelayQuote(buildQuoteBody(session, req));
    return parseQuote(quote, req, false);
  }

  async execute(session: WalletSession, req: ValidatedBridge, _quote: BridgeQuote): Promise<BridgeResult> {
    try {
      const fresh = await postRelayQuote(buildQuoteBody(session, req));
      const parsed = parseQuote(fresh, req, false);
      const hash =
        req.source.kind === 'solana'
          ? await this.executeSolana(session, fresh)
          : await this.executeEvm(session, req, fresh);

      let message =
        `Bridged ${req.amountHuman} ${req.sourceToken.symbol} from ${req.source.label} to ` +
        `${parsed.amountOutFormatted} ${req.destToken.symbol} on ${req.dest.label}.`;

      if (parsed.requestId) {
        const filled = await waitForFill(parsed.requestId);
        if (!filled) {
          message =
            `Submitted bridge of ${req.amountHuman} ${req.sourceToken.symbol} from ${req.source.label}. ` +
            `Funds on ${req.dest.label} may take a little longer to arrive.`;
        }
      }

      return { ok: true, hash, simulated: false, amountOutFormatted: parsed.amountOutFormatted, message };
    } catch (err) {
      return { ok: false, simulated: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  private async executeSolana(session: WalletSession, quote: RelayQuote): Promise<string> {
    const instructions = quote.steps?.[0]?.items?.[0]?.data?.instructions;
    if (!instructions?.length) throw new Error('Relay quote missing Solana instructions.');
    const message = buildSolanaMessage(instructions);
    const account = await getSolanaManager(session.mnemonic).getAccount(0);
    const result = await account.sendTransaction(message);
    return result.hash;
  }

  private async executeEvm(session: WalletSession, req: ValidatedBridge, quote: RelayQuote): Promise<string> {
    const manager = getEvmManager(session.mnemonic, req.source.id);
    const account = await manager.getAccount(0);
    const client = getPublicClient(req.source.id);

    let lastHash = '';
    for (const step of quote.steps ?? []) {
      if (step.kind && step.kind !== 'transaction') continue;
      for (const item of step.items ?? []) {
        const tx = item.data;
        if (!tx?.to) continue;
        const result = await account.sendTransaction({
          to: tx.to,
          value: tx.value ? BigInt(tx.value) : 0n,
          data: tx.data,
        });
        lastHash = result.hash;
        await client.waitForTransactionReceipt({ hash: result.hash as `0x${string}` });
      }
    }
    if (!lastHash) throw new Error('Relay quote contained no EVM transactions to send.');
    return lastHash;
  }
}

export function getBridgeExecutor(): BridgeExecutor {
  // Real execution by default; set TT_LIVE_BRIDGES=0 to fall back to simulation.
  return process.env.TT_LIVE_BRIDGES === '0' ? new MockBridgeExecutor() : new RelayBridgeExecutor();
}
