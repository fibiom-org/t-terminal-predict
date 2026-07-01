export interface FriendlyError {
  readonly title: string;
  readonly detail: string;
  readonly hint?: string;
  readonly raw?: string;
}

function extractReason(message: string): { reason: string; code?: string; rpc?: string } {
  const code = /\bcode=([A-Z0-9_]+)/.exec(message)?.[1];

  const lead = message.split(' (')[0]?.trim() ?? message.trim();

  const rpc = /"message"\s*:\s*"([^"]+)"/.exec(message)?.[1];

  return { reason: lead, code, rpc };
}

interface Rule {
  readonly match: RegExp;
  readonly title: string;
  readonly detail: string;
  readonly hint?: string;
}

const RULES: readonly Rule[] = [
  {
    match: /replacement.*underpriced|replacement (transaction|fee)|replacement_underpriced/,
    title: 'Transaction already pending',
    detail: 'A transaction with the same nonce is already waiting in the mempool.',
    hint: 'Wait for it to confirm, or resend with a higher gas fee to replace it.',
  },
  {
    match: /insufficient funds|insufficient_funds/,
    title: 'Insufficient funds for gas',
    detail: 'Your wallet does not have enough native balance to cover the gas fee.',
    hint: 'Top up the native token on this network and try again.',
  },
  {
    match: /nonce too low|nonce_expired|nonce has already been used/,
    title: 'Nonce already used',
    detail: 'This nonce was already spent by an earlier transaction.',
    hint: 'Refresh and retry — the next nonce will be picked automatically.',
  },
  {
    match: /user rejected|action_rejected|user denied|rejected the request/,
    title: 'Request rejected',
    detail: 'The signing request was rejected.',
  },
  {
    match: /intrinsic gas too low|gas required exceeds|out of gas|gas limit/,
    title: 'Gas estimation failed',
    detail: 'The transaction needs more gas than was provided.',
    hint: 'Raise the gas limit, or check that the call parameters are valid.',
  },
  {
    match: /transfer amount exceeds balance|exceeds balance|exceeds allowance/,
    title: 'Balance or allowance too low',
    detail: 'The token balance or approved allowance is not enough for this transfer.',
    hint: 'Check your token balance and any required approval, then retry.',
  },
  {
    match: /execution reverted|call_exception|reverted/,
    title: 'Transaction reverted',
    detail: 'The contract rejected the transaction on-chain.',
    hint: 'The market or parameters may have changed — refresh and try again.',
  },
  {
    match: /timeout|timed out|etimedout|network error|econnreset|fetch failed|enotfound/,
    title: 'Network error',
    detail: 'Could not reach the RPC node or API.',
    hint: 'Check your connection and try again in a moment.',
  },
  {
    match: /could not coalesce|server_error|bad_data|-32603/,
    title: 'RPC node error',
    detail: 'The RPC node returned an unexpected error.',
    hint: 'Try again shortly, or switch to another RPC endpoint.',
  },
];

export function toFriendlyError(err: unknown): FriendlyError {
  const message = err instanceof Error ? err.message : String(err);
  const { reason, code, rpc } = extractReason(message);
  const haystack = `${reason} ${code ?? ''} ${rpc ?? ''}`.toLowerCase();

  const raw = rpc && rpc !== reason ? rpc : reason;

  for (const rule of RULES) {
    if (rule.match.test(haystack)) {
      return { title: rule.title, detail: rule.detail, hint: rule.hint, raw };
    }
  }

  return {
    title: 'Something went wrong',
    detail: raw.length > 160 ? `${raw.slice(0, 157)}…` : raw,
  };
}

export function friendlyErrorLine(err: unknown): string {
  const f = toFriendlyError(err);
  return `${f.title} — ${f.detail}`;
}
