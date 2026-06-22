import { isAddress, parseUnits } from 'viem';
import { getChain, nativeToken } from '@/config/chains.js';
import type { SendResult, TokenInfo, WalletSession } from '@/types/index.js';

export interface SendRequest {
  readonly chainId: number;
  readonly token: TokenInfo;

  readonly isNative: boolean;
  readonly recipient: string;
  readonly amountHuman: string;
}

export interface ValidatedSend extends SendRequest {
  readonly recipient: `0x${string}`;
  readonly amountRaw: bigint;
}

export function validateSendRequest(req: SendRequest): ValidatedSend {
  const recipient = req.recipient.trim();
  if (!isAddress(recipient)) {
    throw new Error('Enter a valid recipient address (0x…).');
  }
  const amount = req.amountHuman.trim();
  if (!/^\d*\.?\d+$/.test(amount) || Number(amount) <= 0) {
    throw new Error('Enter a positive amount.');
  }
  const amountRaw = parseUnits(amount as `${number}`, req.token.decimals);
  if (amountRaw <= 0n) throw new Error('Amount must be greater than zero.');
  return { ...req, recipient: recipient as `0x${string}`, amountRaw };
}

export interface SendExecutor {
  readonly simulated: boolean;
  execute(session: WalletSession, send: ValidatedSend): Promise<SendResult>;
}

export class MockSendExecutor implements SendExecutor {
  readonly simulated = true;

  async execute(_session: WalletSession, send: ValidatedSend): Promise<SendResult> {
    // Simulate a short confirmation delay.
    await new Promise((resolve) => setTimeout(resolve, 600));
    const chain = getChain(send.chainId);
    const fakeHash = `0x${'0'.repeat(64)}`;
    return {
      ok: true,
      hash: fakeHash,
      simulated: true,
      message:
        `Simulated send of ${send.amountHuman} ${send.token.symbol} on ${chain.name} ` +
        `to ${send.recipient}. No on-chain transaction was sent.`,
    };
  }
}

export class WdkSendExecutor implements SendExecutor {
  readonly simulated = false;

  async execute(_session: WalletSession, _send: ValidatedSend): Promise<SendResult> {
    return {
      ok: false,
      simulated: false,
      message: 'Real on-chain sends are not enabled yet. Wire up the WDK send executor to go live.',
    };
  }
}

export function getSendExecutor(): SendExecutor {
  return new MockSendExecutor();
}

export function buildSendRequest(
  chainId: number,
  token: TokenInfo,
  recipient: string,
  amountHuman: string,
): SendRequest {
  const isNative = token.symbol === nativeToken(getChain(chainId)).symbol;
  return { chainId, token, isNative, recipient, amountHuman };
}
