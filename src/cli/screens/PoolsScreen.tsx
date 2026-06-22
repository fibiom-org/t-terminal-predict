import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Loading } from '@/components/Loading.js';
import { Screen } from '@/components/Screen.js';
import { getAllPools, type PairPool } from '@/uniswap/poolService.js';
import { shortAddress } from '@/utils/format.js';
import type { TradingPair } from '@/types/index.js';

interface Props {
  onSelect: (pair: TradingPair) => void;
  onBack: () => void;
}

const REFRESH_MS = 30_000;

export function PoolsScreen({ onSelect, onBack }: Props): React.ReactElement {
  const [pools, setPools] = useState<PairPool[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [selected, setSelected] = useState(0);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    const result = await getAllPools();
    setPools(result);
    setUpdatedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const count = pools?.length ?? 0;

  useInput((input, key) => {
    if (key.escape) return onBack();
    if (input === 'r') return void load();
    if (!count) return;
    if (key.upArrow || input === 'k') setSelected((s) => (s - 1 + count) % count);
    if (key.downArrow || input === 'j') setSelected((s) => (s + 1) % count);
    if (key.return) {
      const picked = pools?.[selected];
      if (picked) onSelect(picked.pair);
    }
  });

  return (
    <Screen
      hints={[
        { keys: '↑/↓', label: 'move' },
        { keys: 'enter', label: 'open' },
        { keys: 'r', label: 'refresh' },
        { keys: 'esc', label: 'back' },
      ]}
    >
      <Box flexDirection="column">
        <Box justifyContent="space-between">
          <Text bold>
            Uniswap v3 pools <Text dimColor>(Ethereum)</Text>
          </Text>
          <Text dimColor>{updatedAt ? `updated ${updatedAt}` : ''}</Text>
        </Box>

        {!pools && loading ? (
          <Box marginTop={1}>
            <Loading label="Reading pools…" />
          </Box>
        ) : (
          <Box marginTop={1} flexDirection="column">
            {pools?.map(({ pair, info, error }, i) => {
              const active = i === selected;
              return (
                <Box
                  key={pair.id}
                  flexDirection="column"
                  borderStyle="round"
                  borderColor={active ? 'cyan' : 'gray'}
                  paddingX={1}
                  marginBottom={1}
                >
                  <Text bold>
                    <Text color={active ? 'cyan' : undefined}>{active ? '❯ ' : '  '}</Text>
                    <Text color="cyan">{pair.label}</Text> {info ? <Text dimColor>({info.feePercent} fee)</Text> : null}
                  </Text>
                  {info ? (
                    <>
                      <Text>
                        Pool: <Text color="green">{shortAddress(info.address)}</Text>{' '}
                        <Text dimColor>{info.address}</Text>
                      </Text>
                      <Text>
                        Price: <Text color="white">{info.price}</Text>
                      </Text>
                      <Text>
                        Reserves:{' '}
                        <Text color="yellow">
                          {info.reserves[0].amount} {info.reserves[0].token.symbol}
                        </Text>
                        {'  ·  '}
                        <Text color="yellow">
                          {info.reserves[1].amount} {info.reserves[1].token.symbol}
                        </Text>
                      </Text>
                    </>
                  ) : (
                    <Text color="red" dimColor>
                      {error ? error.split('\n')[0] : 'pool unavailable'}
                    </Text>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Screen>
  );
}
