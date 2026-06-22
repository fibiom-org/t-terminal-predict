import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Chart } from '@/components/Chart.js';
import { Loading } from '@/components/Loading.js';
import { Screen } from '@/components/Screen.js';
import { useTerminalSize } from '@/components/useTerminalSize.js';
import { getPriceHistory } from '@/market/priceFeed.js';
import { getPoolInfo, type PoolInfo } from '@/uniswap/poolService.js';
import { shortAddress } from '@/utils/format.js';
import type { PriceHistory, TradingPair } from '@/types/index.js';

interface Props {
  pair: TradingPair;
  onBack: () => void;
}

const RANGES: Record<string, number> = { '1': 1, '7': 7, '3': 30 };
const REFRESH_MS = 30_000;

export function PoolDetailScreen({ pair, onBack }: Props): React.ReactElement {
  const [days, setDays] = useState(7);
  const [history, setHistory] = useState<PriceHistory | null>(null);
  const [pool, setPool] = useState<PoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>('');

  const load = useCallback(
    async (range: number): Promise<void> => {
      setLoading(true);
      setError(null);
      const [h, p] = await Promise.allSettled([getPriceHistory(pair.chartCoinId, range), getPoolInfo(pair)]);
      if (h.status === 'fulfilled') setHistory(h.value);
      if (p.status === 'fulfilled') setPool(p.value);
      else setPool(null);
      const errs = [h, p].filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
      setError(errs.length ? errs.map((e) => String(e.reason).split('\n')[0]).join(' · ') : null);
      setUpdatedAt(new Date().toLocaleTimeString());
      setLoading(false);
    },
    [pair],
  );

  useEffect(() => {
    void load(days);
    const t = setInterval(() => void load(days), REFRESH_MS);
    return () => clearInterval(t);
  }, [load, days]);

  useInput((input, key) => {
    if (key.escape) return onBack();
    if (input === 'r') void load(days);
    if (RANGES[input] !== undefined) setDays(RANGES[input]!);
  });

  const { columns } = useTerminalSize();
  const chartWidth = Math.max(40, Math.min(columns - 12, 120));
  const up = history ? history.changePct >= 0 : true;
  const changeColor = up ? 'green' : 'red';

  return (
    <Screen
      hints={[
        { keys: '1/7/3', label: '1d·7d·30d' },
        { keys: 'r', label: 'refresh' },
        { keys: 'esc', label: 'back' },
      ]}
    >
      <Box flexDirection="column">
        <Box justifyContent="space-between">
          <Text bold>
            Pool · <Text color="cyan">{pair.label}</Text>
          </Text>
          <Text dimColor>{updatedAt ? `updated ${updatedAt}` : ''}</Text>
        </Box>

        <Box marginTop={1} flexDirection="column">
          {history ? (
            <>
              <Text>
                {pair.quote.symbol}{' '}
                <Text bold>${history.last.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                {'  '}
                <Text color={changeColor}>
                  {up ? '▲' : '▼'} {history.changePct.toFixed(2)}% ({days}d)
                </Text>
              </Text>
              <Box marginTop={1}>
                <Chart series={history.prices} height={9} width={chartWidth} color={changeColor} />
              </Box>
            </>
          ) : loading ? (
            <Loading label="Loading price history…" />
          ) : (
            <Text dimColor>price history unavailable</Text>
          )}
        </Box>

        <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
          <Text bold>Uniswap v3 pool {pool ? <Text dimColor>({pool.feePercent} fee)</Text> : null}</Text>
          {pool ? (
            <>
              <Text>
                Address: <Text color="green">{shortAddress(pool.address)}</Text> <Text dimColor>{pool.address}</Text>
              </Text>
              <Text>
                Price: <Text color="white">{pool.price}</Text>
              </Text>
              <Text>
                Tick: <Text color="white">{pool.tick}</Text>
              </Text>
              <Text>
                Liquidity: <Text color="white">{pool.liquidity}</Text>
              </Text>
              <Text>
                Reserves:{'   '}
                <Text color="yellow">
                  {pool.reserves[0].amount} {pool.reserves[0].token.symbol}
                </Text>
                {'  ·  '}
                <Text color="yellow">
                  {pool.reserves[1].amount} {pool.reserves[1].token.symbol}
                </Text>
              </Text>
            </>
          ) : loading ? (
            <Loading label="Reading pool state…" />
          ) : (
            <Text dimColor>pool data unavailable on this network</Text>
          )}
        </Box>

        {error && (
          <Box marginTop={1}>
            <Text color="red">{error}</Text>
          </Box>
        )}
      </Box>
    </Screen>
  );
}
