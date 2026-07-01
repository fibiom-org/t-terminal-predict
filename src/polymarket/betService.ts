import { formatUnits, parseUnits } from 'viem';
import { OrderSide, OrderType } from '@polymarket/client';
import { getChain, nativeToken } from '@/config/chains.js';
import { trimDecimals } from '@/utils/format.js';
import { isLiveExecution } from '@/storage/settingsStore.js';
import { COLLATERAL, MIN_BET_USD, MIN_GAS_POL, POLYMARKET_CHAIN_ID } from '@/polymarket/config.js';
import { ensureFunding, getTradeContext, readPusdBalance } from '@/polymarket/tradeClient.js';
import type {
  BetExecutor,
  BetRequest,
  BetResult,
  GasCheck,
  PolyMarket,
  PolyOutcome,
  PolyPosition,
  ValidatedBet,
} from '@/polymarket/types.js';
import type { WalletSession } from '@/types/index.js';

export function minBetUsd(market: PolyMarket, outcome: PolyOutcome): number {
  const bySize = (market.orderMinSize || 0) * (outcome.price || 0);
  return Math.ceil(Math.max(MIN_BET_USD, bySize) * 100) / 100;
}

export function validateBet(req: BetRequest): ValidatedBet {
  if (!req.market.acceptingOrders || req.market.closed) {
    throw new Error('This market is not accepting orders right now.');
  }
  const amount = req.amountHuman.trim();
  if (!/^\d*\.?\d+$/.test(amount) || Number(amount) <= 0) {
    throw new Error('Enter a positive pUSD amount.');
  }
  const min = minBetUsd(req.market, req.outcome);
  if (Number(amount) < min) {
    throw new Error(`Minimum bet is ${min.toFixed(2)} pUSD for this market.`);
  }
  const amountRaw = parseUnits(amount as `${number}`, COLLATERAL.decimals);
  if (amountRaw <= 0n) throw new Error('Amount must be greater than zero.');
  const price = req.outcome.price > 0 ? req.outcome.price : 0.5;
  const shares = Number(amount) / price;
  return {
    side: 'BUY',
    tokenId: req.outcome.tokenId,
    label: req.outcome.label,
    question: req.market.question,
    price: req.outcome.price,
    negRisk: req.market.negRisk,
    amountHuman: amount,
    amountRaw,
    shares,
  };
}

export function validateSell(position: PolyPosition, sharesHuman: string): ValidatedBet {
  const shares = sharesHuman.trim();
  if (!/^\d*\.?\d+$/.test(shares) || Number(shares) <= 0) {
    throw new Error('Enter a positive number of shares.');
  }
  const n = Number(shares);
  if (n > position.size + 1e-9) {
    throw new Error(`You only hold ${position.size} shares of this outcome.`);
  }
  return {
    side: 'SELL',
    tokenId: position.tokenId,
    label: position.outcome,
    question: position.title,
    price: position.curPrice,
    negRisk: false,
    amountHuman: shares,
    amountRaw: 0n,
    shares: n,
  };
}

export async function checkGas(session: WalletSession): Promise<GasCheck> {
  const { clients, depositWallet } = await getTradeContext(session);
  const polRaw = await clients.publicClient.getBalance({ address: clients.address });
  const pol = nativeToken(getChain(POLYMARKET_CHAIN_ID));
  const balance = trimDecimals(formatUnits(polRaw, pol.decimals), 4);
  const hasGas = Number(formatUnits(polRaw, pol.decimals)) >= MIN_GAS_POL;

  let funded = false;
  try {
    funded = (await readPusdBalance(clients.publicClient, depositWallet)) > 0n;
  } catch {
    /* best-effort: fall back to the POL check */
  }

  return { ok: hasGas || funded, balance, allowancesReady: funded };
}

export class MockBetExecutor implements BetExecutor {
  readonly simulated = true;

  async execute(_session: WalletSession, bet: ValidatedBet): Promise<BetResult> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const unit = bet.side === 'BUY' ? 'pUSD' : 'shares';
    return {
      ok: true,
      orderId: `sim-${Date.now()}`,
      simulated: true,
      message:
        `Simulated ${bet.side} of ${bet.amountHuman} ${unit} on "${bet.label}" ` +
        `(${bet.question}) — ~${bet.shares.toFixed(2)} shares. No order was placed.`,
    };
  }
}

export class ClobBetExecutor implements BetExecutor {
  readonly simulated = false;

  async execute(session: WalletSession, bet: ValidatedBet): Promise<BetResult> {
    try {
      const { client, clients, depositWallet } = await getTradeContext(session);

      // A BUY must be backed by pUSD in the deposit wallet; wrap USDC.e up-front
      // if it is short. Fund the order amount PLUS a small margin: the taker fee
      // is charged on top of the buy, so funding exactly the amount leaves the
      // order short (and shrinking the buy to fit the fee would drop it below
      // the market minimum). The SDK handles the deposit wallet's gasless
      // approvals. Leftover pUSD stays in the deposit wallet for the next bet.
      if (bet.side === 'BUY') {
        await ensureFunding(clients, depositWallet, bet.amountRaw + bet.amountRaw / 50n);
      }

      const resp =
        bet.side === 'BUY'
          ? await client.placeMarketOrder({
              tokenId: bet.tokenId,
              side: OrderSide.BUY,
              amount: Number(bet.amountHuman),
              orderType: OrderType.FOK,
            })
          : await client.placeMarketOrder({
              tokenId: bet.tokenId,
              side: OrderSide.SELL,
              shares: Number(bet.amountHuman),
              orderType: OrderType.FOK,
            });

      if (!resp.ok) {
        throw new Error(`Order rejected (${resp.code}): ${resp.message}`);
      }

      const verb = bet.side === 'BUY' ? 'Bought' : 'Sold';
      const unit = bet.side === 'BUY' ? 'pUSD' : 'shares';
      return {
        ok: true,
        orderId: resp.orderId,
        hash: resp.transactionsHashes?.[0],
        simulated: false,
        message: `${verb} ${bet.amountHuman} ${unit} on "${bet.label}" (${bet.question}).`,
      };
    } catch (err) {
      return { ok: false, simulated: false, message: err instanceof Error ? err.message : String(err) };
    }
  }
}

export function getBetExecutor(): BetExecutor {
  return isLiveExecution('bets') ? new ClobBetExecutor() : new MockBetExecutor();
}
