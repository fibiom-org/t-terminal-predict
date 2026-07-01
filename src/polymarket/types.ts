import type { WalletSession } from '@/types/index.js';

export interface PolyOutcome {
  readonly label: string;
  readonly tokenId: string;
  readonly price: number;
}

export interface PolyMarket {
  readonly id: string;
  readonly conditionId: string;
  readonly question: string;
  readonly groupItemTitle: string;
  readonly slug: string;
  readonly active: boolean;
  readonly closed: boolean;
  readonly acceptingOrders: boolean;
  readonly negRisk: boolean;
  readonly outcomes: readonly PolyOutcome[];
  readonly bestBid: number;
  readonly bestAsk: number;
  readonly spread: number;
  readonly lastTradePrice: number;
  readonly oneDayPriceChange: number;
  readonly volume24hr: number;
  readonly volume: number;
  readonly liquidity: number;
  readonly orderMinSize: number;
  readonly orderPriceMinTickSize: number;
  readonly endDate: string | null;
}

export interface PolyEvent {
  readonly id: string;
  readonly title: string;
  readonly slug: string;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly negRisk: boolean;
  readonly featured: boolean;
  readonly volume: number;
  readonly volume24hr: number;
  readonly liquidity: number;
  readonly commentCount: number;
  readonly markets: readonly PolyMarket[];
}

export interface PolyPosition {
  readonly title: string;
  readonly outcome: string;
  readonly tokenId: string;
  readonly size: number;
  readonly avgPrice: number;
  readonly curPrice: number;
  readonly initialValue: number;
  readonly value: number;
  readonly pnl: number;
  readonly pnlPercent: number;
  readonly realizedPnl: number;
  readonly endDate: string | null;
  readonly redeemable: boolean;
  readonly mergeable: boolean;
}

export type BetSide = 'BUY' | 'SELL';

export interface BetRequest {
  readonly market: PolyMarket;
  readonly outcome: PolyOutcome;
  readonly side: BetSide;
  readonly amountHuman: string;
}

export interface ValidatedBet {
  readonly side: BetSide;
  readonly tokenId: string;
  readonly label: string;
  readonly question: string;
  readonly price: number;
  readonly negRisk: boolean;
  readonly amountHuman: string;
  readonly amountRaw: bigint;
  readonly shares: number;
}

export interface BetResult {
  readonly ok: boolean;
  readonly orderId?: string;
  readonly hash?: string;
  readonly message: string;
  readonly simulated: boolean;
}

export interface GasCheck {
  readonly ok: boolean;
  readonly balance: string;
  readonly allowancesReady: boolean;
}

export interface BetExecutor {
  readonly simulated: boolean;
  execute(session: WalletSession, bet: ValidatedBet): Promise<BetResult>;
}
