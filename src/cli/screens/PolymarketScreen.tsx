import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Menu } from '@/components/Menu.js';
import { PaginatedList } from '@/components/PaginatedList.js';
import { Field } from '@/components/Field.js';
import { Loading } from '@/components/Loading.js';
import { Screen } from '@/components/Screen.js';
import { ErrorBox } from '@/components/ErrorBox.js';
import { fetchSportsEvents } from '@/polymarket/gamma.js';
import { fetchPositions } from '@/polymarket/positions.js';
import { checkGas, getBetExecutor, minBetUsd, validateBet, validateSell } from '@/polymarket/betService.js';
import { getDepositWallet } from '@/polymarket/tradeClient.js';
import { cents, compactUsd, probability, shortDate, signedPercent, signedPoints, usd } from '@/polymarket/format.js';
import { unlockWallet } from '@/wallet/walletService.js';
import type {
  BetResult,
  GasCheck,
  PolyEvent,
  PolyMarket,
  PolyOutcome,
  PolyPosition,
  ValidatedBet,
} from '@/polymarket/types.js';
import type { WalletSession } from '@/types/index.js';

type Step =
  | 'home'
  | 'eventsLoading'
  | 'events'
  | 'markets'
  | 'outcomes'
  | 'amount'
  | 'gas'
  | 'noGas'
  | 'confirm'
  | 'password'
  | 'executing'
  | 'result'
  | 'positionsLoading'
  | 'positions'
  | 'sellAmount';

interface Props {
  session: WalletSession;
  onBack: () => void;
  onOpenBridge: () => void;
}

const executor = getBetExecutor();

function headlinePrice(m: PolyMarket): number {
  return m.outcomes[0]?.price ?? 0;
}

function marketLabel(m: PolyMarket): string {
  return m.groupItemTitle || m.question;
}

function sortedMarkets(e: PolyEvent): PolyMarket[] {
  return [...e.markets].sort((a, b) => headlinePrice(b) - headlinePrice(a));
}

export function PolymarketScreen({ session, onBack, onOpenBridge }: Props): React.ReactElement {
  const [step, setStep] = useState<Step>('home');
  const [events, setEvents] = useState<PolyEvent[]>([]);
  const [event, setEvent] = useState<PolyEvent | null>(null);
  const [market, setMarket] = useState<PolyMarket | null>(null);
  const [outcome, setOutcome] = useState<PolyOutcome | null>(null);
  const [validated, setValidated] = useState<ValidatedBet | null>(null);
  const [gas, setGas] = useState<GasCheck | null>(null);
  const [positions, setPositions] = useState<PolyPosition[]>([]);
  const [sellPosition, setSellPosition] = useState<PolyPosition | null>(null);
  const [result, setResult] = useState<BetResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goBack = (): void => {
    setError(null);
    switch (step) {
      case 'markets':
        setStep('events');
        break;
      case 'outcomes':
        setStep(event && event.markets.length > 1 ? 'markets' : 'events');
        break;
      case 'amount':
        setStep('outcomes');
        break;
      case 'sellAmount':
        setStep('positions');
        break;
      case 'noGas':
      case 'confirm':
        setStep(validated?.side === 'SELL' ? 'sellAmount' : 'amount');
        break;
      case 'password':
        setStep('confirm');
        break;
      case 'events':
      case 'positions':
        setStep('home');
        break;
      default:
        onBack();
        break;
    }
  };

  useInput(
    (_input, key) => {
      if (key.escape) {
        goBack();
      } else if (step === 'result' && key.return) {
        setStep('home');
      }
    },
    { isActive: !['eventsLoading', 'positionsLoading', 'gas', 'executing'].includes(step) },
  );

  const loadEvents = async (): Promise<void> => {
    setStep('eventsLoading');
    setError(null);
    try {
      const data = await fetchSportsEvents(25);
      setEvents(data);
      setStep('events');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('home');
    }
  };

  const loadPositions = async (): Promise<void> => {
    setStep('positionsLoading');
    setError(null);
    try {
      const depositWallet = await getDepositWallet(session);
      const data = await fetchPositions(depositWallet);
      setPositions(data);
      setStep('positions');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('home');
    }
  };

  const pickEvent = (e: PolyEvent): void => {
    setEvent(e);
    setError(null);
    if (e.markets.length === 1) {
      setMarket(e.markets[0] ?? null);
      setStep('outcomes');
    } else {
      setMarket(null);
      setStep('markets');
    }
  };

  const handleAmount = async (value: string): Promise<void> => {
    if (!market || !outcome) return;
    try {
      const v = validateBet({ market, outcome, side: 'BUY', amountHuman: value.trim() });
      setValidated(v);
      setError(null);
      setStep('gas');
      const g = await checkGas(session);
      setGas(g);
      setStep(g.ok ? 'confirm' : 'noGas');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('amount');
    }
  };

  const pickPosition = (p: PolyPosition): void => {
    if (p.size <= 0) return;
    setSellPosition(p);
    setError(null);
    setStep('sellAmount');
  };

  const handleSellAmount = async (value: string): Promise<void> => {
    if (!sellPosition) return;
    try {
      const v = validateSell(sellPosition, value.trim());
      setValidated(v);
      setError(null);
      setStep('gas');
      const g = await checkGas(session);
      setGas(g);
      setStep(g.ok ? 'confirm' : 'noGas');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('sellAmount');
    }
  };

  const handlePassword = async (password: string): Promise<void> => {
    if (!validated) return;
    setStep('executing');
    setError(null);
    try {
      await unlockWallet(password);
      const res = await executor.execute(session, validated);
      setResult(res);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('confirm');
    }
  };

  const totalValue = positions.reduce((s, p) => s + p.value, 0);
  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);

  return (
    <Screen
      hints={[
        { keys: 'enter', label: 'select' },
        { keys: '↑/↓', label: 'move' },
        { keys: 'esc', label: 'back' },
      ]}
    >
      <Box flexDirection="column">
        <Text bold>
          Polymarket <Text dimColor>· sports predictions</Text>
        </Text>

        <Box marginTop={1} flexDirection="column">
          {step === 'home' && (
            <Menu<'events' | 'positions' | 'back'>
              items={[
                { value: 'events', label: 'Browse sports events', hint: 'live odds · bet with USDC.e' },
                { value: 'positions', label: 'My bets', hint: 'open positions & PnL' },
                { value: 'back', label: 'Back' },
              ]}
              onSelect={(v) => {
                if (v === 'events') void loadEvents();
                else if (v === 'positions') void loadPositions();
                else onBack();
              }}
            />
          )}

          {step === 'eventsLoading' && <Loading label="Loading sports events…" />}

          {step === 'events' && (
            <>
              <Text dimColor>
                {events.length} open event{events.length === 1 ? '' : 's'} · sorted by start time
              </Text>
              <Box marginTop={1}>
                {events.length === 0 ? (
                  <Text dimColor>No open sports events right now.</Text>
                ) : (
                  <Menu<string>
                    items={[
                      ...events.map((e, i) => ({
                        value: String(i),
                        label: `${e.title}${e.featured ? ' ★' : ''}`,
                        hint:
                          `${e.markets.length} mkt${e.markets.length === 1 ? '' : 's'} · ` +
                          `vol ${compactUsd(e.volume)} · 24h ${compactUsd(e.volume24hr)} · ` +
                          `ends ${shortDate(e.endDate)}${e.negRisk ? ' · multi' : ''}`,
                      })),
                      { value: 'back', label: 'Back' },
                    ]}
                    onSelect={(v) => {
                      if (v === 'back') return setStep('home');
                      const e = events[Number(v)];
                      if (e) pickEvent(e);
                    }}
                  />
                )}
              </Box>
            </>
          )}

          {step === 'markets' && event && (
            <>
              <Text>
                <Text color="cyan">{event.title}</Text>
                <Text dimColor>
                  {'  '}
                  liq {compactUsd(event.liquidity)} · {event.commentCount} comments
                </Text>
              </Text>
              <Box marginTop={1}>
                <PaginatedList<PolyMarket>
                  title={`Contracts — pick one (${event.markets.length}, sorted by odds)`}
                  items={sortedMarkets(event)}
                  getKey={(m) => m.id}
                  pageSize={8}
                  onSelect={(m) => {
                    setMarket(m);
                    setError(null);
                    setStep('outcomes');
                  }}
                  renderItem={(m, active) => (
                    <Text color={active ? 'cyan' : undefined}>
                      {marketLabel(m).padEnd(24).slice(0, 24)}{' '}
                      <Text color={active ? 'cyan' : 'white'}>{probability(headlinePrice(m)).padStart(4)}</Text>
                      <Text dimColor>
                        {'   '}
                        {signedPoints(m.oneDayPriceChange)}/24h · vol {compactUsd(m.volume)}
                      </Text>
                    </Text>
                  )}
                />
              </Box>
            </>
          )}

          {step === 'outcomes' && market && (
            <>
              <Text>
                <Text color="cyan">{market.question}</Text>
              </Text>
              <Text dimColor>
                24h vol {compactUsd(market.volume24hr)} · spread {cents(market.spread)} · pick an outcome to back
              </Text>
              <Box marginTop={1}>
                <Menu<string>
                  items={[
                    ...market.outcomes.map((o, i) => ({
                      value: String(i),
                      label: `${o.label.padEnd(8).slice(0, 8)} ${cents(o.price)}`,
                      hint: `${probability(o.price)} implied`,
                    })),
                    { value: 'back', label: 'Back' },
                  ]}
                  onSelect={(v) => {
                    if (v === 'back') return setStep(event && event.markets.length > 1 ? 'markets' : 'events');
                    const o = market.outcomes[Number(v)];
                    if (o) {
                      setOutcome(o);
                      setError(null);
                      setStep('amount');
                    }
                  }}
                />
              </Box>
            </>
          )}

          {step === 'amount' && market && outcome && (
            <>
              <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
                <Text>
                  Backing <Text color="green">{outcome.label}</Text> on <Text color="cyan">{market.question}</Text>
                </Text>
                <Text dimColor>
                  Price {cents(outcome.price)} ({probability(outcome.price)} implied) · bid {cents(market.bestBid)} /
                  ask {cents(market.bestAsk)}
                </Text>
                <Text dimColor>
                  24h {compactUsd(market.volume24hr)} · liq {compactUsd(market.liquidity)} · resolves{' '}
                  {shortDate(market.endDate)}
                </Text>
                <Text dimColor>
                  Minimum bet <Text color="white">{usd(minBetUsd(market, outcome))}</Text> · a small taker fee is added
                  on top
                </Text>
              </Box>
              <Box marginTop={1}>
                <Field
                  label={`Amount (pUSD, min ${usd(minBetUsd(market, outcome))}):`}
                  onSubmit={(v) => void handleAmount(v)}
                />
              </Box>
            </>
          )}

          {step === 'gas' && <Loading label="Checking POL gas balance…" />}

          {step === 'noGas' && gas && (
            <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
              <Text color="yellow">Not enough POL for gas.</Text>
              <Text>
                Funding your Polymarket deposit wallet with pUSD needs a little POL for gas. Your POL balance is{' '}
                <Text color="white">{gas.balance}</Text>.
              </Text>
              <Box marginTop={1}>
                <Text color="cyan">Visit the bridge page to fund POL on Polygon, then try again.</Text>
              </Box>
              <Box marginTop={1}>
                <Menu<'bridge' | 'back'>
                  items={[
                    { value: 'bridge', label: 'Go to bridge page' },
                    { value: 'back', label: 'Back' },
                  ]}
                  onSelect={(v) =>
                    v === 'bridge' ? onOpenBridge() : setStep(validated?.side === 'SELL' ? 'sellAmount' : 'amount')
                  }
                />
              </Box>
            </Box>
          )}

          {step === 'sellAmount' && sellPosition && (
            <>
              <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
                <Text>
                  Selling <Text color="green">{sellPosition.outcome}</Text> on{' '}
                  <Text color="cyan">{sellPosition.title}</Text>
                </Text>
                <Text dimColor>
                  Holding {sellPosition.size.toFixed(2)} shares @ {cents(sellPosition.avgPrice)} · now{' '}
                  {cents(sellPosition.curPrice)} · value {usd(sellPosition.value)}
                </Text>
                <Text dimColor>
                  Est. proceeds at current price: {usd(sellPosition.size * sellPosition.curPrice)} for the full position
                </Text>
              </Box>
              <Box marginTop={1}>
                <Field
                  label={`Shares to sell (max ${sellPosition.size.toFixed(2)}):`}
                  onSubmit={(v) => void handleSellAmount(v)}
                />
              </Box>
            </>
          )}

          {(step === 'confirm' || step === 'password' || step === 'executing') && validated && (
            <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
              {validated.side === 'BUY' ? (
                <>
                  <Text>
                    Back <Text color="green">{validated.label}</Text> with{' '}
                    <Text color="yellow">{validated.amountHuman} pUSD</Text> @ {cents(validated.price)}
                  </Text>
                  <Text>
                    Est. <Text color="green">{validated.shares.toFixed(2)} shares</Text> · if it hits:{' '}
                    <Text color="green">{usd(validated.shares)}</Text>{' '}
                    <Text dimColor>
                      (+{usd(validated.shares - Number(validated.amountHuman))} profit · {probability(validated.price)}{' '}
                      chance)
                    </Text>
                  </Text>
                </>
              ) : (
                <>
                  <Text>
                    Sell <Text color="green">{validated.shares.toFixed(2)} shares</Text> of{' '}
                    <Text color="green">{validated.label}</Text> @ {cents(validated.price)}
                  </Text>
                  <Text>
                    Est. proceeds: <Text color="green">{usd(validated.shares * validated.price)}</Text>{' '}
                    <Text dimColor>(market order — fills at best available price)</Text>
                  </Text>
                </>
              )}
              <Text dimColor>{validated.question}</Text>
              {gas?.allowancesReady ? (
                <Text dimColor>Deposit wallet funded — order is gasless.</Text>
              ) : validated.side === 'BUY' ? (
                <Text dimColor>USDC.e will be wrapped to pUSD into your deposit wallet (one-time POL gas).</Text>
              ) : (
                <Text dimColor>Order is relayer-sponsored (gasless).</Text>
              )}
              {executor.simulated ? <Text dimColor>(execution simulated — no funds move)</Text> : null}
            </Box>
          )}

          {step === 'confirm' && validated && (
            <Box marginTop={1}>
              <Menu<'confirm' | 'cancel'>
                items={[
                  { value: 'confirm', label: validated.side === 'SELL' ? 'Confirm sell' : 'Confirm bet' },
                  { value: 'cancel', label: 'Cancel' },
                ]}
                onSelect={(v) =>
                  v === 'confirm' ? setStep('password') : setStep(validated.side === 'SELL' ? 'sellAmount' : 'amount')
                }
              />
            </Box>
          )}

          {step === 'password' && (
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>Confirm with your wallet password to authorise this bet.</Text>
              <Field label="Password:" mask onSubmit={(v) => void handlePassword(v)} />
            </Box>
          )}

          {step === 'executing' && <Loading label="Placing bet…" />}

          {step === 'result' && result && (
            <Box flexDirection="column">
              {result.ok ? (
                <>
                  <Text color="green">✓ Done</Text>
                  <Text>{result.message}</Text>
                </>
              ) : (
                <ErrorBox error={result.message} showRaw marginTop={0} />
              )}
              {result.orderId && <Text dimColor>order: {result.orderId}</Text>}
              <Box marginTop={1}>
                <Text color="cyan">Press Enter to return.</Text>
              </Box>
            </Box>
          )}

          {step === 'positionsLoading' && <Loading label="Loading your bets…" />}

          {step === 'positions' && (
            <>
              <Text>
                <Text dimColor>
                  {positions.length} position{positions.length === 1 ? '' : 's'} ·{' '}
                </Text>
                value <Text color="white">{usd(totalValue)}</Text> · PnL{' '}
                <Text color={totalPnl >= 0 ? 'green' : 'red'}>
                  {totalPnl >= 0 ? '+' : ''}
                  {usd(totalPnl)}
                </Text>
                <Text dimColor> · enter to sell</Text>
              </Text>
              <Box marginTop={1}>
                <PaginatedList<PolyPosition>
                  title="My bets"
                  items={positions}
                  getKey={(p) => p.tokenId}
                  pageSize={5}
                  onSelect={pickPosition}
                  renderItem={(p, active) => (
                    <>
                      <Text color={active ? 'cyan' : undefined}>
                        <Text color={active ? 'cyan' : 'green'}>{p.outcome}</Text>
                        <Text dimColor> · </Text>
                        {p.title.slice(0, 56)}
                      </Text>
                      <Text>
                        <Text dimColor>
                          {p.size.toFixed(0)} sh @ {cents(p.avgPrice)} → {cents(p.curPrice)} ·{' '}
                        </Text>
                        <Text color="white">{usd(p.value)}</Text>{' '}
                        <Text color={p.pnl >= 0 ? 'green' : 'red'}>
                          ({p.pnl >= 0 ? '+' : ''}
                          {usd(p.pnl)} / {signedPercent(p.pnlPercent)})
                        </Text>
                        {p.redeemable ? <Text color="green"> · redeem</Text> : null}
                        {p.mergeable ? <Text color="yellow"> · merge</Text> : null}
                      </Text>
                    </>
                  )}
                />
              </Box>
            </>
          )}

          {error && <ErrorBox error={error} />}
        </Box>
      </Box>
    </Screen>
  );
}
