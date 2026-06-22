import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Menu } from '@/components/Menu.js';
import { Screen } from '@/components/Screen.js';
import { PAIRS } from '@/config/index.js';
import { CHAINS, getChain } from '@/config/chains.js';
import type { TradingPair } from '@/types/index.js';

interface Props {
  selectedId: string;
  onSelect: (pair: TradingPair) => void;
  onBack: () => void;
}

export function PairsScreen({ selectedId, onSelect, onBack }: Props): React.ReactElement {
  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  const items = PAIRS.map((p) => ({
    value: p.id,
    label: `${getChain(p.chainId).name.padEnd(10)} ${p.label}`,
    hint: p.id === selectedId ? '(selected)' : undefined,
  }));

  return (
    <Screen
      hints={[
        { keys: '↑/↓', label: 'move' },
        { keys: 'enter', label: 'select' },
        { keys: 'esc', label: 'back' },
      ]}
    >
      <Box flexDirection="column">
        <Text bold>Trading pairs</Text>
        <Text dimColor>{CHAINS.length} networks · pick a pair to set its network active for trading.</Text>
        <Box marginTop={1}>
          <Menu
            items={items}
            onSelect={(id) => {
              const pair = PAIRS.find((p) => p.id === id);
              if (pair) onSelect(pair);
            }}
          />
        </Box>
      </Box>
    </Screen>
  );
}
