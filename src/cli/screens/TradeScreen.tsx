import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Menu } from '@/components/Menu.js';
import { Field } from '@/components/Field.js';
import { Loading } from '@/components/Loading.js';
import { Screen } from '@/components/Screen.js';
import { getPairPrice, getSwapQuote } from '@/uniswap/quoteService.js';
import { getSwapExecutor } from '@/uniswap/router.js';
import { unlockWallet } from '@/wallet/walletService.js';
import type { SwapQuote, SwapResult, SwapSide, TradingPair, WalletSession } from '@/types/index.js';

type Step = 'loading' | 'menu' | 'amount' | 'quoting' | 'confirm' | 'password' | 'executing' | 'result';

interface Props {
  pair: TradingPair;
  session: WalletSession;
  onBack: () => void;
  onTraded: () => void;
}

const executor = getSwapExecutor();

export function TradeScreen({ pair, session, onBack, onTraded }: Props): React.ReactElement {
  const [step, setStep] = useState<Step>('loading');
  const [price, setPrice] = useState<string>('…');
  const [side, setSide] = useState<SwapSide>('buy');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [result, setResult] = useState<SwapResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const p = await getPairPrice(pair);
        if (live) {
          setPrice(p);
          setStep('menu');
        }
      } catch (err) {
        if (live) {
          setPrice('unavailable');
          setError(err instanceof Error ? err.message : String(err));
          setStep('menu');
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [pair]);

  useInput(
    (_input, key) => {
      if (key.escape && (step === 'menu' || step === 'result')) onBack();
      if (step === 'result' && key.return) {
        onTraded();
        onBack();
      }
    },
    { isActive: step === 'menu' || step === 'result' },
  );

  const handleAmount = async (value: string): Promise<void> => {
    const amount = value.trim();
    if (!/^\d*\.?\d+$/.test(amount) || Number(amount) <= 0) {
      setError('Enter a positive number.');
      return;
    }
    setError(null);
    setStep('quoting');
    try {
      const q = await getSwapQuote(pair, side, amount);
      setQuote(q);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('amount');
    }
  };

  const handlePassword = async (password: string): Promise<void> => {
    if (!quote) return;
    setStep('executing');
    setError(null);
    try {
      // Sensitive action: re-verify the password before executing.
      await unlockWallet(password);
      const res = await executor.execute(session, quote);
      setResult(res);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('confirm');
    }
  };

  const inSymbol = side === 'buy' ? pair.base.symbol : pair.quote.symbol;

  return (
    <Screen
      hints={[
        { keys: 'enter', label: 'select' },
        { keys: 'esc', label: 'back' },
      ]}
    >
      <Box flexDirection="column">
        <Text bold>Trade</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>
            Selected pair: <Text color="cyan">{pair.label}</Text>
          </Text>
          <Text>
            Current price: <Text color="green">{price}</Text>
            {executor.simulated ? <Text dimColor> (execution simulated)</Text> : null}
          </Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          {step === 'loading' && <Loading label="Fetching price…" />}

          {step === 'menu' && (
            <Menu<'buy' | 'sell' | 'back'>
              items={[
                { value: 'buy', label: `Buy ${pair.quote.symbol}` },
                { value: 'sell', label: `Sell ${pair.quote.symbol}` },
                { value: 'back', label: 'Back' },
              ]}
              onSelect={(v) => {
                if (v === 'back') return onBack();
                setSide(v);
                setStep('amount');
              }}
            />
          )}

          {step === 'amount' && (
            <>
              <Text dimColor>
                {side === 'buy'
                  ? `How much ${pair.base.symbol} do you want to spend?`
                  : `How much ${pair.quote.symbol} do you want to sell?`}
              </Text>
              <Box marginTop={1}>
                <Field label={`Amount (${inSymbol}):`} onSubmit={(v) => void handleAmount(v)} />
              </Box>
            </>
          )}

          {step === 'quoting' && <Loading label="Fetching quote from Uniswap…" />}

          {(step === 'confirm' || step === 'password' || step === 'executing') && quote && (
            <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
              <Text>
                {quote.side === 'buy' ? 'Buy' : 'Sell'} {pair.quote.symbol}
              </Text>
              <Text>
                Pay:{' '}
                <Text color="yellow">
                  {quote.amountInHuman} {quote.amountIn.symbol}
                </Text>
              </Text>
              <Text>
                Receive ≈{' '}
                <Text color="green">
                  {quote.amountOutHuman} {quote.amountOut.symbol}
                </Text>
              </Text>
              <Text dimColor>Price: {quote.price}</Text>
            </Box>
          )}

          {step === 'confirm' && (
            <Box marginTop={1}>
              <Menu<'confirm' | 'cancel'>
                items={[
                  { value: 'confirm', label: 'Confirm trade' },
                  { value: 'cancel', label: 'Cancel' },
                ]}
                onSelect={(v) => (v === 'confirm' ? setStep('password') : setStep('menu'))}
              />
            </Box>
          )}

          {step === 'password' && (
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>Confirm with your wallet password to authorise this trade.</Text>
              <Field label="Password:" mask onSubmit={(v) => void handlePassword(v)} />
            </Box>
          )}

          {step === 'executing' && <Loading label="Executing…" />}

          {step === 'result' && result && (
            <Box flexDirection="column">
              <Text color={result.ok ? 'green' : 'red'}>{result.ok ? '✓ Done' : '✗ Failed'}</Text>
              <Text>{result.message}</Text>
              {result.hash && <Text dimColor>tx: {result.hash}</Text>}
              <Box marginTop={1}>
                <Text color="cyan">Press Enter to return.</Text>
              </Box>
            </Box>
          )}

          {error && (
            <Box marginTop={1}>
              <Text color="red">{error}</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Screen>
  );
}
