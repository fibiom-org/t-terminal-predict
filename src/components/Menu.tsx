import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface MenuItem<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly hint?: string;
}

interface MenuProps<T extends string> {
  readonly items: readonly MenuItem<T>[];
  readonly onSelect: (value: T) => void;
}

export function Menu<T extends string>({ items, onSelect }: MenuProps<T>): React.ReactElement {
  const [index, setIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setIndex((i) => (i - 1 + items.length) % items.length);
    } else if (key.downArrow || input === 'j') {
      setIndex((i) => (i + 1) % items.length);
    } else if (key.return) {
      const item = items[index];
      if (item) onSelect(item.value);
    } else if (/^[1-9]$/.test(input)) {
      const n = Number(input) - 1;
      if (n < items.length) {
        setIndex(n);
        const item = items[n];
        if (item) onSelect(item.value);
      }
    }
  });

  return (
    <Box flexDirection="column">
      {items.map((item, i) => {
        const active = i === index;
        return (
          <Text key={item.value} color={active ? 'cyan' : undefined}>
            {active ? '❯ ' : '  '}
            {i + 1}. {item.label}
            {item.hint ? <Text dimColor>{`  ${item.hint}`}</Text> : null}
          </Text>
        );
      })}
    </Box>
  );
}
