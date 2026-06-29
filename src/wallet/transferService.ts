import { isAddress, parseUnits } from 'viem';
import { getChain, nativeToken } from '@/config/chains.js';
import { SOLANA, SOLANA_TOKENS, SPARK } from '@/config/nonEvm.js';
import { getEvmManager, getSolanaManager, getSparkManager } from '@/wallet/managers.js';
import type { ChainKind, SendResult, TokenInfo, WalletSession } from '@/types/index.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface SendAsset {
  readonly token: TokenInfo;
  readonly tokenId: string | null;
}

function asTokenInfo(symbol: string, name: string, decimals: number): TokenInfo {
  return { symbol, name, address: ZERO_ADDRESS, decimals };
}

export function assetsForKind(kind: ChainKind, chainId: number): SendAsset[] {
  if (kind === 'evm') {
    const chain = getChain(chainId);
    return [
      { token: nativeToken(chain), tokenId: null },
      ...chain.tokens.map((t) => ({ token: t, tokenId: t.address })),
    ];
  }
  if (kind === 'solana') {
    return [
      { token: asTokenInfo(SOLANA.nativeSymbol, SOLANA.nativeSymbol, SOLANA.nativeDecimals), tokenId: null },
      ...SOLANA_TOKENS.map((t) => ({ token: asTokenInfo(t.symbol, t.name, t.decimals), tokenId: t.mint })),
    ];
  }
  return [{ token: asTokenInfo(SPARK.nativeSymbol, SPARK.nativeSymbol, SPARK.nativeDecimals), tokenId: null }];
}

export interface SendRequest {
  readonly kind: ChainKind;
  readonly chainId: number;
  readonly asset: SendAsset;
  readonly recipient: string;
  readonly amountHuman: string;
}

export interface ValidatedSend extends SendRequest {
  readonly amountRaw: bigint;
}

function validateRecipient(kind: ChainKind, recipient: string): void {
  if (kind === 'evm') {
    if (!isAddress(recipient)) throw new Error('Enter a valid EVM recipient address (0x…).');
    return;
  }
  if (kind === 'solana') {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(recipient)) {
      throw new Error('Enter a valid Solana address (base58).');
    }
    return;
  }
  if (!/^(sp|spark|ln)/i.test(recipient)) {
    throw new Error('Enter a Spark address or a Lightning (ln…) invoice.');
  }
}

export function validateSendRequest(req: SendRequest): ValidatedSend {
  const recipient = req.recipient.trim();
  if (!recipient) throw new Error('Enter a recipient.');
  validateRecipient(req.kind, recipient);

  const amount = req.amountHuman.trim();
  if (!/^\d*\.?\d+$/.test(amount) || Number(amount) <= 0) {
    throw new Error('Enter a positive amount.');
  }
  const amountRaw = parseUnits(amount as `${number}`, req.asset.token.decimals);
  if (amountRaw <= 0n) throw new Error('Amount must be greater than zero.');
  return { ...req, recipient, amountRaw };
}

export function buildSendRequest(
  kind: ChainKind,
  chainId: number,
  asset: SendAsset,
  recipient: string,
  amountHuman: string,
): SendRequest {
  return { kind, chainId, asset, recipient, amountHuman };
}

export interface SendExecutor {
  readonly simulated: boolean;
  execute(session: WalletSession, send: ValidatedSend): Promise<SendResult>;
}

function networkLabel(send: ValidatedSend): string {
  if (send.kind === 'evm') return getChain(send.chainId).name;
  return send.kind === 'solana' ? SOLANA.label : SPARK.label;
}

export class MockSendExecutor implements SendExecutor {
  readonly simulated = true;

  async execute(_session: WalletSession, send: ValidatedSend): Promise<SendResult> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const fakeHash = `0x${'0'.repeat(64)}`;
    return {
      ok: true,
      hash: fakeHash,
      simulated: true,
      message:
        `Simulated send of ${send.amountHuman} ${send.asset.token.symbol} on ${networkLabel(send)} ` +
        `to ${send.recipient}. No on-chain transaction was sent.`,
    };
  }
}


export class WdkSendExecutor implements SendExecutor {
  readonly simulated = false;

  async execute(session: WalletSession, send: ValidatedSend): Promise<SendResult> {
    try {
      const manager =
        send.kind === 'evm'
          ? getEvmManager(session.mnemonic, send.chainId)
          : send.kind === 'solana'
            ? getSolanaManager(session.mnemonic)
            : getSparkManager(session.mnemonic);
      const account = await manager.getAccount(0);
      // For native sends EVM expects the zero address; non-EVM accept an empty token.
      const token = send.asset.tokenId ?? (send.kind === 'evm' ? ZERO_ADDRESS : '');
      const result = await account.transfer({ token, recipient: send.recipient, amount: send.amountRaw });
      return {
        ok: true,
        hash: result.hash,
        simulated: false,
        message: `Sent ${send.amountHuman} ${send.asset.token.symbol} on ${networkLabel(send)}.`,
      };
    } catch (err) {
      return {
        ok: false,
        simulated: false,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export function getSendExecutor(): SendExecutor {
  return process.env.TT_LIVE_SENDS === '1' ? new WdkSendExecutor() : new MockSendExecutor();
}
